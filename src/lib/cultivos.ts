// Presentación de la clasificación genética de un lote.

export const GRUPOS_OPCION = ["Sanidad", "Calidad del aceite", "Ciclo de vida", "Otro"] as const

export interface MaterialLote {
    variedad?: string | null
    opcionesGeneticas?: string[] | null
    nombreComercial?: string | null
    casaGenetica?: string | null
}

/** "Deli x La Mé #S #PC (Alta Extracción) — PalmElit" */
export function describirMaterial(m: MaterialLote, { conCasa = true } = {}): string {
    const codigos = m.opcionesGeneticas ?? []
    const base = [m.variedad, ...codigos].filter(Boolean).join(" ")
    // Si el nombre comercial repite los códigos ("#S Alta Extracción"), se muestra solo lo nuevo
    const limpio = (m.nombreComercial ?? "").split(/\s+/).filter(p => p && !codigos.includes(p)).join(" ")
    const comercial = limpio && !base.includes(limpio) ? ` (${limpio})` : ""
    const casa = conCasa && m.casaGenetica ? ` — ${m.casaGenetica}` : ""
    return `${base}${comercial}${casa}`.trim()
}

// ── Finalidad del lote ──

export type Finalidad = "SIEMBRA" | "VIVERO" | "INFRAESTRUCTURA" | "CONSERVACION" | "OTRO"

export const FINALIDADES: { valor: Finalidad; nombre: string; descripcion: string }[] = [
    { valor: "SIEMBRA", nombre: "Siembra", descripcion: "Cultivo establecido: palma, frutales, pastos…" },
    { valor: "VIVERO", nombre: "Vivero", descripcion: "Producción de plántulas de uno o varios materiales." },
    { valor: "INFRAESTRUCTURA", nombre: "Infraestructura", descripcion: "Casa de finca, bodega, campamento, vías…" },
    { valor: "CONSERVACION", nombre: "Conservación", descripcion: "Bosque, reserva, ronda de agua." },
    { valor: "OTRO", nombre: "Otro uso", descripcion: "Cualquier otro uso del área." },
]

export const NOMBRE_FINALIDAD: Record<Finalidad, string> = Object.fromEntries(FINALIDADES.map(f => [f.valor, f.nombre])) as Record<Finalidad, string>

export const USOS_INFRAESTRUCTURA = ["Casa de finca", "Campamento", "Bodega", "Taller", "Centro de acopio", "Vías", "Reservorio", "Corrales"]

export type EtapaVivero = "PREVIVERO" | "VIVERO" | "LISTA_SIEMBRA"
export const ETAPAS_VIVERO: { valor: EtapaVivero; nombre: string }[] = [
    { valor: "PREVIVERO", nombre: "Previvero" },
    { valor: "VIVERO", nombre: "Vivero" },
    { valor: "LISTA_SIEMBRA", nombre: "Lista para siembra" },
]
export const NOMBRE_ETAPA: Record<EtapaVivero, string> = { PREVIVERO: "Previvero", VIVERO: "Vivero", LISTA_SIEMBRA: "Lista para siembra" }

export const formatEntero = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-CO"))

interface LoteUso extends MaterialLote {
    finalidad: Finalidad
    usoDetalle?: string | null
    tipoCultivo?: string | null
    especie?: string | null
    materialesVivero?: { cantidad: number }[]
}

/** Resumen corto del uso del lote para listados: "Palma de Aceite · Deli x La Mé #S", "Vivero · 12.000 plantas"… */
export function describirUso(l: LoteUso): { titulo: string; detalle: string } {
    if (l.finalidad === "SIEMBRA") {
        return { titulo: l.tipoCultivo || "Siembra", detalle: [l.especie, describirMaterial(l, { conCasa: false })].filter(Boolean).join(" · ") }
    }
    if (l.finalidad === "VIVERO") {
        const total = (l.materialesVivero ?? []).reduce((s, m) => s + m.cantidad, 0)
        return { titulo: "Vivero", detalle: l.materialesVivero ? `${formatEntero(total)} plantas` : "" }
    }
    return { titulo: NOMBRE_FINALIDAD[l.finalidad], detalle: l.usoDetalle || "" }
}
