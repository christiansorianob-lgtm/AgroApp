// Utilidades de georreferenciación compartidas entre cliente y servidor.
// Todas las geometrías se manejan como GeoJSON en WGS84 con coordenadas [lng, lat].

import {
    area as turfArea,
    length as turfLength,
    centroid as turfCentroid,
    kinks as turfKinks,
    intersect as turfIntersect,
    difference as turfDifference,
    simplify as turfSimplify,
    cleanCoords as turfCleanCoords,
    rewind as turfRewind,
    polygonToLine,
    featureCollection,
    feature,
    bbox as turfBbox,
} from "@turf/turf"
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson"

export type BoundaryGeometry = Polygon | MultiPolygon

export type MetodoGeorreferenciacion = "DIBUJO_MAPA" | "IMPORTACION_ARCHIVO" | "RECORRIDO_GPS"

export const METODO_LABELS: Record<MetodoGeorreferenciacion, string> = {
    DIBUJO_MAPA: "Dibujado sobre el mapa",
    IMPORTACION_ARCHIVO: "Importado de archivo",
    RECORRIDO_GPS: "Recorrido GPS en campo",
}

export interface GpsPoint {
    lat: number
    lng: number
    acc?: number | null
    ts?: number
}

/** Lo que devuelve el editor de linderos y reciben las acciones del servidor. */
export interface BoundaryValue {
    geometria: BoundaryGeometry
    metodo: MetodoGeorreferenciacion
    precisionM?: number | null
    puntosCrudos?: GpsPoint[] | null
    archivoOrigen?: string | null
}

