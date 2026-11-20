'use server'

import { exigirGestor } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseFechaCalendario } from "@/lib/utils"
import { buildLinderoData, sameGeometry } from "@/services/linderos"
import type { BoundaryValue } from "@/lib/geo"
import type { Sesion } from "@/lib/sesion"
import { aplicarMovimiento, type LineaMovimiento } from "@/lib/inventarioVivero"
import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

export interface LoteInput {
    fincaId: string
    nombre: string
    /** Área productiva registrada. Si se omite se usa el área medida del lindero. */
    areaHa?: number | null
    finalidad: FinalidadLote
    /** Detalle del uso no productivo: "Casa de finca", "Bodega"… */
    usoDetalle?: string | null
    /** Solo para SIEMBRA */
    tipoCultivo?: string | null
    numeroPlantas?: number | null
    /** Solo para VIVERO: reemplaza todo el inventario del vivero */
    materialesVivero?: MaterialViveroInput[]
    especie?: string | null
    variedad?: string | null
    casaGenetica?: string | null
    opcionesGeneticas?: string[]
    nombreComercial?: string | null
    fechaSiembra?: string | null
    estado?: "ACTIVO" | "INACTIVO" | "EN_RENOVACION"
    observaciones?: string | null
    ubicacion?: { lat: number; lng: number } | null
    /** undefined = sin cambios, null = borrar lindero */
    lindero?: BoundaryValue | null
}

export type FinalidadLote = "SIEMBRA" | "VIVERO" | "INFRAESTRUCTURA" | "CONSERVACION" | "OTRO"

export interface MaterialViveroInput {
    /** Renglón existente; sin id es un renglón nuevo */
    id?: string | null
    tipoCultivo: string
    especie?: string | null
    variedad?: string | null
    casaGenetica?: string | null
    opcionesGeneticas?: string[]
    etapa: "PREVIVERO" | "VIVERO" | "LISTA_SIEMBRA"
    ubicacion?: string | null
    cantidad: number
    fechaIngreso?: string | null
    observaciones?: string | null
}

export async function getLotes() {
    await exigirGestor()
    try {
        const lotes = await db.lote.findMany({
            include: { finca: { select: { id: true, nombre: true, codigo: true } }, materialesVivero: { select: { cantidad: true } } },
            orderBy: [{ finca: { nombre: "asc" } }, { codigo: "asc" }],
        })
        return { data: lotes }
    } catch (error) {
        console.error("Failed to fetch lotes:", error)
        return { error: "Error al cargar los lotes." }
    }
}

export async function getLoteById(id: string) {
    await exigirGestor()
    try {
        const lote = await db.lote.findUnique({
            where: { id },
            include: {
                finca: { include: { lotes: { select: { id: true, nombre: true, codigo: true, geometria: true, tipoCultivo: true, areaHa: true } } } },
                levantamientos: { orderBy: { createdAt: "desc" }, take: 10 },
                materialesVivero: { orderBy: [{ etapa: "asc" }, { ubicacion: "asc" }, { tipoCultivo: "asc" }, { variedad: "asc" }] },
            },
        })
        return { data: lote }
    } catch (error) {
        console.error("Failed to fetch lote:", error)
        return { error: "Error al cargar el lote." }
    }
}

function validate(input: LoteInput): string | null {
    if (!input.fincaId) return "Seleccione la finca a la que pertenece el lote."
    if (!input.nombre?.trim()) return "El nombre del lote es obligatorio."
    switch (input.finalidad) {
        case "SIEMBRA":
            if (!input.tipoCultivo) return "Seleccione el tipo de cultivo."
            if (!input.numeroPlantas || !Number.isInteger(input.numeroPlantas) || input.numeroPlantas <= 0) {
                return "Indique cuántas plantas tiene el lote (número entero mayor que cero)."
            }
            break
        case "VIVERO": {
            const mats = input.materialesVivero ?? []
            if (mats.length === 0) return "Agregue al menos un material al inventario del vivero."
            // Un renglón puede quedar en 0 después de ventas o siembras; uno nuevo debe traer plantas
            const malo = mats.findIndex(m => !m.tipoCultivo || !Number.isInteger(m.cantidad) || m.cantidad < 0 || (!m.id && m.cantidad === 0))
            if (malo >= 0) return `Revise la fila ${malo + 1} del vivero: cultivo y cantidad (número entero) son obligatorios.`
            break
        }
        case "INFRAESTRUCTURA":
            if (!input.usoDetalle?.trim()) return "Indique qué infraestructura hay en el lote (p. ej. Casa de finca)."
            break
    }
    if (input.areaHa != null && (!Number.isFinite(input.areaHa) || input.areaHa <= 0)) {
        return "El área debe ser un número mayor que cero."
    }
    return null
}

