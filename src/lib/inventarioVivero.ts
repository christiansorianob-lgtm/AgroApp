// Registro de movimientos del vivero y su efecto en el inventario. No es un archivo de acciones:
// lo llaman acciones que ya verificaron el perfil, siempre dentro de una transacción.

import type { Prisma, TipoMovimientoVivero } from "@prisma/client"
import { infoMovimiento, describirRenglon } from "@/lib/vivero"

type Tx = Prisma.TransactionClient

export interface LineaMovimiento {
    materialId: string
    /** Positiva. En un AJUSTE se usa `delta` en su lugar. */
    cantidad: number
    /** Solo ajustes: + suma, − resta */
    delta?: number
    precioUnitario?: number | null
}

export interface EncabezadoMovimiento {
    loteId: string
    tipo: TipoMovimientoVivero
    fecha: Date
    tareaId?: string | null
    destino?: string | null
    clienteNombre?: string | null
    clienteCedula?: string | null
    clienteCelular?: string | null
    placas?: string | null
    representante?: string | null
    observaciones?: string | null
    registradoPorId?: string | null
    registradoPor?: string | null
}

export class ErrorInventario extends Error {}

async function siguienteCodigo(tx: Tx): Promise<string> {
    const ultimo = await tx.movimientoVivero.findFirst({ orderBy: { codigo: "desc" }, select: { codigo: true } })
    const n = ultimo ? parseInt(ultimo.codigo.replace(/^MV-/, ""), 10) : 0
    return `MV-${String((Number.isFinite(n) ? n : 0) + 1).padStart(3, "0")}`
}

/**
 * Registra el movimiento y actualiza el inventario de cada renglón. Una salida nunca deja un
 * renglón en negativo: si no alcanza, lanza ErrorInventario y la transacción se deshace.
 */
export async function aplicarMovimiento(tx: Tx, enc: EncabezadoMovimiento, lineas: LineaMovimiento[]) {
    const sentido = infoMovimiento(enc.tipo).sentido
    const utiles = lineas.filter(l => (sentido === "ajuste" ? (l.delta ?? 0) !== 0 : l.cantidad > 0))
    if (utiles.length === 0) throw new ErrorInventario("Indique la cantidad de plantas de al menos un material.")

    const materiales = await tx.loteViveroMaterial.findMany({ where: { id: { in: utiles.map(l => l.materialId) }, loteId: enc.loteId } })
    const porId = new Map(materiales.map(m => [m.id, m]))

    const datosLineas: Prisma.MovimientoViveroLineaCreateWithoutMovimientoInput[] = []
    for (const l of utiles) {
        const m = porId.get(l.materialId)
        if (!m) throw new ErrorInventario("Uno de los materiales no pertenece a este vivero.")
        const delta = sentido === "entrada" ? l.cantidad : sentido === "salida" ? -l.cantidad : (l.delta ?? 0)
        if (!Number.isInteger(delta)) throw new ErrorInventario("Las cantidades deben ser números enteros.")

        if (delta < 0) {
            // Descuenta solo si alcanza (condición en la misma consulta para evitar carreras)
            const r = await tx.loteViveroMaterial.updateMany({ where: { id: m.id, cantidad: { gte: -delta } }, data: { cantidad: { decrement: -delta } } })
            if (r.count === 0) {
                throw new ErrorInventario(`No hay suficientes plantas de ${describirRenglon(m)}: hay ${m.cantidad.toLocaleString("es-CO")} y se piden ${(-delta).toLocaleString("es-CO")}.`)
            }
        } else {
            await tx.loteViveroMaterial.update({ where: { id: m.id }, data: { cantidad: { increment: delta } } })
        }

        const precio = enc.tipo === "VENTA" && l.precioUnitario != null && l.precioUnitario >= 0 ? l.precioUnitario : null
        datosLineas.push({
            material: { connect: { id: m.id } },
            tipoCultivo: m.tipoCultivo, especie: m.especie, variedad: m.variedad, casaGenetica: m.casaGenetica,
            opcionesGeneticas: m.opcionesGeneticas, etapa: m.etapa, ubicacion: m.ubicacion,
            cantidad: Math.abs(delta), delta,
            precioUnitario: precio, valor: precio != null ? precio * Math.abs(delta) : null,
        })
    }

    return tx.movimientoVivero.create({
        data: {
            codigo: await siguienteCodigo(tx),
            lote: { connect: { id: enc.loteId } },
            tipo: enc.tipo,
            fecha: enc.fecha,
            tarea: enc.tareaId ? { connect: { id: enc.tareaId } } : undefined,
            destino: enc.destino?.trim() || null,
            clienteNombre: enc.clienteNombre?.trim() || null,
            clienteCedula: enc.clienteCedula?.trim() || null,
            clienteCelular: enc.clienteCelular?.trim() || null,
            placas: enc.placas?.trim().toUpperCase() || null,
            representante: enc.representante?.trim() || null,
            observaciones: enc.observaciones?.trim() || null,
            registradoPorId: enc.registradoPorId ?? null,
            registradoPor: enc.registradoPor ?? null,
            lineas: { create: datosLineas },
        },
    })
}
