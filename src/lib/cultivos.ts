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
