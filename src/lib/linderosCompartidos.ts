// Linderos compartidos: cuando un lindero nuevo pasa por el lindero de un lote vecino o por el
// límite de la finca, sus puntos se "pegan" a ese lindero y el tramo entre dos puntos pegados al
// mismo lindero sigue su trazado exacto en lugar de una línea recta. Así los lotes vecinos quedan
// sin huecos ni traslapes.

import type { Position } from "geojson"
import type { BoundaryGeometry } from "./geo"

export interface LinderoReferencia {
    nombre: string
    geometria: BoundaryGeometry
}

export interface PuntoEntrada {
    lat: number
    lng: number
    /** Precisión GPS en metros; amplía la tolerancia del pegado */
    acc?: number | null
}

export interface ResultadoAjuste {
    /** Anillo resultante [lng, lat], sin repetir el primer punto al final */
    coords: Position[]
    /** Cuántos de los puntos originales quedaron pegados a un lindero existente */
    puntosPegados: number
    /** Tramos que siguen un lindero existente, con el nombre del lindero */
    tramos: { nombre: string; longitudM: number }[]
}

interface Anillo {
    nombre: string
    coords: Position[] // cerrado: el último igual al primero
    acumulado: number[] // distancia acumulada (m) hasta cada vértice
    longitud: number
}

interface Pegado {
    anillo: number
    /** Distancia (m) a lo largo del anillo hasta el punto pegado */
    pos: number
    coord: Position
}

// Proyección local equirectangular: suficiente para distancias de pocos kilómetros
const M_LAT = 110574
const mLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180)

function distM(a: Position, b: Position): number {
    const k = mLng((a[1] + b[1]) / 2)
    return Math.hypot((b[0] - a[0]) * k, (b[1] - a[1]) * M_LAT)
}

function anillosDe(refs: LinderoReferencia[]): Anillo[] {
    const out: Anillo[] = []
    for (const r of refs) {
        const polys = r.geometria.type === "Polygon" ? [r.geometria.coordinates] : r.geometria.coordinates
        for (const poly of polys) {
            const ring = poly[0]
            if (!ring || ring.length < 4) continue
            const acumulado = [0]
            for (let i = 1; i < ring.length; i++) acumulado.push(acumulado[i - 1] + distM(ring[i - 1], ring[i]))
            out.push({ nombre: r.nombre, coords: ring, acumulado, longitud: acumulado[acumulado.length - 1] })
        }
    }
    return out
}

/** Punto más cercano de un anillo a `p`, con su distancia y su posición a lo largo del anillo. */
function masCercano(an: Anillo, p: Position): { dist: number; pos: number; coord: Position } {
    let mejor = { dist: Infinity, pos: 0, coord: p }
    const k = mLng(p[1])
    for (let i = 0; i < an.coords.length - 1; i++) {
        const a = an.coords[i], b = an.coords[i + 1]
        const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * M_LAT
        const bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * M_LAT
        const dx = bx - ax, dy = by - ay
        const len2 = dx * dx + dy * dy
        const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
        const cx = ax + t * dx, cy = ay + t * dy
        const d = Math.hypot(cx, cy)
        if (d < mejor.dist) {
            mejor = {
                dist: d,
                pos: an.acumulado[i] + t * (an.acumulado[i + 1] - an.acumulado[i]),
                coord: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
            }
        }
    }
    return mejor
}

/** Vértices del anillo entre dos posiciones, por el camino más corto; null si no conviene seguirlo. */
function tramoEntre(an: Anillo, a: Pegado, b: Pegado): { coords: Position[]; longitud: number } | null {
    const L = an.longitud
    const adelante = ((b.pos - a.pos) % L + L) % L
    const atras = L - adelante
    const haciaAdelante = adelante <= atras
    const longitud = Math.min(adelante, atras)
    const n = an.coords.length - 1
    const verts: { d: number; c: Position }[] = []
    for (let i = 0; i < n; i++) {
        const d = haciaAdelante
            ? ((an.acumulado[i] - a.pos) % L + L) % L
            : ((a.pos - an.acumulado[i]) % L + L) % L
        if (d > 0.01 && d < longitud - 0.01) verts.push({ d, c: an.coords[i] })
    }
    verts.sort((x, y) => x.d - y.d)
    return { coords: verts.map(v => v.c), longitud }
}

/**
 * Ajusta un recorrido a los linderos existentes.
 * @param toleranciaM distancia máxima para pegar un punto a un lindero (se amplía con la precisión GPS)
 */
export function ajustarALinderos(puntos: PuntoEntrada[], referencias: LinderoReferencia[], toleranciaM: number): ResultadoAjuste {
    const base: ResultadoAjuste = { coords: puntos.map(p => [p.lng, p.lat]), puntosPegados: 0, tramos: [] }
    const anillos = anillosDe(referencias)
    if (puntos.length < 2 || anillos.length === 0) return base

    // 1. Pegar cada punto al lindero más cercano dentro de la tolerancia
    const pegados: (Pegado | null)[] = puntos.map(p => {
        const tol = Math.min(Math.max(toleranciaM, (p.acc ?? 0) * 1.5), 30)
        let mejor: (Pegado & { dist: number }) | null = null
        anillos.forEach((an, idx) => {
            const c = masCercano(an, [p.lng, p.lat])
            if (c.dist <= tol && (!mejor || c.dist < mejor.dist)) mejor = { anillo: idx, pos: c.pos, coord: c.coord, dist: c.dist }
        })
        return mejor
    })

    // 2. Entre dos puntos pegados al mismo lindero, seguir su trazado
    const coords: Position[] = []
    const tramos: ResultadoAjuste["tramos"] = []
    const n = puntos.length
    for (let i = 0; i < n; i++) {
        const a = pegados[i]
        coords.push(a ? a.coord : [puntos[i].lng, puntos[i].lat])
        const j = (i + 1) % n
        if (j === 0 && n < 3) break // con 2 puntos no hay tramo de cierre
        const b = pegados[j]
        if (!a || !b || a.anillo !== b.anillo) continue
        const an = anillos[a.anillo]
        const t = tramoEntre(an, a, b)
        if (!t) continue
        // Si el tramo por el lindero es mucho más largo que la línea recta y el punto medio de la
        // recta queda lejos del lindero, el usuario probablemente cortó por dentro: no se sigue.
        const recta = distM(a.coord, b.coord)
        if (t.longitud > recta * 1.15) {
            const medio: Position = [(a.coord[0] + b.coord[0]) / 2, (a.coord[1] + b.coord[1]) / 2]
            if (masCercano(an, medio).dist > Math.max(toleranciaM * 2, recta * 0.35)) continue
        }
        if (t.coords.length) coords.push(...t.coords)
        tramos.push({ nombre: an.nombre, longitudM: t.longitud })
    }

    // Quitar duplicados consecutivos (dos puntos pegados al mismo vértice)
    const limpio = coords.filter((c, i) => i === 0 || distM(c, coords[i - 1]) > 0.05)
    if (limpio.length > 1 && distM(limpio[0], limpio[limpio.length - 1]) <= 0.05) limpio.pop()

    return { coords: limpio, puntosPegados: pegados.filter(Boolean).length, tramos }
}
