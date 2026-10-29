'use server'

import { db } from "@/lib/db"

export async function getTiposCultivo() {
    try {
        const tipos = await db.tipoCultivo.findMany({
            orderBy: { nombre: 'asc' },
            include: { variedades: { orderBy: { nombre: "asc" } }, especies: { orderBy: { nombre: "asc" } } }
        })
        return { data: tipos }
    } catch (error) {
        console.error("Error fetching tipos cultivo FULL OBJECT:", error)
        return { error: "Failed to fetch tipos cultivo" }
    }
}

export async function createTipoCultivo(nombre: string) {
    try {
        const nuevo = await db.tipoCultivo.create({ data: { nombre } })
        return { data: nuevo, success: true }
    } catch (e: any) {
        console.error("Error creating TipoCultivo:", e)
        if (e.code === 'P2002') return { error: "Ya existe un cultivo con este nombre" }
        return { error: "Error al crear tipo de cultivo: " + (e.message || "Unknown") }
    }
}

export async function deleteTipoCultivo(id: string) {
    try {
        await db.variedadCultivo.deleteMany({ where: { tipoCultivoId: id } })
        await db.tipoCultivo.delete({ where: { id } })
        return { success: true }
    } catch (e: any) {
        console.error("Error deleting TipoCultivo:", e)
        return { error: "Error al eliminar. Verifique que no tenga variedades o lotes asociados." }
    }
}

export async function createEspecie(tipoId: string, nombre: string, nombreComun?: string) {
    try {
        const nueva = await db.especieCultivo.create({
            data: { tipoCultivoId: tipoId, nombre: nombre.trim(), nombreComun: nombreComun?.trim() || null }
        })
        return { data: nueva, success: true }
    } catch (e: any) {
        if (e.code === 'P2002') return { error: "Ya existe esta especie para este cultivo" }
        return { error: "Error al crear especie" }
    }
}

export async function deleteEspecie(id: string) {
    try {
        // Las variedades de la especie quedan sin especie (no se borran)
        await db.especieCultivo.delete({ where: { id } })
        return { success: true }
    } catch (e: any) {
        return { error: "Error al eliminar especie" }
    }
}

export async function createVariedad(tipoId: string, nombre: string, especieId?: string | null, casaGenetica?: string | null) {
    try {
        const nueva = await db.variedadCultivo.create({
            data: { tipoCultivoId: tipoId, nombre: nombre.trim(), especieId: especieId || null, casaGenetica: casaGenetica?.trim() || null }
        })
        return { data: nueva, success: true }
    } catch (e: any) {
        console.error("Error creating Variedad:", e)
        if (e.code === 'P2002') return { error: "Ya existe esta variedad para este cultivo" }
        return { error: "Error al crear variedad" }
    }
}

export async function deleteVariedad(id: string) {
    try {
        await db.variedadCultivo.delete({ where: { id } })
        return { success: true }
    } catch (e: any) {
        console.error("Error deleting Variedad:", e)
        return { error: "Error al eliminar variedad" }
    }
}
