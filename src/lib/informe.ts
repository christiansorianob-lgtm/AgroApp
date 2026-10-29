// Utilidades para el informe imprimible de una finca: mapa estático (imagen satelital + polígonos en SVG).

import type { Position } from "geojson"
import { geometryBounds, type BoundaryGeometry } from "./geo"

export interface MapaEstatico {
    ancho: number
    alto: number
    /** Proyecta [lng, lat] a coordenadas del SVG */
    proyectar: (p: Position) => [number, number]
    /** Imagen satelital de Esri exactamente para este encuadre (proyección lineal lat/lng) */
    urlSatelite: string
    escala: { metros: number; pixeles: number }
}

const M_LAT = 110574
const mLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180)

/**
 * Calcula el encuadre del mapa para un conjunto de geometrías, conservando la proporción real del
 * terreno, y la URL de la imagen satelital correspondiente.
 */
export function mapaEstatico(geoms: (BoundaryGeometry | null | undefined)[], ancho = 1000, margen = 0.1): MapaEstatico | null {
    const b = geometryBounds(geoms)
    if (!b) return null
    let [[minLat, minLng], [maxLat, maxLng]] = b
    const latMid = (minLat + maxLat) / 2
    // Margen alrededor del predio
    const padLat = Math.max((maxLat - minLat) * margen, 0.0004)
    const padLng = Math.max((maxLng - minLng) * margen, 0.0004)
    minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng

    // Proporción real (metros) y límites para que quepa bien en la hoja
    let wM = (maxLng - minLng) * mLng(latMid)
    let hM = (maxLat - minLat) * M_LAT
    const ratioMin = 0.55, ratioMax = 0.82 // alto / ancho: el mapa debe caber en la primera hoja A4
    if (hM / wM < ratioMin) { const extra = (wM * ratioMin - hM) / 2 / M_LAT; minLat -= extra; maxLat += extra; hM = wM * ratioMin }
    if (hM / wM > ratioMax) { const extra = (hM / ratioMax - wM) / 2 / mLng(latMid); minLng -= extra; maxLng += extra; wM = hM / ratioMax }

    const alto = Math.round(ancho * (hM / wM))
    const proyectar = (p: Position): [number, number] => [
        ((p[0] - minLng) / (maxLng - minLng)) * ancho,
        ((maxLat - p[1]) / (maxLat - minLat)) * alto,
    ]
    const px = 2 // imagen al doble de resolución para que se vea nítida al imprimir
    const urlSatelite = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?" + new URLSearchParams({
        bbox: [minLng, minLat, maxLng, maxLat].map(n => n.toFixed(6)).join(","),
        bboxSR: "4326", imageSR: "4326", size: `${ancho * px},${alto * px}`, format: "jpg", f: "image",
    }).toString()

    // Barra de escala "redonda" de ~22 % del ancho
    const metrosPorPx = wM / ancho
    const objetivo = metrosPorPx * ancho * 0.22
    const pasos = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]
    const metros = pasos.reduce((m, s) => (s <= objetivo ? s : m), pasos[0])
    return { ancho, alto, proyectar, urlSatelite, escala: { metros, pixeles: metros / metrosPorPx } }
}

/** Atributo `d` de un path SVG para un polígono o multipolígono. */
export function pathSVG(g: BoundaryGeometry, proyectar: (p: Position) => [number, number]): string {
    const anillo = (r: Position[]) => r.map((p, i) => `${i ? "L" : "M"}${proyectar(p).map(n => n.toFixed(1)).join(",")}`).join("") + "Z"
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates
    return polys.map(poly => poly.map(anillo).join("")).join("")
}