export interface BoundaryMetrics {
    areaHa: number
    areaM2: number
    perimetroM: number
    centroide: { lat: number; lng: number }
    vertices: number
    autointersecciones: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalización
// ─────────────────────────────────────────────────────────────────────────────

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

function isLatLngObj(p: any): p is { lat: number; lng: number } {
    return p && isNum(p.lat) && (isNum(p.lng) || isNum(p.lon))
}

/** Cierra el anillo y elimina vértices consecutivos repetidos. */
function cleanRing(ring: Position[]): Position[] | null {
    const out: Position[] = []
    for (const p of ring) {
        if (!Array.isArray(p) || !isNum(p[0]) || !isNum(p[1])) continue
        const last = out[out.length - 1]
        if (last && last[0] === p[0] && last[1] === p[1]) continue
        out.push([p[0], p[1]])
    }
    if (out.length > 1) {
        const [f, l] = [out[0], out[out.length - 1]]
        if (f[0] === l[0] && f[1] === l[1]) out.pop()
    }
    if (out.length < 3) return null
    return [...out, out[0]]
}

function cleanPolygonCoords(rings: Position[][]): Position[][] | null {
    const cleaned = rings.map(cleanRing)
    if (!cleaned[0]) return null
    return cleaned.filter((r): r is Position[] => r !== null)
}

/** Convierte una línea cerrada (o casi cerrada) en polígono: útil para tracks GPX/KML. */
function lineToPolygonCoords(coords: Position[]): Position[][] | null {
    const ring = cleanRing(coords)
    return ring ? [ring] : null
}

/**
 * Acepta cualquier representación razonable de un lindero y devuelve un Polygon/MultiPolygon limpio:
 * GeoJSON Geometry/Feature/FeatureCollection, líneas cerradas, o el formato antiguo [{lat, lng}].
 */
export function normalizeGeometry(input: unknown): BoundaryGeometry | null {
    if (input == null) return null
    let value: any = input
    if (typeof value === "string") {
        try { value = JSON.parse(value) } catch { return null }
    }

    // Formato antiguo de AgroApp: [{lat, lng}, ...]
    if (Array.isArray(value) && value.length > 0 && isLatLngObj(value[0])) {
        const ring = value.map((p: any) => [p.lng ?? p.lon, p.lat] as Position)
        const coords = cleanPolygonCoords([ring])
        return coords ? rewindGeometry({ type: "Polygon", coordinates: coords }) : null
    }

    if (value.type === "FeatureCollection") {
        const polys = (value.features || [])
            .map((f: Feature) => normalizeGeometry(f))
            .filter(Boolean) as BoundaryGeometry[]
        return mergeGeometries(polys)
    }
    if (value.type === "Feature") return normalizeGeometry(value.geometry)
    if (value.type === "GeometryCollection") {
        return mergeGeometries((value.geometries || []).map(normalizeGeometry).filter(Boolean))
    }

    let geom: BoundaryGeometry | null = null
    switch (value.type) {
        case "Polygon": {
            const c = cleanPolygonCoords(value.coordinates || [])
            geom = c ? { type: "Polygon", coordinates: c } : null
            break
        }
        case "MultiPolygon": {
            const polys = (value.coordinates || []).map(cleanPolygonCoords).filter(Boolean) as Position[][][]
            geom = polys.length === 0 ? null
                : polys.length === 1 ? { type: "Polygon", coordinates: polys[0] }
                    : { type: "MultiPolygon", coordinates: polys }
            break
        }
        case "LineString": {
            const c = lineToPolygonCoords(value.coordinates || [])
            geom = c ? { type: "Polygon", coordinates: c } : null
            break
        }
        case "MultiLineString": {
            const flat = (value.coordinates || []).flat()
            const c = lineToPolygonCoords(flat)
            geom = c ? { type: "Polygon", coordinates: c } : null
            break
        }
    }
    return geom ? rewindGeometry(geom) : null
}

function mergeGeometries(geoms: BoundaryGeometry[]): BoundaryGeometry | null {
    if (geoms.length === 0) return null
    if (geoms.length === 1) return geoms[0]
    const polys: Position[][][] = []
    for (const g of geoms) {
        if (g.type === "Polygon") polys.push(g.coordinates)
        else polys.push(...g.coordinates)
    }
    return { type: "MultiPolygon", coordinates: polys }
}

function rewindGeometry(g: BoundaryGeometry): BoundaryGeometry {
    try {
        return (turfRewind(feature(g) as any) as Feature<BoundaryGeometry>).geometry
    } catch {
        return g
    }
}

/** Polígono a partir de puntos (lat/lng) en el orden en que se tomaron. */
export function polygonFromPoints(points: { lat: number; lng: number }[]): BoundaryGeometry | null {
    return normalizeGeometry(points.map(p => ({ lat: p.lat, lng: p.lng })))
}

// ─────────────────────────────────────────────────────────────────────────────
// Métricas y validación
// ─────────────────────────────────────────────────────────────────────────────

export function computeMetrics(geom: BoundaryGeometry): BoundaryMetrics {
    const f = feature(geom)
    const areaM2 = turfArea(f)
    let perimetroM = 0
    try {
        perimetroM = turfLength(polygonToLine(f as Feature<Polygon>) as any, { units: "kilometers" }) * 1000
    } catch { /* geometría degenerada */ }
    const c = turfCentroid(f).geometry.coordinates
    const vertices = geom.type === "Polygon"
        ? geom.coordinates.reduce((n, r) => n + r.length - 1, 0)
        : geom.coordinates.reduce((n, p) => n + p.reduce((m, r) => m + r.length - 1, 0), 0)
    let autointersecciones = 0
    try { autointersecciones = turfKinks(f as Feature<Polygon>).features.length } catch { /* ignore */ }

    return {
        areaM2,
        areaHa: areaM2 / 10000,
        perimetroM,
        centroide: { lat: c[1], lng: c[0] },
        vertices,
        autointersecciones,
    }
}

export interface ContextoValidacion {
    padre?: { nombre: string; geometria: BoundaryGeometry } | null
    vecinos?: { nombre: string; geometria: BoundaryGeometry }[]
    areaDeclaradaHa?: number | null
}

export interface Advertencia {
    nivel: "error" | "aviso"
    mensaje: string
}

/** Revisa autointersecciones, que el lote quede dentro de la finca, traslapes y diferencia con el área declarada. */
export function validateBoundary(geom: BoundaryGeometry, ctx: ContextoValidacion = {}): Advertencia[] {
    const out: Advertencia[] = []
    const m = computeMetrics(geom)
    const f = feature(geom)

    if (m.autointersecciones > 0) {
        out.push({ nivel: "error", mensaje: `El lindero se cruza consigo mismo en ${m.autointersecciones} punto(s). Corrija los vértices.` })
    }
    if (m.areaM2 < 1) {
        out.push({ nivel: "error", mensaje: "El polígono no tiene área. Revise que tenga al menos 3 vértices distintos." })
    }

    if (ctx.padre?.geometria) {
        try {
            const fuera = turfDifference(featureCollection([f, feature(ctx.padre.geometria)]) as any)
            const fueraHa = fuera ? turfArea(fuera) / 10000 : 0
            if (fueraHa > 0.001 && fueraHa / Math.max(m.areaHa, 1e-9) > 0.005) {
                out.push({
                    nivel: "aviso",
                    mensaje: `${formatHa(fueraHa)} (${((fueraHa / m.areaHa) * 100).toFixed(1)} %) quedan fuera del lindero de ${ctx.padre.nombre}.`,
                })
            }
        } catch { /* geometrías inválidas: ya se reporta arriba */ }
    }

    for (const v of ctx.vecinos || []) {
        try {
            const inter = turfIntersect(featureCollection([f, feature(v.geometria)]) as any)
            const ha = inter ? turfArea(inter) / 10000 : 0
            if (ha > 0.001) out.push({ nivel: "aviso", mensaje: `Se traslapa ${formatHa(ha)} con ${v.nombre}.` })
        } catch { /* ignore */ }
    }

    if (ctx.areaDeclaradaHa && ctx.areaDeclaradaHa > 0 && m.areaHa > 0) {
        const diff = (m.areaHa - ctx.areaDeclaradaHa) / ctx.areaDeclaradaHa
        if (Math.abs(diff) > 0.1) {
            out.push({
                nivel: "aviso",
                mensaje: `El área medida (${formatHa(m.areaHa)}) difiere ${(diff * 100).toFixed(0)} % del área registrada (${formatHa(ctx.areaDeclaradaHa)}).`,
            })
        }
    }
    return out
}

/** Reduce el ruido de un recorrido GPS. toleranciaM es la desviación máxima permitida en metros. */
export function simplifyGeometry(geom: BoundaryGeometry, toleranciaM: number): BoundaryGeometry {
    // simplify trabaja en grados: 1° de latitud ≈ 111 320 m
    const tolerance = toleranciaM / 111320
    try {
        const cleaned = turfCleanCoords(feature(geom))
        const s = turfSimplify(cleaned, { tolerance, highQuality: true, mutate: false })
        return normalizeGeometry(s.geometry) || geom
    } catch {
        return geom
    }
}

export function geometryBounds(geoms: (BoundaryGeometry | null | undefined)[]): [[number, number], [number, number]] | null {
    const valid = geoms.filter(Boolean) as BoundaryGeometry[]
    if (valid.length === 0) return null
    const [minX, minY, maxX, maxY] = turfBbox(featureCollection(valid.map(g => feature(g))))
    return [[minY, minX], [maxY, maxX]]
}

// ─────────────────────────────────────────────────────────────────────────────
// Importación de archivos y texto
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidatoImportado {
    id: string
    nombre: string
    geometria: BoundaryGeometry
    areaHa: number
}

function candidatesFromCollection(fc: FeatureCollection, fallbackName: string): CandidatoImportado[] {
    const out: CandidatoImportado[] = []
    fc.features.forEach((f, i) => {
        const g = normalizeGeometry(f.geometry as Geometry)
        if (!g) return
        const props: any = f.properties || {}
        const nombre = props.name || props.nombre || props.NOMBRE || props.Name || props.title || `${fallbackName} ${i + 1}`
        out.push({ id: `${i}`, nombre: String(nombre), geometria: g, areaHa: computeMetrics(g).areaHa })
    })
    return out
}

/**
 * Interpreta texto pegado: GeoJSON, el formato antiguo [{lat,lng}], o una lista de coordenadas
 * "lat, lng" por línea (como las copia Google Maps). Detecta si vienen invertidas.
 */
export function parseTextInput(text: string): CandidatoImportado[] {
    const t = text.trim()
    if (!t) return []
    if (t.startsWith("{") || t.startsWith("[")) {
        let json: any
        try { json = JSON.parse(t) } catch { json = null }
        if (json) {
            if (json.type === "FeatureCollection") return candidatesFromCollection(json, "Polígono")
            const g = normalizeGeometry(json)
            if (g) return [{ id: "0", nombre: "Polígono pegado", geometria: g, areaHa: computeMetrics(g).areaHa }]
            // Arreglo de pares [a, b]
            if (Array.isArray(json) && json.every(p => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))) {
                return candidatesFromPairs(json as number[][])
            }
            return []
        }
    }
    const pairs = t.split(/[\n;]+/).map(line => {
        const nums = line.replace(/[()\[\]]/g, " ").split(/[\s,\t]+/).filter(Boolean).map(Number)
        return nums.length >= 2 && nums.every(n => !isNaN(n)) ? [nums[0], nums[1]] : null
    }).filter(Boolean) as number[][]
    return candidatesFromPairs(pairs)
}

