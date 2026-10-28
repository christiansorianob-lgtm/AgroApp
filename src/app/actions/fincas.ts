'use server'

import { db } from "@/lib/db"
import { parseFechaCalendario } from "@/lib/utils"
import { getAllFincas } from "@/services/fincas"
import { buildLinderoData, sameGeometry } from "@/services/linderos"
import type { BoundaryValue } from "@/lib/geo"
import { revalidatePath } from "next/cache"

export interface FincaInput {
    nombre: string
    departamento: string
    municipio: string
    veredaSector: string
    responsable: string
    /** Área según escritura o registro. Si se omite se usa el área medida del lindero. */
    areaTotalHa?: number | null
    observaciones?: string | null
    estado?: "ACTIVO" | "INACTIVO"
    logo?: string | null
    fotos?: string[]
    createdAt?: string | null
    /** Punto de referencia cuando aún no hay lindero (con lindero se usa su centroide). */
    ubicacion?: { lat: number; lng: number } | null
    /** undefined = sin cambios, null = borrar lindero */
    lindero?: BoundaryValue | null
}

function ubicacionData(input: FincaInput) {
    if (input.lindero || !input.ubicacion) return {}
    const { lat, lng } = input.ubicacion
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitud: lat, longitud: lng } : {}
}

export async function getFincas() {
    try {
        const fincas = await getAllFincas()
        return { data: fincas }
    } catch (error) {
        console.error("Failed to fetch fincas:", error)
        return { error: "Error al cargar las fincas." }
    }
}

function validate(input: FincaInput): string | null {
    if (!input.nombre?.trim()) return "El nombre de la finca es obligatorio."
    if (!input.departamento || !input.municipio) return "Seleccione departamento y municipio."
    if (!input.veredaSector?.trim()) return "La vereda o sector es obligatoria."
    if (!input.responsable?.trim()) return "Indique el responsable o administrador."
    if (input.areaTotalHa != null && (!Number.isFinite(input.areaTotalHa) || input.areaTotalHa <= 0)) {
        return "El área total debe ser un número mayor que cero."
    }
    return null
}

async function nextFincaCode() {
    const codes = await db.finca.findMany({ select: { codigo: true } })
    const max = codes.reduce((n, { codigo }) => {
        const num = parseInt(codigo.replace(/^FIN-/, ""), 10)
        return Number.isFinite(num) && num > n ? num : n
    }, 0)
    return `FIN-${String(max + 1).padStart(3, "0")}`
}

export async function createFinca(input: FincaInput): Promise<{ data?: { id: string }; error?: string }> {
    const invalid = validate(input)
    if (invalid) return { error: invalid }

    try {
        const { data: geo, levantamiento } = buildLinderoData(input.lindero ?? undefined)
        const areaTotalHa = input.areaTotalHa ?? (geo as any).areaMedidaHa
        if (!areaTotalHa) return { error: "Indique el área total o defina el lindero en el mapa." }

        const finca = await db.finca.create({
            data: {
                codigo: await nextFincaCode(),
                nombre: input.nombre.trim(),
                departamento: input.departamento,
                municipio: input.municipio,
                veredaSector: input.veredaSector.trim(),
                responsable: input.responsable.trim(),
                areaTotalHa,
                observaciones: input.observaciones?.trim() || null,
                estado: input.estado || "ACTIVO",
                logo: input.logo || null,
                fotos: input.fotos?.length ? JSON.stringify(input.fotos) : null,
                createdAt: parseFechaCalendario(input.createdAt) ?? undefined,
                ...ubicacionData(input),
                ...geo,
                levantamientos: levantamiento ? { create: { ...levantamiento, realizadoPor: input.responsable } } : undefined,
            },
        })
        revalidatePath("/fincas")
        return { data: { id: finca.id } }
    } catch (error: any) {
        console.error("Failed to create finca:", error)
        return { error: error.message || "Error al crear la finca." }
    }
}

export async function updateFinca(id: string, input: FincaInput): Promise<{ success?: boolean; error?: string }> {
    const invalid = validate(input)
    if (invalid) return { error: invalid }

    try {
        const current = await db.finca.findUnique({ where: { id }, select: { geometria: true, areaTotalHa: true } })
        if (!current) return { error: "La finca no existe." }

        // Solo se registra un levantamiento nuevo si el lindero realmente cambió.
        const changed = input.lindero !== undefined &&
            !(input.lindero && sameGeometry(current.geometria, input.lindero.geometria as any))
        const { data: geo, levantamiento } = buildLinderoData(changed ? input.lindero : undefined)

        await db.finca.update({
            where: { id },
            data: {
                nombre: input.nombre.trim(),
                departamento: input.departamento,
                municipio: input.municipio,
                veredaSector: input.veredaSector.trim(),
                responsable: input.responsable.trim(),
                areaTotalHa: input.areaTotalHa ?? (geo as any).areaMedidaHa ?? current.areaTotalHa,
                observaciones: input.observaciones?.trim() || null,
                estado: input.estado || undefined,
                logo: input.logo || null,
                fotos: input.fotos?.length ? JSON.stringify(input.fotos) : null,
                createdAt: parseFechaCalendario(input.createdAt) ?? undefined,
                ...ubicacionData(input),
                ...geo,
                levantamientos: levantamiento ? { create: { ...levantamiento, realizadoPor: input.responsable } } : undefined,
            },
        })
        revalidatePath("/fincas")
        revalidatePath(`/fincas/${id}`)
        return { success: true }
    } catch (error: any) {
        console.error("Failed to update finca:", error)
        return { error: error.message || "Error al actualizar la finca." }
    }
}
