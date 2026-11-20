'use server'

import { exigirAccesoATarea, exigirGestor } from "@/lib/auth"
import { esGestor } from "@/lib/sesion"
import { TIPOS_MOVIMIENTO, type TipoMovimientoVivero } from "@/lib/vivero"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { rutaSegura } from "@/lib/navegacion"
import { parseFechaCalendario } from "@/lib/utils"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function getTareas(filters?: { fincaId?: string, loteId?: string, nivel?: "FINCA" | "LOTE", estado?: string[], delayed?: boolean, sort?: 'asc' | 'desc' }) {
    await exigirGestor()
    try {
        const where: any = {}
        if (filters?.fincaId) where.fincaId = filters.fincaId
        if (filters?.loteId) where.loteId = filters.loteId
        if (filters?.nivel) where.nivel = filters.nivel

        if (filters?.estado && filters.estado.length > 0) {
            where.estado = { in: filters.estado }
        }

        if (filters?.delayed) {
            where.estado = 'PROGRAMADA'
            where.fechaProgramada = {
                lt: new Date()
            }
        }

        const tareas = await db.tarea.findMany({
            where,
            include: {
                finca: true,
                lote: true
            },
            orderBy: { fechaProgramada: filters?.sort || 'desc' }
        })
        return { data: tareas }
    } catch (error) {
        console.error("Failed to fetch tareas:", error)
        return { error: "Error al cargar las tareas." }
    }
}

export async function getTareaById(id: string) {
    await exigirAccesoATarea(id)
    try {
        const tarea = await db.tarea.findUnique({
            where: { id },
            include: {
                finca: true,
                lote: true,
                consumos: {
                    include: {
                        producto: true
                    }
                },
                usosMaquinaria: {
                    include: {
                        maquina: {
                            include: {
                                tipo: true,
                                marca: true
                            }
                        } as any
                    }
                },
                trazabilidad: {
                    orderBy: {
                        timestamp: 'asc'
                    }
                }
            }
        })
        return { data: tarea }
    } catch (error) {
        console.error("Failed to fetch tarea:", error)
        return { error: "Error al cargar la tarea." }
    }
}

/** Id del responsable asignado: el que envía el formulario o, si falta, el que tenga ese nombre. */
async function resolverResponsableId(id: string | null | undefined, nombre: string): Promise<string | null> {
    if (id) {
        const r = await db.responsable.findUnique({ where: { id }, select: { id: true } })
        if (r) return r.id
    }
    return (await db.responsable.findFirst({ where: { nombre }, select: { id: true } }))?.id ?? null
}

/** Código que tomará la próxima tarea (TAR-###). */
export async function siguienteCodigoTarea(): Promise<string> {
    await exigirGestor()
    const ultima = await db.tarea.findFirst({ orderBy: { codigo: 'desc' } })
    const seq = ultima ? parseInt(ultima.codigo.split('-')[1] ?? '', 10) : 0
    return `TAR-${((Number.isFinite(seq) ? seq : 0) + 1).toString().padStart(3, '0')}`
}

