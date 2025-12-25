'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- MAQUINARIA CRUD ---

export async function getMaquinaria() {
    try {
        const maquinas = await db.maquinaria.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                // Optional: include relation to usage log count? or Finca if we relate it?
                // Current model has fincaId simply as a field.
            }
        })
        return { data: maquinas }
    } catch (error) {
        console.error("Failed to fetch maquinaria:", error)
        return { error: "Error al cargar maquinaria." }
    }
}

export async function createMaquinaria(formData: FormData) {
    const codigo = formData.get("codigo") as string
    const fincaId = formData.get("fincaId") as string
    const tipo = formData.get("tipo") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const serialPlaca = formData.get("serialPlaca") as string
    const estado = formData.get("estado") as any // Enum casting
    const observaciones = formData.get("observaciones") as string

    if (!codigo || !tipo || !serialPlaca) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        await db.maquinaria.create({
            data: {
                codigo,
                fincaId: fincaId || "N/A", // Optional based on request interpretation
                tipo,
                marca,
                modelo,
                serialPlaca,
                estado: estado || 'DISPONIBLE',
                observaciones
            }
        })
    } catch (error) {
        console.error("Failed to create maquinaria:", error)
        return { error: "Error al registrar maquina." }
    }

    revalidatePath('/maquinaria')
    redirect('/maquinaria')
}

// --- USO MAQUINARIA ---

export async function getUsoMaquinaria() {
    try {
        const usos = await db.usoMaquinaria.findMany({
            include: {
                maquina: true,
                tarea: true,
                finca: true
            },
            orderBy: { fechaInicio: 'desc' }
        })
        return { data: usos }
    } catch (error) {
        console.error("Failed to fetch usos:", error)
        return { error: "Error al cargar historial de uso." }
    }
}

// NOTE: createUsoMaquinaria requires linking to an existing Tarea.
// This usually implies selecting a Tarea first.
export async function createUsoMaquinaria(formData: FormData) {
    // Implementation would go here.
    // For now, we focus on the Maquinaria Catalog as primary deliverable for this module step.
    return { error: "Not implemented yet" }
}
