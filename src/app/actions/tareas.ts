'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getTareas() {
    try {
        const tareas = await db.tarea.findMany({
            include: {
                finca: true,
                lote: true
            },
            orderBy: { fechaProgramada: 'desc' }
        })
        return { data: tareas }
    } catch (error) {
        console.error("Failed to fetch tareas:", error)
        return { error: "Error al cargar las tareas." }
    }
}

export async function createTarea(formData: FormData) {
    const codigo = formData.get("codigo") as string
    const fincaId = formData.get("fincaId") as string
    const nivel = formData.get("nivel") as "FINCA" | "LOTE"
    const loteId = formData.get("loteId") as string | null
    const fechaProgramada = formData.get("fechaProgramada") as string
    const tipo = formData.get("tipo") as string
    const responsable = formData.get("responsable") as string
    const prioridad = formData.get("prioridad") as "BAJA" | "MEDIA" | "ALTA"
    const estado = formData.get("estado") as "PROGRAMADA" | "EN_PROCESO" | "EJECUTADA" | "CANCELADA"
    const descripcion = formData.get("descripcion") as string
    const observaciones = formData.get("observaciones") as string

    // Validations
    if (!codigo || !fincaId || !nivel || !fechaProgramada || !tipo || !responsable) {
        return { error: "Campos obligatorios faltantes." }
    }

    if (nivel === 'LOTE' && !loteId) {
        return { error: "Debe seleccionar un lote para tareas de nivel Lote." }
    }

    try {
        await db.tarea.create({
            data: {
                codigo,
                fincaId,
                nivel,
                loteId: nivel === 'LOTE' ? loteId : null,
                fechaProgramada: new Date(fechaProgramada),
                tipo,
                responsable,
                prioridad: prioridad || 'MEDIA',
                estado: estado || 'PROGRAMADA',
                descripcion,
                observaciones
            }
        })
    } catch (error) {
        console.error("Failed to create tarea:", error)
        return { error: "Error al crear la tarea. Verifique datos." }
    }

    revalidatePath('/tareas')
    redirect('/tareas')
}