export async function createTarea(formData: FormData) {
    await exigirGestor()
    // const codigo = formData.get("codigo") as string // Removed manual code
    const fincaId = formData.get("fincaId") as string

    // Handle loteId: treat empty string as null
    const rawLoteId = formData.get("loteId") as string | null
    const loteId = rawLoteId && rawLoteId.trim() !== "" ? rawLoteId : null

    // El formulario envía el nivel elegido explícitamente; si falta se deduce del lote
    const nivelForm = formData.get("nivel") as string | null
    const nivel: "FINCA" | "LOTE" = nivelForm === "LOTE" || nivelForm === "FINCA" ? nivelForm : loteId ? "LOTE" : "FINCA"

    const fechaProgramada = formData.get("fechaProgramada") as string
    const tipo = formData.get("tipo") as string
    const responsable = formData.get("responsable") as string
    const prioridad = formData.get("prioridad") as "BAJA" | "MEDIA" | "ALTA"
    const estado = formData.get("estado") as "PROGRAMADA" | "EN_PROCESO" | "EJECUTADA" | "CANCELADA"
    const descripcion = formData.get("descripcion") as string
    const observaciones = formData.get("observaciones") as string
    const requiereTrazabilidad = formData.get("requiereTrazabilidad") === "on"

    // Validations
    if (!fincaId || !fechaProgramada || !tipo || !responsable) {
        return { error: "Campos obligatorios faltantes." }
    }

    if (nivel === 'LOTE' && !loteId) {
        return { error: "Debe seleccionar un lote para tareas de nivel Lote." }
    }
    if (nivel === 'FINCA' && loteId) {
        return { error: "Una tarea de nivel Finca no puede tener lote." }
    }

    // Movimiento de plantas: solo en un lote vivero
    const movimientoRaw = (formData.get("movimientoViveroTipo") as string) || ""
    const movimientoViveroTipo = TIPOS_MOVIMIENTO.some(t => t.valor === movimientoRaw) ? movimientoRaw as TipoMovimientoVivero : null
    if (movimientoViveroTipo) {
        const lote = loteId ? await db.lote.findUnique({ where: { id: loteId }, select: { finalidad: true } }) : null
        if (lote?.finalidad !== "VIVERO") return { error: "Los movimientos de plantas solo se registran en un lote vivero." }
    }

    let codigo: string
    try {
        // Un doble clic o un reintento envía la misma tarea dos veces: si llega una idéntica
        // en el último minuto, no se crea otra.
        const repetida = await db.tarea.findFirst({
            where: {
                fincaId, loteId: nivel === 'LOTE' ? loteId : null, nivel, tipo, responsable,
                fechaProgramada: parseFechaCalendario(fechaProgramada) ?? undefined,
                observaciones: observaciones ?? null,
                createdAt: { gte: new Date(Date.now() - 60_000) },
            },
        })
        if (repetida) return { success: true, codigo: repetida.codigo, repetida: true }

        codigo = await siguienteCodigoTarea()

        await db.tarea.create({
            data: {
                codigo,
                fincaId,
                nivel,
                loteId: nivel === 'LOTE' ? loteId : null,
                fechaProgramada: parseFechaCalendario(fechaProgramada) ?? new Date(),
                tipo,
                responsable,
                responsableId: await resolverResponsableId(formData.get("responsableId") as string | null, responsable),
                prioridad: prioridad || 'MEDIA',
                estado: estado || 'PROGRAMADA',
                descripcion,
                observaciones,
                requiereTrazabilidad,
                movimientoViveroTipo,
            }
        })
    } catch (error: any) {
        console.error("Failed to create tarea:", error)
        return { error: `Error al crear la tarea: ${error.message}` }
    }

    // El formulario decide a dónde volver (memoria de navegación)
    revalidatePath('/tareas')
    revalidatePath(`/fincas/${fincaId}`)
    if (loteId) revalidatePath(`/lotes/${loteId}`)
    return { success: true, codigo }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREACION MASIVA DE TAREAS (Plan de trabajo recurrente)
// ─────────────────────────────────────────────────────────────────────────────
export async function createTareasMasivas(payload: {
    fincaId: string
    loteId: string | null
    tipo: string
    responsable: string
    responsableId?: string
    prioridad: string
    fechaInicio: string        // ISO YYYY-MM-DD
    periodicidadDias: number   // cada cuántos días
    modoFin: 'repeticiones' | 'fechaFin'
    repeticiones?: number
    fechaFin?: string          // ISO YYYY-MM-DD
    observacionesBase: string  // texto libre + detalle técnico concatenado
    requiereTrazabilidad: boolean
    nivel?: 'FINCA' | 'LOTE'
}) {
    await exigirGestor()
    const {
        fincaId, loteId, tipo, responsable, prioridad,
        fechaInicio, periodicidadDias, modoFin, repeticiones, fechaFin,
        observacionesBase, requiereTrazabilidad
    } = payload

    if (!fincaId || !tipo || !responsable || !fechaInicio || periodicidadDias < 1) {
        return { error: 'Datos incompletos para la programación masiva.' }
    }

    const nivel: 'FINCA' | 'LOTE' = payload.nivel ?? (loteId ? 'LOTE' : 'FINCA')
    if (nivel === 'LOTE' && !loteId) return { error: 'Seleccione el lote para el plan.' }
    const planId = `PLAN-${Date.now()}`  // ID de grupo único

    // Calcular las fechas del plan
    const fechas: Date[] = []
    const startDate = new Date(fechaInicio + 'T12:00:00')

    if (modoFin === 'repeticiones' && repeticiones && repeticiones > 0) {
        for (let i = 0; i < repeticiones; i++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + i * periodicidadDias)
            fechas.push(d)
        }
    } else if (modoFin === 'fechaFin' && fechaFin) {
        const endDate = new Date(fechaFin + 'T12:00:00')
        let current = new Date(startDate)
        let safety = 0
        while (current <= endDate && safety < 365) {
            fechas.push(new Date(current))
            current.setDate(current.getDate() + periodicidadDias)
            safety++
        }
    } else {
        return { error: 'Defina el número de repeticiones o la fecha de fin.' }
    }

    if (fechas.length === 0) {
        return { error: 'No se generaron fechas con los parámetros indicados.' }
    }
    if (fechas.length > 100) {
        return { error: `Se generarían ${fechas.length} tareas. Reduzca la periodicidad o el rango de fechas (máx 100).` }
    }

    try {
        // Obtener el último código para continuar la secuencia
        const lastTarea = await db.tarea.findFirst({ orderBy: { codigo: 'desc' } })
        let nextId = 1
        if (lastTarea?.codigo) {
            const parts = lastTarea.codigo.split('-')
            if (parts.length === 2) {
                const seq = parseInt(parts[1])
                if (!isNaN(seq)) nextId = seq + 1
            }
        }

        // Crear todas las tareas en una transacción
        const responsableId = await resolverResponsableId(payload.responsableId, responsable)
        await db.$transaction(
            fechas.map((fecha, idx) => {
                const codigo = `TAR-${(nextId + idx).toString().padStart(3, '0')}`
                return db.tarea.create({
                    data: {
                        codigo,
                        fincaId,
                        nivel,
                        loteId: nivel === 'LOTE' ? loteId : null,
                        fechaProgramada: fecha,
                        tipo,
                        responsable,
                        responsableId,
                        prioridad: prioridad as any || 'MEDIA',
                        estado: 'PROGRAMADA',
                        observaciones: observacionesBase || null,
                        requiereTrazabilidad,
                        planId
                    }
                })
            })
        )

        revalidatePath('/tareas')
        revalidatePath(`/fincas/${fincaId}`)
        if (loteId) revalidatePath(`/lotes/${loteId}`)
        return { success: true, count: fechas.length, planId }
    } catch (error: any) {
        console.error('Failed to create massive tareas:', error)
        return { error: `Error al crear el plan: ${error.message}` }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAR PLAN MASIVO (todas las tareas del mismo planId)
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePlanMasivo(planId: string) {
    await exigirGestor()
    if (!planId) return { error: 'planId requerido' }
    try {
        const result = await db.tarea.deleteMany({ where: { planId } })
        revalidatePath('/tareas')
        return { success: true, deleted: result.count }
    } catch (error: any) {
        return { error: `Error al eliminar el plan: ${error.message}` }
    }
}

// EXECUTE TASK ACTION
export async function executeTarea(id: string, formData: FormData) {
    const sesion = await exigirAccesoATarea(id)
    const estado = formData.get("estado") as any
    const observaciones = formData.get("observaciones") as string
    const fechaEjecucion = formData.get("fechaEjecucion") as string
    const consumosStr = formData.get("consumos") as string
    const fincaId = formData.get("fincaId") as string
    // const duracionRealHoras = formData.get("duracionRealHoras")

    const consumos = consumosStr ? JSON.parse(consumosStr) : []

    // Fotos de evidencia: en Vercel el disco no es persistente, así que van a Vercel Blob.
    // Sin token de Blob (desarrollo local) se guardan en public/uploads.
    const files = (formData.getAll("evidencias") as File[]).filter(f => f && f.size > 0)
    const uploadedUrls: string[] = []
    for (const file of files) {
        const fileName = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '-')}`
        try {
            if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blob = await put(`tareas/${id}/${fileName}`, file, { access: 'public' })
                uploadedUrls.push(blob.url)
            } else {
                const uploadDir = path.join(process.cwd(), "public", "uploads", "tareas")
                await mkdir(uploadDir, { recursive: true })
                await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()))
                uploadedUrls.push(`/uploads/tareas/${fileName}`)
            }
        } catch (error) {
            console.error("Error guardando evidencia:", error)
            return { error: `No se pudo guardar la foto ${file.name}. Intente de nuevo.` }
        }
    }

    // Las fotos nuevas se suman a las que ya tenía la tarea
    const previas = (await db.tarea.findUnique({ where: { id }, select: { evidencias: true } }))?.evidencias
    const evidenciasString = [previas, ...uploadedUrls].filter(Boolean).join('\n') || null

    const maquinariaStr = formData.get("maquinaria") as string
    const usosMaquinaria = maquinariaStr ? JSON.parse(maquinariaStr) : []

    try {
        await db.$transaction(async (tx) => {
            // 1. Update Task
            const updatedTarea = await tx.tarea.update({
                where: { id },
                data: {
                    estado,
                    observaciones,
                    evidencias: evidenciasString,
                    fechaEjecucion: fechaEjecucion ? new Date(fechaEjecucion) : new Date(),
                }
            })

            // 2. Process Consumptions
            if (consumos && consumos.length > 0) {
                for (const item of consumos) {
                    // Check stock
                    const producto = await tx.producto.findUnique({ where: { id: item.productoId } })
                    if (!producto) throw new Error(`Producto no encontrado: ${item.productoId}`)

                    if (producto.stockActual < item.cantidad) {
                        throw new Error(`Stock insuficiente para ${producto.nombre}. Stock actual: ${producto.stockActual}`)
                    }

                    // Create Movement
                    await tx.movimientoInventario.create({
                        data: {
                            fincaId: fincaId,
                            productoId: item.productoId,
                            tareaId: id,
                            loteId: updatedTarea.loteId, // Save Lote context
                            tipoMovimiento: 'SALIDA',
                            fecha: new Date(),
                            cantidad: item.cantidad,
                            referencia: 'Consumo en Tarea',
                            observaciones: `Consumo registrado en ejecución de tarea`
                        }
                    })

                    // Deduct Stock
                    await tx.producto.update({
                        where: { id: item.productoId },
                        data: {
                            stockActual: { decrement: item.cantidad }
                        }
                    })
                }
            }

            // 3. Process Machinery Usage
            if (usosMaquinaria && usosMaquinaria.length > 0) {
                for (const item of usosMaquinaria) {
                    // Validate machine exists
                    const machine = await tx.maquinaria.findUnique({ where: { id: item.maquinaId } })
                    if (!machine) throw new Error(`Maquinaria no encontrada: ${item.maquinaId}`)

                    // Create Usage Record
                    await tx.usoMaquinaria.create({
                        data: {
                            fincaId: fincaId,
                            maquinaId: item.maquinaId,
                            tareaId: id,
                            operador: "N/A", // We don't have operator field in form yet, default to N/A or derive
                            fechaInicio: new Date(),
                            fechaFin: new Date(new Date().getTime() + (item.horas * 60 * 60 * 1000)), // Approximate end time
                            horasUso: item.horas,
                            observaciones: `Uso registrado en ejecución de tarea`
                        }
                    })

                    // Optional: Update machine hour meter if we tracked it?
                    // if (machine.horometroActual) ...
                }
            }
        })
    } catch (error: any) {
        console.error("Failed to execute tarea:", error)
        return { error: error.message || "Error al registrar ejecución." }
    }

    revalidatePath('/tareas')
    revalidatePath('/almacen')
    
    revalidatePath('/mis-tareas')
    // El responsable siempre vuelve a su lista; el gestor, a donde venía
    if (!esGestor(sesion.rol)) redirect('/mis-tareas')
    redirect(rutaSegura(formData.get("returnTo") as string) ?? '/tareas')
}