/** Campos del lote según su finalidad: lo que no aplica se deja vacío. */
function finalidadData(input: LoteInput) {
    const siembra = input.finalidad === "SIEMBRA"
    return {
        finalidad: input.finalidad,
        usoDetalle: siembra ? null : input.usoDetalle?.trim() || null,
        tipoCultivo: siembra ? input.tipoCultivo || null : null,
        especie: siembra ? input.especie || null : null,
        variedad: siembra ? input.variedad || null : null,
        casaGenetica: siembra ? input.casaGenetica || null : null,
        opcionesGeneticas: siembra ? input.opcionesGeneticas ?? [] : [],
        nombreComercial: siembra ? input.nombreComercial?.trim() || null : null,
        numeroPlantas: siembra ? input.numeroPlantas ?? null : null,
        fechaSiembra: siembra ? parseFechaCalendario(input.fechaSiembra) : null,
    }
}

/** Datos descriptivos de un renglón del vivero (sin la cantidad, que se mueve con movimientos). */
function descripcionMaterial(m: MaterialViveroInput) {
    return {
        tipoCultivo: m.tipoCultivo,
        especie: m.especie || null,
        variedad: m.variedad || null,
        casaGenetica: m.casaGenetica || null,
        opcionesGeneticas: m.opcionesGeneticas ?? [],
        etapa: m.etapa,
        ubicacion: m.ubicacion?.trim() || null,
        fechaIngreso: parseFechaCalendario(m.fechaIngreso),
        observaciones: m.observaciones?.trim() || null,
    }
}

/**
 * Lleva el inventario del vivero a lo que muestra el formulario sin perder la historia: cada renglón
 * conserva su id, y las diferencias de cantidad quedan como movimientos (INGRESO para renglones
 * nuevos, AJUSTE para cambios o renglones quitados). Si el lote deja de ser vivero, se vacía.
 */
async function sincronizarInventario(tx: Prisma.TransactionClient, loteId: string, input: LoteInput, sesion: Sesion) {
    const actuales = await tx.loteViveroMaterial.findMany({ where: { loteId } })
    const deseados = input.finalidad === "VIVERO" ? input.materialesVivero ?? [] : []
    const quien = { registradoPorId: sesion.uid, registradoPor: sesion.nombre }
    const ahora = new Date()

    const ingresos: LineaMovimiento[] = []
    const ajustes: LineaMovimiento[] = []
    const quitar: string[] = []

    for (const m of actuales) {
        const d = deseados.find(x => x.id === m.id)
        if (!d) {
            if (m.cantidad > 0) ajustes.push({ materialId: m.id, cantidad: 0, delta: -m.cantidad })
            quitar.push(m.id)
            continue
        }
        await tx.loteViveroMaterial.update({ where: { id: m.id }, data: descripcionMaterial(d) })
        if (d.cantidad !== m.cantidad) ajustes.push({ materialId: m.id, cantidad: 0, delta: d.cantidad - m.cantidad })
    }
    for (const d of deseados.filter(x => !x.id || !actuales.some(m => m.id === x.id))) {
        const nuevo = await tx.loteViveroMaterial.create({ data: { loteId, ...descripcionMaterial(d), cantidad: 0 } })
        ingresos.push({ materialId: nuevo.id, cantidad: d.cantidad })
    }

    if (ingresos.length) {
        await aplicarMovimiento(tx, { loteId, tipo: "INGRESO", fecha: ahora, observaciones: "Registrado desde la ficha del lote", ...quien }, ingresos)
    }
    if (ajustes.length) {
        const motivo = input.finalidad === "VIVERO" ? "Corrección desde la ficha del lote" : "El lote dejó de ser vivero"
        await aplicarMovimiento(tx, { loteId, tipo: "AJUSTE", fecha: ahora, observaciones: motivo, ...quien }, ajustes)
    }
    if (quitar.length) await tx.loteViveroMaterial.deleteMany({ where: { id: { in: quitar } } })
}

