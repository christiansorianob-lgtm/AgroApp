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
    const base = [m.variedad, ...(m.opcionesGeneticas ?? [])].filter(Boolean).join(" ")
    const comercial = m.nombreComercial && !base.includes(m.nombreComercial) ? ` (${m.nombreComercial})` : ""
    const casa = conCasa && m.casaGenetica ? ` — ${m.casaGenetica}` : ""
    return `${base}${comercial}${casa}`.trim()
}
