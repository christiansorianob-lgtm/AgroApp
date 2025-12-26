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

export async function getLoteById(id: string) {
    try {
        const lote = await db.lote.findUnique({
            where: { id },
            include: {
                finca: true
            }
        })
        return { data: lote }
    } catch (error) {
        console.error("Failed to fetch lote:", error)
        return { error: "Error al cargar el lote." }
    }
}

export async function updateLote(id: string, formData: FormData) {
    const nombre = formData.get("nombre") as string
    const areaHa = parseFloat(formData.get("areaHa") as string)
    const tipoCultivo = formData.get("tipoCultivo") as string
    const variedad = formData.get("variedad") as string
    const fechaSiembra = formData.get("fechaSiembra") as string
    const observaciones = formData.get("observaciones") as string

    // Coordinates & Polygon
    const latitud = formData.get("latitud") as string
    const longitud = formData.get("longitud") as string
    const poligonoStr = formData.get("poligono") as string

    if (!nombre || !areaHa) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        let poligonoJson = undefined
        if (poligonoStr) {
            try {
                poligonoJson = JSON.parse(poligonoStr)
            } catch (e) {
                console.error("Error parsing polygon JSON", e)
            }
        }

        await db.lote.update({
            where: { id },
            data: {
                nombre,
                areaHa,
                tipoCultivo,
                variedad,
                fechaSiembra: fechaSiembra ? new Date(fechaSiembra) : null,
                observaciones,
                latitud: latitud ? parseFloat(latitud) : undefined,
                longitud: longitud ? parseFloat(longitud) : undefined,
                poligono: poligonoJson
            }
        })
    } catch (error) {
        console.error("Failed to update lote:", error)
        return { error: "Error al actualizar el lote." }
    }

    revalidatePath('/lotes') // Revalidate list
    revalidatePath(`/lotes/${id}/edit`) // Revalidate edit page
    // Note: We don't redirect here to allow the caller to decide, or we can redirect to the Finca page.
    // The previous createLote redirects, but typically update actions might just return success.
    // However, to keep it consistent with the form usage in the plan, I'll return success and let the client redirect.
    return { success: true }
}
