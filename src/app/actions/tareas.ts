'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function getTareas(filters?: { fincaId?: string, loteId?: string, nivel?: "FINCA" | "LOTE" }) {
    try {
        const where: any = {}
        if (filters?.fincaId) where.fincaId = filters.fincaId
        if (filters?.loteId) where.loteId = filters.loteId
        if (filters?.nivel) where.nivel = filters.nivel

        const tareas = await db.tarea.findMany({
            where,
            include: {
                finca: true,
                lote: true
            },
            orderBy: { fechaProgramada: 'desc' }
        })
        return { data: tareas }
    } catch (error) {
        console.error("Failed to fetch tareas:", error)
        return { error: "Error al cargar las tareas." }
    }
}

export async function getTareaById(id: string) {
    try {
        const tarea = await db.tarea.findUnique({
            where: { id },
            include: {
                finca: true,
                lote: true,
                consumos: {
                    include: {
                        producto: true
                    }
                },
                usosMaquinaria: {
                    include: {
                        maquina: {
                            include: {
                                tipo: true,
                                marca: true
                            }
                        } as any
                    }
                }
            }
        })
        return { data: tarea }
    } catch (error) {
        console.error("Failed to fetch tarea:", error)
        return { error: "Error al cargar la tarea." }
    }
}

export async function createTarea(formData: FormData) {
    // const codigo = formData.get("codigo") as string // Removed manual code
    const fincaId = formData.get("fincaId") as string
    const nivel = formData.get("nivel") as "FINCA" | "LOTE"
    const loteId = formData.get("loteId") as string | null
    const fechaProgramada = formData.get("fechaProgramada") as string
    const tipo = formData.get("tipo") as string
    const responsable = formData.get("responsable") as string
    const prioridad = formData.get("prioridad") as "BAJA" | "MEDIA" | "ALTA"
    const estado = formData.get("estado") as "PROGRAMADA" | "EN_PROCESO" | "EJECUTADA" | "CANCELADA"
    const descripcion = formData.get("descripcion") as string
    const observaciones = formData.get("observaciones") as string

    // Validations
    if (!fincaId || !nivel || !fechaProgramada || !tipo || !responsable) {
        return { error: "Campos obligatorios faltantes." }
    }

    if (nivel === 'LOTE' && !loteId) {
        return { error: "Debe seleccionar un lote para tareas de nivel Lote." }
    }

    try {
        // Auto-generate Code
        const totalTareas = await db.tarea.count()
        const nextId = totalTareas + 1
        const codigo = `TAR-${nextId.toString().padStart(3, '0')}`

        await db.tarea.create({
            data: {
                codigo,
                fincaId,
                nivel,
                loteId: nivel === 'LOTE' ? loteId : null,
                fechaProgramada: new Date(fechaProgramada),
                tipo,
                responsable,
                prioridad: prioridad || 'MEDIA',
                estado: estado || 'PROGRAMADA',
                descripcion,
                observaciones
            }
        })
    } catch (error) {
        console.error("Failed to create tarea:", error)
        return { error: "Error al crear la tarea. Verifique datos." }
    }

    revalidatePath('/tareas')
    redirect('/tareas')
}

// EXECUTE TASK ACTION
export async function executeTarea(id: string, formData: FormData) {
    const estado = formData.get("estado") as any
    const observaciones = formData.get("observaciones") as string
    const fechaEjecucion = formData.get("fechaEjecucion") as string
    const consumosStr = formData.get("consumos") as string
    const fincaId = formData.get("fincaId") as string
    // const duracionRealHoras = formData.get("duracionRealHoras")

    const consumos = consumosStr ? JSON.parse(consumosStr) : []

    // Handle File Uploads
    const files = formData.getAll("evidencias") as File[]
    console.log("ExecuteTarea: Received files:", files.length) // DEBUG LOG

    const uploadedUrls: string[] = []

    if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "tareas")

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if exists
        }

        for (const file of files) {
            console.log("Processing file:", file.name, "Size:", file.size) // DEBUG LOG

            // Basic validation
            if (file.size === 0) continue;

            const buffer = Buffer.from(await file.arrayBuffer())
            const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
            const filePath = path.join(uploadDir, fileName)

            try {
                await writeFile(filePath, buffer)
                uploadedUrls.push(`/uploads/tareas/${fileName}`)
                console.log("Saved to:", filePath) // DEBUG LOG
            } catch (error) {
                console.error("Error saving file:", error)
            }
        }
    }

    // Combine with existing evidence if we were editing (not implemented yet, assumed new execution appends)
    const evidenciasString = uploadedUrls.length > 0 ? uploadedUrls.join('\n') : null
    console.log("Final evidenciasString:", evidenciasString) // DEBUG LOG

    const maquinariaStr = formData.get("maquinaria") as string
    const usosMaquinaria = maquinariaStr ? JSON.parse(maquinariaStr) : []

    try {
        await db.$transaction(async (tx) => {
            // 1. Update Task
            const updatedTarea = await tx.tarea.update({
                where: { id },
                data: {
                    estado,
                    observaciones,
                    evidencias: evidenciasString,
                    fechaEjecucion: fechaEjecucion ? new Date(fechaEjecucion) : new Date(),
                }
            })

            // 2. Process Consumptions
            if (consumos && consumos.length > 0) {
                for (const item of consumos) {
                    // Check stock
                    const producto = await tx.producto.findUnique({ where: { id: item.productoId } })
                    if (!producto) throw new Error(`Producto no encontrado: ${item.productoId}`)

                    if (producto.stockActual < item.cantidad) {
                        throw new Error(`Stock insuficiente para ${producto.nombre}. Stock actual: ${producto.stockActual}`)
                    }

                    // Create Movement
                    await tx.movimientoInventario.create({
                        data: {
                            fincaId: fincaId,
                            productoId: item.productoId,
                            tareaId: id,
                            loteId: updatedTarea.loteId, // Save Lote context
                            tipoMovimiento: 'SALIDA',
                            fecha: new Date(),
                            cantidad: item.cantidad,
                            referencia: 'Consumo en Tarea',
                            observaciones: `Consumo registrado en ejecución de tarea`
                        }
                    })

                    // Deduct Stock
                    await tx.producto.update({
                        where: { id: item.productoId },
                        data: {
                            stockActual: { decrement: item.cantidad }
                        }
                    })
                }
            }

            // 3. Process Machinery Usage
            if (usosMaquinaria && usosMaquinaria.length > 0) {
                for (const item of usosMaquinaria) {
                    // Validate machine exists
                    const machine = await tx.maquinaria.findUnique({ where: { id: item.maquinaId } })
                    if (!machine) throw new Error(`Maquinaria no encontrada: ${item.maquinaId}`)

                    // Create Usage Record
                    await tx.usoMaquinaria.create({
                        data: {
                            fincaId: fincaId,
                            maquinaId: item.maquinaId,
                            tareaId: id,
                            operador: "N/A", // We don't have operator field in form yet, default to N/A or derive
                            fechaInicio: new Date(),
                            fechaFin: new Date(new Date().getTime() + (item.horas * 60 * 60 * 1000)), // Approximate end time
                            horasUso: item.horas,
                            observaciones: `Uso registrado en ejecución de tarea`
                        }
                    })

                    // Optional: Update machine hour meter if we tracked it?
                    // if (machine.horometroActual) ...
                }
            }
        })
    } catch (error: any) {
        console.error("Failed to execute tarea:", error)
        return { error: error.message || "Error al registrar ejecución." }
    }

    revalidatePath('/tareas')
    revalidatePath('/almacen')
    redirect('/tareas')
}
