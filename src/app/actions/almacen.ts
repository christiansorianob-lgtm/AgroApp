'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getProductos(fincaId?: string) {
    try {
        const whereClause = fincaId ? { fincaId } : {}
        const productos = await db.producto.findMany({
            where: whereClause,
            orderBy: { nombre: 'asc' },
            include: {
                movimientos: true,
                finca: true
            }
        })
        return { data: productos }
    } catch (error) {
        console.error("Failed to fetch productos:", error)
        return { error: "Error al cargar productos." }
    }
}

// export async function getProductos(fincaId: string) { ... } -> Updated below

export async function createProducto(formData: FormData) {
    const nombre = formData.get("nombre") as string
    const categoria = formData.get("categoria") as string
    const unidadMedida = formData.get("unidadMedida") as string
    const cantidadStr = formData.get("cantidad") as string
    const fincaId = formData.get("fincaId") as string
    const stockActual = parseFloat(cantidadStr) || 0

    if (!fincaId) return { error: "Debe seleccionar una Finca." }
    if (!categoria) return { error: "Debe seleccionar una Categoría." }
    if (!nombre) return { error: "Debe seleccionar un Nombre Comercial." }
    if (!unidadMedida) return { error: "Debe seleccionar una Unidad de Medida." }

    try {
        // Auto-generate code PER FINCA if possible, or global uniqueness?
        // Schema has @@unique([fincaId, codigo]).
        // We need to count products IN THIS FINCA to generate consecutive code.
        const count = await db.producto.count({ where: { fincaId } })
        const codigo = `PRO-${(count + 1).toString().padStart(3, '0')}`

        const newProducto = await db.producto.create({
            data: {
                codigo,
                nombre,
                categoria,
                unidadMedida,
                stockActual,
                fincaId
            }
        })

        // Create initial stock movement if quantity > 0
        await createInitialStockMovement(newProducto.id, stockActual, fincaId)

        const disableRedirect = formData.get("disable_redirect") === "true"
        if (disableRedirect) {
            revalidatePath('/almacen')
            return { success: true, data: newProducto }
        }
    } catch (error) {
        console.error("Failed to create producto:", error)
        return { error: "Error al crear producto." }
    }

    revalidatePath('/almacen')
    redirect('/almacen')
}

// Logic for Movements would go here (createMovimiento)

// ... previous code

async function createInitialStockMovement(productoId: string, cantidad: number, fincaId: string) {
    if (cantidad <= 0) return

    // We use the passed fincaId, no need to findFirst random one.
    await db.movimientoInventario.create({
        data: {
            fincaId,
            productoId,
            tipoMovimiento: 'ENTRADA',
            fecha: new Date(),
            cantidad,
            referencia: 'Inventario Inicial (Creación)',
            observaciones: 'Generado automáticamente al crear el producto'
        }
    })
}

export async function createAjusteInventario(formData: FormData) {
    const productoId = formData.get("productoId") as string
    const fincaId = formData.get("fincaId") as string
    const tipoMovimiento = formData.get("tipoMovimiento") as "ENTRADA" | "SALIDA"
    const cantidadStr = formData.get("cantidad") as string
    const observaciones = formData.get("observaciones") as string

    const cantidad = parseFloat(cantidadStr)

    if (!productoId || !fincaId || !tipoMovimiento || !cantidad || cantidad <= 0) {
        return { error: "Datos inválidos. Verifique los campos." }
    }

    try {
        await db.$transaction(async (tx) => {
            const producto = await tx.producto.findUnique({ where: { id: productoId } })
            if (!producto) throw new Error("Producto no encontrado")

            if (tipoMovimiento === 'SALIDA') {
                if (producto.stockActual < cantidad) {
                    throw new Error(`Stock insuficiente. Disponible: ${producto.stockActual}`)
                }
            }

            // Create Movement
            await tx.movimientoInventario.create({
                data: {
                    fincaId,
                    productoId,
                    tipoMovimiento,
                    fecha: new Date(),
                    cantidad,
                    referencia: 'Ajuste Manual / Compra',
                    observaciones: observaciones || "Movimiento manual registrado desde inventario"
                }
            })

            // Update Stock
            const stockChange = tipoMovimiento === 'ENTRADA' ? cantidad : -cantidad
            await tx.producto.update({
                where: { id: productoId },
                data: {
                    stockActual: { increment: stockChange }
                }
            })
        })

        revalidatePath('/almacen')
        revalidatePath('/almacen/movimientos')
        return { success: true }
    } catch (error: any) {
        console.error("Error creating adjustment:", error)
        return { error: error.message || "Error al procesar el ajuste" }
    }
}
