// Movimientos de plantas del vivero: tipos, textos y reglas compartidas entre cliente y servidor.

import { describirMaterial, NOMBRE_ETAPA, type EtapaVivero } from "@/lib/cultivos"

export type TipoMovimientoVivero = "INGRESO" | "VENTA" | "SIEMBRA" | "TRASLADO" | "MORTALIDAD" | "AJUSTE"

export interface InfoTipoMovimiento {
    valor: TipoMovimientoVivero
    nombre: string
    descripcion: string
    /** entrada suma al inventario; salida resta; ajuste puede ir en ambos sentidos */
    sentido: "entrada" | "salida" | "ajuste"
    pideDestino?: boolean
    pideCliente?: boolean
}

export const TIPOS_MOVIMIENTO: InfoTipoMovimiento[] = [
    { valor: "VENTA", nombre: "Venta", descripcion: "Plantas vendidas a un cliente", sentido: "salida", pideCliente: true, pideDestino: true },
    { valor: "SIEMBRA", nombre: "Siembra", descripcion: "Salen a sembrarse en campo", sentido: "salida", pideDestino: true },
    { valor: "TRASLADO", nombre: "Traslado", descripcion: "Salen hacia otro lugar o vivero", sentido: "salida", pideDestino: true },
    { valor: "MORTALIDAD", nombre: "Mortalidad / descarte", descripcion: "Plantas muertas o descartadas", sentido: "salida" },
    { valor: "INGRESO", nombre: "Ingreso", descripcion: "Entran plantas al vivero", sentido: "entrada" },
]

const INFO: Record<TipoMovimientoVivero, InfoTipoMovimiento> = {
    ...Object.fromEntries(TIPOS_MOVIMIENTO.map(t => [t.valor, t])) as Record<TipoMovimientoVivero, InfoTipoMovimiento>,
    AJUSTE: { valor: "AJUSTE", nombre: "Ajuste", descripcion: "Corrección del inventario", sentido: "ajuste" },
}
export const infoMovimiento = (t: TipoMovimientoVivero) => INFO[t]

/** Nombre de la actividad que lleva una tarea de movimiento de vivero. */
export const actividadDeMovimiento = (t: TipoMovimientoVivero) => `Movimiento de vivero · ${INFO[t].nombre}`

export interface RenglonVivero {
    tipoCultivo: string
    especie?: string | null
    variedad?: string | null
    casaGenetica?: string | null
    opcionesGeneticas?: string[]
    etapa: EtapaVivero
    ubicacion?: string | null
}

export const nombreEtapa = (e: EtapaVivero) => NOMBRE_ETAPA[e] ?? e

/** Variedad con sus opciones genéticas: "Deli x La Mé #S". Agrupa los precios de venta. */
export const variedadDe = (m: RenglonVivero) => describirMaterial(m as any, { conCasa: false }) || m.tipoCultivo

/** Renglón completo: "Deli x La Mé #S · Previvero · Ubic. 1". */
export const describirRenglon = (m: RenglonVivero) =>
    [variedadDe(m), nombreEtapa(m.etapa), m.ubicacion ? `Ubic. ${m.ubicacion}` : null].filter(Boolean).join(" · ")

export const formatPesos = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
