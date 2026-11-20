'use server'

// Ejecución de las tareas de movimiento de plantas del vivero (formulario manual o contador de plantas).

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { exigirAccesoATarea } from "@/lib/auth"
import { aplicarMovimiento, ErrorInventario, type LineaMovimiento } from "@/lib/inventarioVivero"
import { pngDesdeDataUrl, subirArchivo } from "@/lib/archivos"
import { parseFechaCalendario } from "@/lib/utils"
import { describirRenglon, infoMovimiento, variedadDe } from "@/lib/vivero"

export interface ConteoEnviado {
    materialId: string
    cantidad: number
    /** Hora en que se terminó el conteo (ms) */
    cerradoEn: number
    nota?: string
}

export interface DatosMovimientoVivero {
    fecha: string
    /** Formulario manual: cantidad por renglón */
    lineas?: { materialId: string; cantidad: number; precioUnitario?: number | null }[]
    /** Contador de plantas: las cantidades salen de sumar los conteos por renglón */
    conteos?: ConteoEnviado[]
    /** Contador: precio por planta de cada variedad (ventas) */
    precios?: Record<string, number>
    destino?: string
    clienteNombre?: string
    clienteCedula?: string
    clienteCelular?: string
    placas?: string
    representante?: string
    observaciones?: string
    /** Firmas dibujadas en el contador (PNG en data URL) */
    firmaCliente?: string | null
    firmaRepresentante?: string | null
}

/** Registra el movimiento de la tarea, actualiza el inventario y deja la tarea ejecutada. */
export async function registrarMovimientoDeTarea(tareaId: string, datos: DatosMovimientoVivero): Promise<{ success?: boolean; codigo?: string; movimientoId?: string; error?: string }> {
    const sesion = await exigirAccesoATarea(tareaId)
    const tarea = await db.tarea.findUnique({ where: { id: tareaId }, include: { movimientoVivero: { select: { codigo: true } } } })
    if (!tarea?.movimientoViveroTipo || !tarea.loteId) return { error: "Esta tarea no es un movimiento de plantas del vivero." }
    if (tarea.movimientoVivero) return { error: `Esta tarea ya registró el movimiento ${tarea.movimientoVivero.codigo}.` }

    const tipo = tarea.movimientoViveroTipo
    const info = infoMovimiento(tipo)
    const fecha = parseFechaCalendario(datos.fecha)
    if (!fecha) return { error: "Indique la fecha del movimiento." }
    if (info.pideCliente && !datos.clienteNombre?.trim()) return { error: "Escriba el nombre del cliente." }

    // Con el contador, las cantidades por renglón son la suma de sus conteos
    const conteos = (datos.conteos ?? []).filter(c => Number.isInteger(c.cantidad) && c.cantidad > 0)
    let lineas: LineaMovimiento[]
    const materiales = await db.loteViveroMaterial.findMany({ where: { loteId: tarea.loteId } })
    if (conteos.length) {
        const suma = new Map<string, number>()
        for (const c of conteos) suma.set(c.materialId, (suma.get(c.materialId) ?? 0) + c.cantidad)
        lineas = [...suma.entries()].map(([materialId, cantidad]) => {
            const m = materiales.find(x => x.id === materialId)
            return { materialId, cantidad, precioUnitario: m ? datos.precios?.[variedadDe(m)] ?? null : null }
        })
    } else {
        lineas = (datos.lineas ?? []).filter(l => Number.isInteger(l.cantidad) && l.cantidad > 0)
    }
    if (lineas.length === 0) return { error: "Indique cuántas plantas de al menos un material." }
    if (tipo === "VENTA" && lineas.some(l => l.precioUnitario == null || !Number.isFinite(l.precioUnitario) || l.precioUnitario < 0)) {
        return { error: "Indique el precio por planta de cada variedad vendida." }
    }

    try {
        // Las firmas se suben antes de la transacción (Vercel Blob no participa en ella)
        const [firmaClienteUrl, firmaRepresentanteUrl] = await Promise.all([datos.firmaCliente, datos.firmaRepresentante].map(f => {
            const png = pngDesdeDataUrl(f)
            return png ? subirArchivo(`vivero/firmas/${tareaId}.png`, png, "image/png") : Promise.resolve(null)
        }))

        const mov = await db.$transaction(async tx => {
            const m = await aplicarMovimiento(tx, {
                loteId: tarea.loteId!, tipo, fecha, tareaId,
                destino: datos.destino, clienteNombre: datos.clienteNombre, clienteCedula: datos.clienteCedula,
                clienteCelular: datos.clienteCelular, placas: datos.placas, representante: datos.representante,
                observaciones: datos.observaciones, registradoPorId: sesion.uid, registradoPor: sesion.nombre,
            }, lineas)
            if (conteos.length) {
                await tx.conteoVivero.createMany({
                    data: conteos.map((c, i) => {
                        const mat = materiales.find(x => x.id === c.materialId)
                        return {
                            movimientoId: m.id, numero: i + 1, materialId: c.materialId,
                            descripcion: mat ? describirRenglon(mat) : "Material", cantidad: c.cantidad,
                            cerradoEn: new Date(c.cerradoEn), nota: c.nota?.trim() || null,
                        }
                    }),
                })
            }
            if (firmaClienteUrl || firmaRepresentanteUrl) {
                await tx.movimientoVivero.update({ where: { id: m.id }, data: { firmaClienteUrl, firmaRepresentanteUrl } })
            }
            await tx.tarea.update({ where: { id: tareaId }, data: { estado: "EJECUTADA", fechaEjecucion: fecha } })
            return m
        }, { timeout: 30_000 })

        revalidatePath(`/lotes/${tarea.loteId}`)
        revalidatePath(`/fincas/${tarea.fincaId}`)
        revalidatePath('/tareas')
        revalidatePath('/mis-tareas')
        return { success: true, codigo: mov.codigo, movimientoId: mov.id }
    } catch (e) {
        if (e instanceof ErrorInventario) return { error: e.message }
        console.error("Error registrando movimiento de vivero:", e)
        return { error: "No se pudo registrar el movimiento. Intente de nuevo." }
    }
}

/** Guarda la constancia de entrega (PDF generado en el celular) del movimiento. */
export async function guardarConstancia(movimientoId: string, formData: FormData): Promise<{ url?: string; error?: string }> {
    const mov = await db.movimientoVivero.findUnique({ where: { id: movimientoId }, select: { codigo: true, tareaId: true, loteId: true } })
    if (!mov?.tareaId) return { error: "Movimiento no encontrado." }
    await exigirAccesoATarea(mov.tareaId)

    const pdf = formData.get("pdf")
    if (!(pdf instanceof Blob) || pdf.size === 0 || pdf.size > 3_500_000) return { error: "El PDF no es válido." }
    const url = await subirArchivo(`vivero/constancias/${mov.codigo}.pdf`, pdf, "application/pdf")
    if (!url) return { error: "No hay almacenamiento de archivos configurado; el PDF quedó solo en este teléfono." }

    await db.movimientoVivero.update({ where: { id: movimientoId }, data: { pdfUrl: url } })
    revalidatePath(`/lotes/${mov.loteId}`)
    return { url }
}
