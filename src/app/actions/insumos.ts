'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getInsumos() {
    try {
        const insumos = await db.insumo.findMany({
            orderBy: { nombre: 'asc' },
            include: {
                movimientos: true // To calculate stock if needed basic
            }
        })

        // Simple stock calculation (not per Finca here, but global or raw list)
        // Requirement says "Calculated by Finca".
        // We return raw data or aggregated.
        return { data: insumos }
    } catch (error) {
        console.error("Failed to fetch insumos:", error)
        return { error: "Error al cargar insumos." }
    }
}

export async function createInsumo(formData: FormData) {
    const codigo = formData.get("codigo") as string
    const nombre = formData.get("nombre") as string
    const categoria = formData.get("categoria") as string
    const unidadMedida = formData.get("unidadMedida") as string

    if (!codigo || !nombre) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        await db.insumo.create({
            data: {
                codigo,
                nombre,
                categoria,
                unidadMedida
            }
        })
    } catch (error) {
        console.error("Failed to create insumo:", error)
        return { error: "Error al crear insumo." }
    }

    revalidatePath('/insumos')
    redirect('/insumos')
}

// Logic for Movements would go here (createMovimiento)
// Need to handle: Entrance (Compra), Exit (Consumo per Tarea), Adjustment.
