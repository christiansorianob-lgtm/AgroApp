'use server'

// Ejecución de las tareas de movimiento de plantas del vivero.

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { exigirAccesoATarea } from "@/lib/auth"
import { aplicarMovimiento, ErrorInventario } from "@/lib/inventarioVivero"
import { parseFechaCalendario } from "@/lib/utils"
import { infoMovimiento } from "@/lib/vivero"

export interface DatosMovimientoVivero {
    fecha: string
    lineas: { materialId: string; cantidad: number; precioUnitario?: number | null }[]
    destino?: string
    clienteNombre?: string
    clienteCedula?: string
    clienteCelular?: string
    placas?: string
    representante?: string
    observaciones?: string
}

/** Registra el movimiento de la tarea, actualiza el inventario y deja la tarea ejecutada. */
export async function registrarMovimientoDeTarea(tareaId: string, datos: DatosMovimientoVivero): Promise<{ success?: boolean; codigo?: string; error?: string }> {
    const sesion = await exigirAccesoATarea(tareaId)
    const tarea = await db.tarea.findUnique({ where: { id: tareaId }, include: { movimientoVivero: { select: { codigo: true } } } })
    if (!tarea?.movimientoViveroTipo || !tarea.loteId) return { error: "Esta tarea no es un movimiento de plantas del vivero." }
    if (tarea.movimientoVivero) return { error: `Esta tarea ya registró el movimiento ${tarea.movimientoVivero.codigo}.` }

    const tipo = tarea.movimientoViveroTipo
    const info = infoMovimiento(tipo)
    const fecha = parseFechaCalendario(datos.fecha)
    if (!fecha) return { error: "Indique la fecha del movimiento." }
    const lineas = datos.lineas.filter(l => Number.isInteger(l.cantidad) && l.cantidad > 0)
    if (lineas.length === 0) return { error: "Indique cuántas plantas de al menos un material." }
    if (info.pideCliente && !datos.clienteNombre?.trim()) return { error: "Escriba el nombre del cliente." }
    if (tipo === "VENTA" && lineas.some(l => l.precioUnitario == null || !Number.isFinite(l.precioUnitario) || l.precioUnitario < 0)) {
        return { error: "Indique el precio por planta de cada variedad vendida." }
    }

    try {
        const mov = await db.$transaction(async tx => {
            const m = await aplicarMovimiento(tx, {
                loteId: tarea.loteId!, tipo, fecha, tareaId,
                destino: datos.destino, clienteNombre: datos.clienteNombre, clienteCedula: datos.clienteCedula,
                clienteCelular: datos.clienteCelular, placas: datos.placas, representante: datos.representante,
                observaciones: datos.observaciones, registradoPorId: sesion.uid, registradoPor: sesion.nombre,
            }, lineas)
            await tx.tarea.update({ where: { id: tareaId }, data: { estado: "EJECUTADA", fechaEjecucion: fecha } })
            return m
        }, { timeout: 30_000 })

        revalidatePath(`/lotes/${tarea.loteId}`)
        revalidatePath(`/fincas/${tarea.fincaId}`)
        revalidatePath('/tareas')
        revalidatePath('/mis-tareas')
        return { success: true, codigo: mov.codigo }
    } catch (e) {
        if (e instanceof ErrorInventario) return { error: e.message }
        console.error("Error registrando movimiento de vivero:", e)
        return { error: "No se pudo registrar el movimiento. Intente de nuevo." }
    }
}