function ubicacionData(input: LoteInput) {
    if (input.lindero || !input.ubicacion) return {}
    const { lat, lng } = input.ubicacion
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitud: lat, longitud: lng } : {}
}

async function nextLoteCode(fincaId: string) {
    const codes = await db.lote.findMany({ where: { fincaId }, select: { codigo: true } })
    const max = codes.reduce((n, { codigo }) => {
        const num = parseInt(codigo.replace(/^L-/, ""), 10)
        return Number.isFinite(num) && num > n ? num : n
    }, 0)
    return `L-${String(max + 1).padStart(2, "0")}`
}

function friendlyError(error: any, fallback: string) {
    if (error?.code === "P2002") return "Ya existe un lote con ese código en esta finca."
    return error?.message || fallback
}

export async function createLote(input: LoteInput): Promise<{ data?: { id: string }; error?: string }> {
    const invalid = validate(input)
    if (invalid) return { error: invalid }

    try {
        const sesion = await exigirGestor()
        const { data: geo, levantamiento } = buildLinderoData(input.lindero ?? undefined)
        const areaHa = input.areaHa ?? (geo as any).areaMedidaHa
        if (!areaHa) return { error: "Indique el área del lote o defina su lindero en el mapa." }

        const codigo = await nextLoteCode(input.fincaId) // siempre automático, no editable
        const lote = await db.$transaction(async tx => {
            const l = await tx.lote.create({
                data: {
                    fincaId: input.fincaId,
                    codigo,
                    nombre: input.nombre.trim(),
                    areaHa,
                    ...finalidadData(input),
                    estado: input.estado || "ACTIVO",
                    observaciones: input.observaciones?.trim() || null,
                    ...ubicacionData(input),
                    ...geo,
                    levantamientos: levantamiento ? { create: { ...levantamiento, fincaId: input.fincaId } } : undefined,
                },
            })
            // El inventario inicial del vivero queda como un ingreso
            await sincronizarInventario(tx, l.id, input, sesion)
            return l
        }, { timeout: 30_000 })
        revalidatePath("/lotes")
        revalidatePath(`/fincas/${input.fincaId}`)
        return { data: { id: lote.id } }
    } catch (error: any) {
        console.error("Failed to create lote:", error)
        return { error: friendlyError(error, "Error al crear el lote.") }
    }
}

export async function updateLote(id: string, input: LoteInput): Promise<{ success?: boolean; error?: string }> {
    const invalid = validate(input)
    if (invalid) return { error: invalid }

    try {
        const sesion = await exigirGestor()
        const current = await db.lote.findUnique({ where: { id }, select: { geometria: true, areaHa: true, fincaId: true } })
        if (!current) return { error: "El lote no existe." }

        const changed = input.lindero !== undefined &&
            !(input.lindero && sameGeometry(current.geometria, input.lindero.geometria as any))
        const { data: geo, levantamiento } = buildLinderoData(changed ? input.lindero : undefined)

        await db.$transaction(async tx => {
            await tx.lote.update({
                where: { id },
                data: {
                    nombre: input.nombre.trim(),
                    areaHa: input.areaHa ?? (geo as any).areaMedidaHa ?? current.areaHa,
                    ...finalidadData(input),
                    estado: input.estado || undefined,
                    observaciones: input.observaciones?.trim() || null,
                    ...ubicacionData(input),
                    ...geo,
                    levantamientos: levantamiento ? { create: { ...levantamiento, fincaId: current.fincaId } } : undefined,
                },
            })
            // Las diferencias del inventario del vivero quedan como movimientos
            await sincronizarInventario(tx, id, input, sesion)
        }, { timeout: 30_000 })
        revalidatePath("/lotes")
        revalidatePath(`/lotes/${id}`)
        revalidatePath(`/fincas/${current.fincaId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Failed to update lote:", error)
        return { error: friendlyError(error, "Error al actualizar el lote.") }
    }
}
