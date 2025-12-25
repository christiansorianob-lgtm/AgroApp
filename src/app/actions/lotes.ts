'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getLotes() {
    try {
        const lotes = await db.lote.findMany({
            include: {
                finca: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return { data: lotes }
    } catch (error) {
        console.error("Failed to fetch lotes:", error)
        return { error: "Error al cargar los lotes." }
    }
}

export async function createLote(formData: FormData) {
    const fincaId = formData.get("fincaId") as string
    const nombre = formData.get("nombre") as string
    const codigo = formData.get("codigo") as string
    const areaHa = parseFloat(formData.get("areaHa") as string)
    const tipoCultivo = formData.get("tipoCultivo") as string
    const variedad = formData.get("variedad") as string
    const fechaSiembra = formData.get("fechaSiembra") as string
    const observaciones = formData.get("observaciones") as string

    if (!fincaId || !nombre || !codigo || !areaHa) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        await db.lote.create({
            data: {
                fincaId,
                codigo,
                nombre,
                areaHa,
                tipoCultivo,
                variedad,
                fechaSiembra: fechaSiembra ? new Date(fechaSiembra) : null,
                observaciones,
                estado: 'ACTIVO'
            }
        })
    } catch (error) {
        console.error("Failed to create lote:", error)
        return { error: "Error al crear el lote. Verifique datos." }
    }

    revalidatePath('/lotes')
    redirect('/lotes')
}
