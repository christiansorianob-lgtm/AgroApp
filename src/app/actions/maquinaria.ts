'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- CATALOGOS HELPERS ---

export async function getTiposMaquinaria() {
    try {
        return { data: await db.tipoMaquinaria.findMany({ orderBy: { nombre: 'asc' } }) }
    } catch (e) { return { error: "Error al cargar tipos" } }
}

export async function seedMaquinariaCatalogs() {
    try {
        const tipos = ['Tractor', 'Camión', 'Cosechadora', 'Fumigadora', 'Guadaña', 'Motobomba', 'Planta Eléctrica', 'Remolque']
        for (const t of tipos) {
            const exists = await db.tipoMaquinaria.findFirst({ where: { nombre: t } })
            if (!exists) await db.tipoMaquinaria.create({ data: { nombre: t } })
        }

        const marcas = ['John Deere', 'Massey Ferguson', 'Caterpillar', 'Kubota', 'Yamaha', 'Honda', 'Stihl', 'Ford', 'Chevrolet', 'Husqvarna']
        for (const m of marcas) {
            const exists = await db.marcaMaquinaria.findFirst({ where: { nombre: m } })
            if (!exists) await db.marcaMaquinaria.create({ data: { nombre: m } })
        }

        const ubicaciones = ['Bodega Principal', 'Taller Mecánico', 'Patio de Maquinaria', 'Garaje Administrativo']
        for (const u of ubicaciones) {
            const exists = await db.ubicacionMaquinaria.findFirst({ where: { nombre: u } })
            if (!exists) await db.ubicacionMaquinaria.create({ data: { nombre: u } })
        }

        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) {
        console.error("Error seeding catalogs:", e)
        return { error: "Error al poblar catálogos" }
    }
}

export async function createTipoMaquinaria(nombre: string) {
    try {
        const existing = await db.tipoMaquinaria.findFirst({ where: { nombre } })
        if (existing) return { error: "Este tipo ya existe." }

        await db.tipoMaquinaria.create({ data: { nombre } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al crear tipo" } }
}

export async function deleteTipoMaquinaria(id: string) {
    try {
        await db.tipoMaquinaria.delete({ where: { id } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al eliminar tipo" } }
}

export async function getMarcasMaquinaria() {
    try {
        return { data: await db.marcaMaquinaria.findMany({ orderBy: { nombre: 'asc' } }) }
    } catch (e) { return { error: "Error al cargar marcas" } }
}

export async function createMarcaMaquinaria(nombre: string) {
    try {
        const existing = await db.marcaMaquinaria.findFirst({ where: { nombre } })
        if (existing) return { error: "Esta marca ya existe." }

        await db.marcaMaquinaria.create({ data: { nombre } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al crear marca" } }
}

export async function deleteMarcaMaquinaria(id: string) {
    try {
        await db.marcaMaquinaria.delete({ where: { id } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al eliminar marca" } }
}

export async function getUbicacionesMaquinaria() {
    try {
        return { data: await db.ubicacionMaquinaria.findMany({ orderBy: { nombre: 'asc' } }) }
    } catch (e) { return { error: "Error al cargar ubicaciones" } }
}

export async function createUbicacionMaquinaria(nombre: string) {
    try {
        const existing = await db.ubicacionMaquinaria.findFirst({ where: { nombre } })
        if (existing) return { error: "Esta ubicación ya existe." }

        await db.ubicacionMaquinaria.create({ data: { nombre } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al crear ubicación" } }
}

export async function deleteUbicacionMaquinaria(id: string) {
    try {
        await db.ubicacionMaquinaria.delete({ where: { id } })
        revalidatePath('/maquinaria/new')
        return { success: true }
    } catch (e) { return { error: "Error al eliminar ubicación" } }
}


// --- MAQUINARIA CRUD ---

export async function getMaquinaria() {
    try {
        const maquinas = await db.maquinaria.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tipo: true,
                marca: true,
                ubicacion: true,
                // finca: true
            }
        })
        return { data: maquinas }
    } catch (error) {
        console.error("Failed to fetch maquinaria:", error)
        return { error: "Error al cargar maquinaria." }
    }
}

export async function createMaquinaria(formData: FormData) {
    // const codigo = formData.get("codigo") as string // Autogenerado now
    const ubicacionId = formData.get("ubicacionId") as string
    const tipoId = formData.get("tipoId") as string
    const marcaId = formData.get("marcaId") as string
    const modelo = formData.get("modelo") as string
    const serialPlaca = formData.get("serialPlaca") as string
    const estado = formData.get("estado") as any
    const observaciones = formData.get("observaciones") as string

    if (!tipoId || !marcaId || !ubicacionId || !serialPlaca) {
        return { error: "Campos obligatorios faltantes." }
    }

    try {
        // Autogenerate Code: MAQ-XXX
        const count = await db.maquinaria.count()
        const nextId = count + 1
        const codigo = `MAQ-${nextId.toString().padStart(3, '0')}`

        await db.maquinaria.create({
            data: {
                codigo,
                tipoMaquinariaId: tipoId,
                marcaMaquinariaId: marcaId,
                ubicacionMaquinariaId: ubicacionId,
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

export async function createUsoMaquinaria(formData: FormData) {
    return { error: "Not implemented yet" }
}