function candidatesFromPairs(pairs: number[][]): CandidatoImportado[] {
    if (pairs.length < 3) return []
    // Por defecto "lat, lng" (convención de Google Maps y GPS de mano).
    // Si el primer valor no puede ser latitud, se asume [lng, lat] (convención GeoJSON).
    const swapped = pairs.some(p => Math.abs(p[0]) > 90)
    const pts = pairs.map(p => (swapped ? { lng: p[0], lat: p[1] } : { lat: p[0], lng: p[1] }))
    const g = polygonFromPoints(pts)
    return g ? [{ id: "0", nombre: "Coordenadas pegadas", geometria: g, areaHa: computeMetrics(g).areaHa }] : []
}

/** Lee GeoJSON, KML o GPX (o texto con coordenadas) y devuelve los polígonos que contiene. */
export async function parseBoundaryFile(file: File): Promise<CandidatoImportado[]> {
    const name = file.name.toLowerCase()
    const text = await file.text()
    const base = file.name.replace(/\.[^.]+$/, "")

    if (name.endsWith(".kml") || name.endsWith(".gpx")) {
        const { kml, gpx } = await import("@tmcw/togeojson")
        const xml = new DOMParser().parseFromString(text, "text/xml")
        if (xml.getElementsByTagName("parsererror").length > 0) throw new Error("El archivo no es un XML válido.")
        const fc = (name.endsWith(".kml") ? kml(xml) : gpx(xml)) as FeatureCollection
        return candidatesFromCollection(fc, base)
    }
    if (name.endsWith(".kmz") || name.endsWith(".zip") || name.endsWith(".shp")) {
        throw new Error("Los archivos KMZ y Shapefile aún no se admiten. En Google Earth use \"Guardar lugar como… → KML\".")
    }
    let json: any = null
    try { json = JSON.parse(text) } catch { /* puede ser texto plano */ }
    if (json?.type === "FeatureCollection") return candidatesFromCollection(json, base)
    return parseTextInput(text).map(c => ({ ...c, nombre: c.nombre === "Polígono pegado" ? base : c.nombre }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportación y formato
// ─────────────────────────────────────────────────────────────────────────────

export function toGeoJSONString(geom: BoundaryGeometry, nombre: string, extra: Record<string, unknown> = {}): string {
    const m = computeMetrics(geom)
    return JSON.stringify({
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: { nombre, area_ha: +m.areaHa.toFixed(4), perimetro_m: +m.perimetroM.toFixed(1), ...extra },
            geometry: geom,
        }],
    }, null, 2)
}

export function toKMLString(geom: BoundaryGeometry, nombre: string): string {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    const ring = (r: Position[]) => r.map(p => `${p[0]},${p[1]},0`).join(" ")
    const poly = (rings: Position[][]) => `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(rings[0])}</coordinates></LinearRing></outerBoundaryIs>${rings.slice(1).map(r => `<innerBoundaryIs><LinearRing><coordinates>${ring(r)}</coordinates></LinearRing></innerBoundaryIs>`).join("")}</Polygon>`
    const body = geom.type === "Polygon" ? poly(geom.coordinates) : `<MultiGeometry>${geom.coordinates.map(poly).join("")}</MultiGeometry>`
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(nombre)}</name>
<Style id="lindero"><LineStyle><color>ff00d4ff</color><width>3</width></LineStyle><PolyStyle><color>4000d4ff</color></PolyStyle></Style>
<Placemark><name>${esc(nombre)}</name><styleUrl>#lindero</styleUrl>${body}</Placemark></Document></kml>`
}

export function formatHa(ha: number | null | undefined, decimals = 2): string {
    if (ha == null || !Number.isFinite(ha)) return "—"
    return `${ha.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ha`
}

export function formatMeters(m: number | null | undefined): string {
    if (m == null || !Number.isFinite(m)) return "—"
    return m >= 1000
        ? `${(m / 1000).toLocaleString("es-CO", { maximumFractionDigits: 2 })} km`
        : `${m.toLocaleString("es-CO", { maximumFractionDigits: 0 })} m`
}

/** Distancia en metros entre dos puntos (haversine), sin dependencias para usarla en el bucle del GPS. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371008.8
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
}
