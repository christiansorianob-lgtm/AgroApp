// Mensajes de WhatsApp que arma la plataforma. Se abren con un enlace wa.me: el usuario elige
// enviar desde su propio WhatsApp. Todos los mensajes salen de aquí para que tengan el mismo detalle.

/** Número para wa.me: solo dígitos y, si es un celular colombiano de 10 dígitos, con el 57 adelante. */
export function numeroWhatsApp(celular: string | null | undefined): string | null {
    const d = (celular ?? "").replace(/\D/g, "")
    if (d.length === 10 && d.startsWith("3")) return `57${d}`
    if (d.length === 12 && d.startsWith("57")) return d
    return d.length >= 10 ? d : null
}

export function enlaceWhatsApp(celular: string | null | undefined, mensaje: string): string | null {
    const n = numeroWhatsApp(celular)
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null
}

const PRIORIDAD: Record<string, string> = { ALTA: "🔴 Alta", MEDIA: "🟡 Media", BAJA: "🟢 Baja" }

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] || nombre

/** "[INSUMO: Urea] | [DOSIS: 200 g] | Notas" → una línea por dato, legible en WhatsApp. */
function indicacionesLegibles(texto: string | null | undefined): string | null {
    const t = texto?.trim()
    if (!t) return null
    return t.split(/\s*\|\s*/).map(parte => {
        const m = parte.match(/^\[([^:\]]+):\s*([^\]]*)\]$/)
        return m ? `• ${m[1].charAt(0) + m[1].slice(1).toLowerCase()}: ${m[2].trim()}` : parte
    }).join("\n")
}

export interface DatosTareaMensaje {
    responsable: string
    codigo?: string | null
    actividad: string
    finca: string
    /** "L-05 Lote2 Palma"; sin lote es una tarea de toda la finca */
    lote?: string | null
    fecha: string
    prioridad: string
    indicaciones?: string | null
    /** Detalle extra, p. ej. qué registrar en un movimiento de plantas */
    nota?: string | null
    /** Dirección para abrir la tarea en la plataforma */
    enlace?: string | null
}

/** Aviso al responsable de una tarea nueva, con todo lo que necesita para hacerla. */
export function mensajeTareaAsignada(t: DatosTareaMensaje): string {
    return [
        `Hola ${primerNombre(t.responsable)}, se te asignó una nueva tarea en AgroApp:`,
        "",
        `*${[t.codigo, t.actividad].filter(Boolean).join(" · ")}*`,
        `📍 ${t.finca} · ${t.lote || "Toda la finca"}`,
        `📅 Fecha: ${t.fecha}`,
        `⚡ Prioridad: ${PRIORIDAD[t.prioridad] ?? t.prioridad}`,
        indicacionesLegibles(t.indicaciones) ? `\n📝 *Indicaciones:*\n${indicacionesLegibles(t.indicaciones)}` : null,
        t.nota ? `\nℹ️ ${t.nota}` : null,
        t.enlace ? `\nÁbrela aquí para ver el detalle y responderla:\n${t.enlace}` : null,
        t.enlace ? "Ingresa con tu celular y tu contraseña." : null,
    ].filter(l => l !== null).join("\n")
}

export interface DatosPlanMensaje extends Omit<DatosTareaMensaje, "codigo" | "fecha"> {
    cantidad: number
    cadaDias: number
    desde: string
    hasta: string
}

/** Aviso de un plan de tareas repetidas (p. ej. plan de fertilización). */
export function mensajePlanAsignado(p: DatosPlanMensaje): string {
    return [
        `Hola ${primerNombre(p.responsable)}, se te asignó un plan de *${p.cantidad} tareas* en AgroApp:`,
        "",
        `*${p.actividad}*`,
        `📍 ${p.finca} · ${p.lote || "Toda la finca"}`,
        `📅 Cada ${p.cadaDias} días, del ${p.desde} al ${p.hasta}`,
        `⚡ Prioridad: ${PRIORIDAD[p.prioridad] ?? p.prioridad}`,
        indicacionesLegibles(p.indicaciones) ? `\n📝 *Indicaciones:*\n${indicacionesLegibles(p.indicaciones)}` : null,
        p.enlace ? `\nMíralas en "Mis tareas":\n${p.enlace}` : null,
        p.enlace ? "Ingresa con tu celular y tu contraseña." : null,
    ].filter(l => l !== null).join("\n")
}
