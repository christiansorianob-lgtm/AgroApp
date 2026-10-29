'use server'

import { db } from "@/lib/db"
import { parseFechaCalendario } from "@/lib/utils"
import { buildLinderoData, sameGeometry } from "@/services/linderos"
import type { BoundaryValue } from "@/lib/geo"
import { revalidatePath } from "next/cache"

export interface LoteInput {
    fincaId: string
    nombre: string
    /** Área productiva registrada. Si se omite se usa el área medida del lindero. */
    areaHa?: number | null
    tipoCultivo: string
    especie?: string | null
    variedad?: string | null
    casaGenetica?: string | null
    fechaSiembra?: string | null
    estado?: "ACTIVO" | "INACTIVO" | "EN_RENOVACION"
    observaciones?: string | null
    ubicacion?: { lat: number; lng: number } | null
    /** undefined = sin cambios, null = borrar lindero */
    lindero?: BoundaryValue | null
}

export async function getLotes() {
    try {
        const lotes = await db.lote.findMany({
            include: { finca: { select: { id: true, nombre: true, codigo: true } } },
            orderBy: [{ finca: { nombre: "asc" } }, { codigo: "asc" }],
        })
        return { data: lotes }
    } catch (error) {
        console.error("Failed to fetch lotes:", error)
        return { error: "Error al cargar los lotes." }
    }
}

export async function getLoteById(id: string) {
    try {
        const lote = await db.lote.findUnique({
            where: { id },
            include: {
                finca: { include: { lotes: { select: { id: true, nombre: true, codigo: true, geometria: true, tipoCultivo: true, areaHa: true } } } },
                levantamientos: { orderBy: { createdAt: "desc" }, take: 10 },
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
    if (!input.tipoCultivo) return "Seleccione el tipo de cultivo."
    if (input.areaHa != null && (!Number.isFinite(input.areaHa) || input.areaHa <= 0)) {
        return "El área debe ser un número mayor que cero."
    }
    return null
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
        const { data: geo, levantamiento } = buildLinderoData(input.lindero ?? undefined)
        const areaHa = input.areaHa ?? (geo as any).areaMedidaHa
        if (!areaHa) return { error: "Indique el área del lote o defina su lindero en el mapa." }

        const lote = await db.lote.create({
            data: {
                fincaId: input.fincaId,
                codigo: await nextLoteCode(input.fincaId), // siempre automático, no editable
                nombre: input.nombre.trim(),
                areaHa,
                tipoCultivo: input.tipoCultivo,
                especie: input.especie || null,
                variedad: input.variedad || null,
                casaGenetica: input.casaGenetica || null,
                fechaSiembra: parseFechaCalendario(input.fechaSiembra),
                estado: input.estado || "ACTIVO",
                observaciones: input.observaciones?.trim() || null,
                ...ubicacionData(input),
                ...geo,
                levantamientos: levantamiento ? { create: { ...levantamiento, fincaId: input.fincaId } } : undefined,
            },
        })
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
        const current = await db.lote.findUnique({ where: { id }, select: { geometria: true, areaHa: true, fincaId: true } })
        if (!current) return { error: "El lote no existe." }

        const changed = input.lindero !== undefined &&
            !(input.lindero && sameGeometry(current.geometria, input.lindero.geometria as any))
        const { data: geo, levantamiento } = buildLinderoData(changed ? input.lindero : undefined)

        await db.lote.update({
            where: { id },
            data: {
                nombre: input.nombre.trim(),
                areaHa: input.areaHa ?? (geo as any).areaMedidaHa ?? current.areaHa,
                tipoCultivo: input.tipoCultivo,
                especie: input.especie || null,
                variedad: input.variedad || null,
                casaGenetica: input.casaGenetica || null,
                fechaSiembra: parseFechaCalendario(input.fechaSiembra),
                estado: input.estado || undefined,
                observaciones: input.observaciones?.trim() || null,
                ...ubicacionData(input),
                ...geo,
                levantamientos: levantamiento ? { create: { ...levantamiento, fincaId: current.fincaId } } : undefined,
            },
        })
        revalidatePath("/lotes")
        revalidatePath(`/lotes/${id}`)
        revalidatePath(`/fincas/${current.fincaId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Failed to update lote:", error)
        return { error: friendlyError(error, "Error al actualizar el lote.") }
    }
}
