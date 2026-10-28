'use client'

import { GeoJSON, CircleMarker, Tooltip } from "react-leaflet"
import MapBase from "./MapBase"
import { geometryBounds, normalizeGeometry, formatHa, type BoundaryGeometry } from "@/lib/geo"
import type { GeoViewerLayer } from "./GeoViewer"

const STYLES = {
    finca: { color: "#facc15", weight: 3, fillColor: "#facc15", fillOpacity: 0.06, dashArray: "8 6" },
    lote: { color: "#ffffff", weight: 2, fillColor: "#22c55e", fillOpacity: 0.22 },
    destacado: { color: "#22d3ee", weight: 3, fillColor: "#22d3ee", fillOpacity: 0.28 },
    tenue: { color: "#ffffff", weight: 1, fillColor: "#ffffff", fillOpacity: 0.08, dashArray: "4 4" },
} as const

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))

export default function GeoViewerMap({ layers, points = [], height }: {
    layers: GeoViewerLayer[]
    points?: { id: string; nombre: string; lat: number; lng: number; href?: string }[]
    height?: string
}) {
    const parsed = layers
        .map(l => ({ ...l, geom: normalizeGeometry(l.geometria) as BoundaryGeometry | null }))
        .filter(l => l.geom)
    const bounds = geometryBounds(parsed.map(l => l.geom))
        ?? (points.length ? pointBounds(points) : null)

    return (
        <div style={{ height: height || "100%" }} className="w-full">
            <MapBase bounds={bounds} scrollWheelZoom={false}>
                {parsed.map(l => (
                    <GeoJSON
                        key={`${l.id}-${JSON.stringify(l.geom).length}`}
                        data={l.geom as any}
                        style={() => STYLES[l.estilo || "lote"]}
                        interactive={l.estilo !== "finca"}
                        onEachFeature={(_, layer) => {
                            if (l.estilo !== "finca") {
                                layer.bindTooltip(esc(l.nombre), { permanent: true, direction: "center", className: "map-label" })
                            }
                            const html = `<div class="map-popup"><strong>${esc(l.nombre)}</strong>${l.subtitulo ? `<span>${esc(l.subtitulo)}</span>` : ""}${l.areaHa != null ? `<span>${formatHa(l.areaHa)}</span>` : ""}${l.href ? `<a href="${l.href}">Ver detalle →</a>` : ""}</div>`
                            layer.bindPopup(html)
                        }}
                    />
                ))}
                {points.map(p => (
                    <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={8}
                        pathOptions={{ color: "#fff", weight: 2, fillColor: "#16a34a", fillOpacity: 1 }}
                        eventHandlers={p.href ? { click: () => { window.location.href = p.href! } } : undefined}>
                        <Tooltip direction="top" offset={[0, -8]}>{p.nombre}</Tooltip>
                    </CircleMarker>
                ))}
            </MapBase>
        </div>
    )
}

function pointBounds(points: { lat: number; lng: number }[]): [[number, number], [number, number]] {
    const lats = points.map(p => p.lat), lngs = points.map(p => p.lng)
    const pad = 0.01
    return [[Math.min(...lats) - pad, Math.min(...lngs) - pad], [Math.max(...lats) + pad, Math.max(...lngs) + pad]]
}
