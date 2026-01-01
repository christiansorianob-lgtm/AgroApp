'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// -----------------------------------------------------------------------------
// TIPOS DE ACTIVIDAD
// -----------------------------------------------------------------------------

export async function getTiposActividad() {
    try {
        const data = await db.tipoActividad.findMany({
            orderBy: { nombre: 'asc' }
        })
        return { data }
    } catch (error) {
        console.error("Error fetching tipos actividad:", error)
        return { error: "Error al cargar tipos de actividad" }
    }
}

export async function createTipoActividad(nombre: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }

    try {
        await db.tipoActividad.create({
            data: { nombre: nombre.trim() }
        })
        revalidatePath('/configuracion/actividades')
        revalidatePath('/tareas/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear actividad (posible duplicado)" }
    }
}

export async function deleteTipoActividad(id: string) {
    try {
        await db.tipoActividad.delete({ where: { id } })
        revalidatePath('/configuracion/actividades')
        revalidatePath('/tareas/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar actividad" }
    }
}

export async function seedTiposActividad() {
    const defaults = [
        "Fertilización", "Poda", "Riego", "Control de Plagas",
        "Control de Malezas", "Cosecha", "Siembra", "Mantenimiento General"
    ]

    let count = 0
    for (const nombre of defaults) {
        const exists = await db.tipoActividad.findUnique({ where: { nombre } })
        if (!exists) {
            await db.tipoActividad.create({ data: { nombre } })
            count++
        }
    }
    return { success: true, count }
}

// -----------------------------------------------------------------------------
// RESPONSABLES
// -----------------------------------------------------------------------------

export async function getResponsables() {
    try {
        const data = await db.responsable.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            include: { cargoRef: true }
        })
        return { data }
    } catch (error) {
        console.error("Error fetching responsables:", error)
        return { error: "Error al cargar responsables" }
    }
}

export async function createResponsable(nombre: string, email?: string, cargoId?: string, celular?: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }

    try {
        await db.responsable.create({
            data: {
                nombre: nombre.trim(),
                email: email?.trim(),
                cargoId: cargoId?.trim() || null,
                celular: celular?.trim()
            }
        })
        revalidatePath('/configuracion/responsables')
        revalidatePath('/tareas/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear responsable (posible duplicado)" }
    }
}

export async function updateResponsable(id: string, nombre: string, email?: string, cargoId?: string, celular?: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }

    try {
        await db.responsable.update({
            where: { id },
            data: {
                nombre: nombre.trim(),
                email: email?.trim(),
                cargoId: cargoId?.trim() || null,
                celular: celular?.trim()
            }
        })
        revalidatePath('/configuracion/responsables')
        revalidatePath('/tareas/new')
        return { success: true }
    } catch (error: any) {
        console.error("Error updating responsable:", error)
        return { error: `Error al actualizar: ${error.message}` }
    }
}

export async function deleteResponsable(id: string) {
    try {
        await db.responsable.delete({ where: { id } })
        revalidatePath('/configuracion/responsables')
        revalidatePath('/tareas/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar responsable" }
    }
}

// -----------------------------------------------------------------------------
// CATALOGOS CARGOS
// -----------------------------------------------------------------------------

export async function getCargos() {
    try {
        const data = await db.cargo.findMany({ orderBy: { nombre: 'asc' } })
        return { data }
    } catch (error) {
        return { error: "Error al cargar cargos" }
    }
}

export async function createCargo(nombre: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }
    try {
        await db.cargo.create({ data: { nombre: nombre.trim() } })
        revalidatePath('/configuracion/responsables')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear cargo (posible duplicado)" }
    }
}

export async function deleteCargo(id: string) {
    try {
        await db.cargo.delete({ where: { id } })
        revalidatePath('/configuracion/responsables')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar cargo" }
    }
}

export async function seedCargos() {
    const defaults = [
        "Administrador", "Mayordomo", "Capataz", "Agrónomo",
        "Veterinario", "Tractorista / Operario", "Jornalero",
        "Oficios Varios", "Vigilante"
    ]
    let count = 0
    for (const nombre of defaults) {
        const exists = await db.cargo.findUnique({ where: { nombre } })
        if (!exists) {
            await db.cargo.create({ data: { nombre } })
            count++
        }
    }
    revalidatePath('/configuracion/responsables')
    return { success: true, count }
}

