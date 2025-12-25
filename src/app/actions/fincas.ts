'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getFincas() {
    try {
        const fincas = await db.finca.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { data: fincas }
    } catch (error) {
        console.error("Failed to fetch fincas:", error)
        return { error: "Error al cargar las fincas." }
    }
}

export async function createFinca(formData: FormData) {
    const nombre = formData.get("nombre") as string
    // const codigo = formData.get("codigo") as string // Removed from form
    const departamento = formData.get("departamento") as string
    const municipio = formData.get("municipio") as string
    const veredaSector = formData.get("veredaSector") as string
    const responsable = formData.get("responsable") as string
    const areaTotalHa = parseFloat(formData.get("areaTotalHa") as string)
    const observaciones = formData.get("observaciones") as string

    // Simple validation
    if (!nombre || !areaTotalHa) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        // Auto-generate code
        const lastFinca = await db.finca.findFirst({
            orderBy: { createdAt: 'desc' }
        })

        let nextCode = "FIN-001"
        if (lastFinca && lastFinca.codigo.startsWith("FIN-")) {
            const lastNumber = parseInt(lastFinca.codigo.split("-")[1])
            if (!isNaN(lastNumber)) {
                nextCode = `FIN-${(lastNumber + 1).toString().padStart(3, '0')}`
            }
        }

        await db.finca.create({
            data: {
                codigo: nextCode,
                nombre,
                departamento,
                municipio,
                veredaSector,
                responsable,
                areaTotalHa,
                observaciones,
                estado: 'ACTIVO'
            }
        })
    } catch (error) {
        console.error("Failed to create finca:", error)
        return { error: "Error al crear la finca." }
    }

    revalidatePath('/fincas')
    redirect('/fincas')
}
