import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const {
            estado,
            observaciones,
            fechaInicioReal,
            fechaEjecucion,
            consumos, // Array of { productoId, cantidad }
            usoMaquinaria, // Array of { maquinariaId, horas }
            evidencias // String (URL or joined URLs)
        } = body

        if (!id) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 })
        }

        // 1. Handling Task Start (En Proceso)
        if (estado === 'EN_PROCESO') {
            const updated = await db.tarea.update({
                where: { id },
                data: {
                    estado,
                    fechaInicioReal: fechaInicioReal ? new Date(fechaInicioReal) : new Date(),
                }
            })
            return NextResponse.json({ success: true, data: updated })
        }

        // 2. Handling Task Completion (Ejecutada)
        if (estado === 'EJECUTADA') {
            // Find current task to get Finca/Lote info for relations
            const currentTask = await db.tarea.findUnique({ where: { id } })
            if (!currentTask) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })

            const result = await db.$transaction(async (tx) => {
                // A. Update Task
                const updatedTask = await tx.tarea.update({
                    where: { id },
                    data: {
                        estado,
                        fechaEjecucion: fechaEjecucion ? new Date(fechaEjecucion) : new Date(),
                        observaciones: observaciones || undefined,
                        evidencias: evidencias || undefined,
                    }
                })

                // B. Create Consumos (Inventario)
                if (consumos && consumos.length > 0) {
                    for (const item of consumos) {
                        await tx.movimientoInventario.create({
                            data: {
                                fincaId: currentTask.fincaId,
                                productoId: item.productoId,
                                tipoMovimiento: 'SALIDA',
                                fecha: new Date(),
                                cantidad: Number(item.cantidad),
                                referencia: `Consumo Tarea ${currentTask.codigo}`,
                                tareaId: id,
                                loteId: currentTask.loteId
                            }
                        })

                        // Decrement stock
                        await tx.producto.update({
                            where: { id: item.productoId },
                            data: { stockActual: { decrement: Number(item.cantidad) } }
                        })
                    }
                }

                // C. Create Uso Maquinaria
                if (usoMaquinaria && usoMaquinaria.length > 0) {
                    for (const item of usoMaquinaria) {
                        await tx.usoMaquinaria.create({
                            data: {
                                maquinaId: item.maquinariaId,
                                tareaId: id,
                                fincaId: currentTask.fincaId,
                                loteId: currentTask.loteId,
                                operador: currentTask.responsable, // Assuming responsable is operator
                                fechaInicio: updatedTask.fechaInicioReal || new Date(), // Fallback
                                fechaFin: new Date(),
                                horasUso: Number(item.horas),
                            }
                        })

                        // Update machine usage/status if needed (optional)
                    }
                }

                return updatedTask
            })

            return NextResponse.json({ success: true, data: result })
        }

        // Default simple update for other states or just fields
        const updated = await db.tarea.update({
            where: { id },
            data: { estado, observaciones, evidencias: evidencias || undefined }
        })

        return NextResponse.json({ success: true, data: updated })

    } catch (error) {
        console.error("Update Task Error:", error)
        return NextResponse.json({ error: "Error updating task" }, { status: 500 })
    }
}