// -----------------------------------------------------------------------------
// CATALOGOS INSUMOS
// -----------------------------------------------------------------------------

// --- Categorias Producto ---
export async function getCategoriasProducto() {
    try {
        const data = await db.categoriaProducto.findMany({ orderBy: { nombre: 'asc' } })
        return { data }
    } catch (error) {
        return { error: "Error al cargar categorías de producto" }
    }
}

export async function createCategoriaProducto(nombre: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }
    try {
        await db.categoriaProducto.create({ data: { nombre: nombre.trim() } })
        revalidatePath('/configuracion/categorias-producto')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear categoría" }
    }
}

export async function deleteCategoriaProducto(id: string) {
    try {
        await db.categoriaProducto.delete({ where: { id } })
        revalidatePath('/configuracion/categorias-producto')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar categoría" }
    }
}

// --- Unidades Medida ---
export async function getUnidadesMedida() {
    try {
        const data = await db.unidadMedida.findMany({ orderBy: { nombre: 'asc' } })
        return { data }
    } catch (error) {
        return { error: "Error al cargar unidades" }
    }
}

export async function createUnidadMedida(nombre: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }
    try {
        await db.unidadMedida.create({ data: { nombre: nombre.trim() } })
        revalidatePath('/configuracion/unidades-medida')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear unidad" }
    }
}

export async function deleteUnidadMedida(id: string) {
    try {
        await db.unidadMedida.delete({ where: { id } })
        revalidatePath('/configuracion/unidades-medida')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar unidad" }
    }
}

// --- Nombres Producto ---
export async function getNombresProducto() {
    try {
        const data = await db.nombreProducto.findMany({
            orderBy: { nombre: 'asc' },
            include: { categoria: true } // Include relation for filtering
        })
        return { data }
    } catch (error) {
        return { error: "Error al cargar nombres" }
    }
}

export async function createNombreProducto(nombre: string, categoriaId?: string) {
    if (!nombre || !nombre.trim()) return { error: "Nombre requerido" }
    try {
        await db.nombreProducto.create({
            data: {
                nombre: nombre.trim(),
                categoriaId: categoriaId || null
            }
        })
        revalidatePath('/configuracion/nombres-producto')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al crear nombre" }
    }
}

export async function deleteNombreProducto(id: string) {
    try {
        await db.nombreProducto.delete({ where: { id } })
        revalidatePath('/configuracion/nombres-producto')
        revalidatePath('/almacen/new')
        return { success: true }
    } catch (error) {
        return { error: "Error al eliminar nombre" }
    }
}

export async function seedProductoCatalogs() {
    const categorias = ["Fertilizante", "Herbicida", "Fungicida", "Insecticida", "Enmienda", "Combustible", "Herramienta", "Repuestos"]
    const unidades = ["Kilogramo (kg)", "Gramo (g)", "Litro (l)", "Mililitro (ml)", "Bulto", "Galón", "Unidad"]
    const nombres = ["Urea 46%", "DAP 18-46-0", "KCL Cloruro de Potasio", "Glifosato", "Cal Dolomita", "Bujía"]

    let count = 0

    for (const nombre of categorias) {
        const exists = await db.categoriaProducto.findUnique({ where: { nombre } })
        if (!exists) { await db.categoriaProducto.create({ data: { nombre } }); count++ }
    }

    for (const nombre of unidades) {
        const exists = await db.unidadMedida.findUnique({ where: { nombre } })
        if (!exists) { await db.unidadMedida.create({ data: { nombre } }); count++ }
    }

    for (const nombre of nombres) {
        const exists = await db.nombreProducto.findUnique({ where: { nombre } })
        if (!exists) { await db.nombreProducto.create({ data: { nombre } }); count++ }
    }

    revalidatePath('/almacen/new')
    return { success: true, count }
}

export async function getCategoryDetails(id: string) {
    try {
        const category = await db.categoriaProducto.findUnique({
            where: { id },
            include: { nombres: { orderBy: { nombre: 'asc' } } }
        })
        if (!category) return { error: "Categoría no encontrada" }
        return { data: category }
    } catch (error) {
        return { error: "Error al cargar detalles de la categoría" }
    }
}
