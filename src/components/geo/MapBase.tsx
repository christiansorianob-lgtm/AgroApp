'use client'

import { useEffect } from "react"
import { MapContainer, TileLayer, LayersControl, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type LatLngBoundsTuple = [[number, number], [number, number]]

/** Centro de Colombia cuando no hay ninguna referencia geográfica. */
export const DEFAULT_CENTER: [number, number] = [4.5709, -74.2973]

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services"

function ScaleControl() {
    const map = useMap()
    useEffect(() => {
        const ctl = L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map)
        return () => { ctl.remove() }
    }, [map])
    return null
}

/** Ajusta la vista a unos límites cuando cambian (por ejemplo al importar un lindero). */
export function FitBounds({ bounds, padding = 40, maxZoom = 18 }: { bounds: LatLngBoundsTuple | null; padding?: number; maxZoom?: number }) {
    const map = useMap()
    const key = bounds ? bounds.flat().map(n => n.toFixed(6)).join(",") : ""
    useEffect(() => {
        if (!bounds) return
        // El contenedor puede tener tamaño 0 al montarse (carga diferida, diálogos): se recalcula antes de encuadrar
        const fit = () => {
            map.invalidateSize()
            map.fitBounds(bounds, { padding: [padding, padding], maxZoom })
        }
        fit()
        const t = setTimeout(fit, 250)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, map])
    return null
}

/** Mantiene el mapa ajustado cuando cambia el tamaño de su contenedor. */
function AutoResize() {
    const map = useMap()
    useEffect(() => {
        const el = map.getContainer()
        const ro = new ResizeObserver(() => map.invalidateSize())
        ro.observe(el)
        return () => ro.disconnect()
    }, [map])
    return null
}

interface MapBaseProps {
    children?: React.ReactNode
    bounds?: LatLngBoundsTuple | null
    center?: [number, number]
    zoom?: number
    className?: string
    layersPosition?: L.ControlPosition
    scrollWheelZoom?: boolean
}

/**
 * Mapa base de AgroApp: imagen satelital por defecto (Esri World Imagery), con alternativas de
 * calles y topográfico, y escala métrica.
 */
export default function MapBase({
    children, bounds, center, zoom = 15, className, layersPosition = "topright", scrollWheelZoom = true,
}: MapBaseProps) {
    return (
        <MapContainer
            center={center || DEFAULT_CENTER}
            zoom={center || bounds ? zoom : 6}
            bounds={bounds || undefined}
            boundsOptions={{ padding: [40, 40], maxZoom: 18 }}
            maxZoom={21}
            scrollWheelZoom={scrollWheelZoom}
            className={className}
            style={{ height: "100%", width: "100%" }}
            attributionControl={true}
        >
            <LayersControl position={layersPosition}>
                <LayersControl.BaseLayer checked name="Satélite">
                    <TileLayer
                        url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`}
                        attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics"
                        maxNativeZoom={19}
                        maxZoom={21}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Calles">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; colaboradores de OpenStreetMap"
                        maxNativeZoom={19}
                        maxZoom={21}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topográfico">
                    <TileLayer
                        url={`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`}
                        attribution="&copy; Esri"
                        maxNativeZoom={19}
                        maxZoom={21}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.Overlay checked name="Nombres y límites">
                    <TileLayer
                        url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`}
                        maxNativeZoom={19}
                        maxZoom={21}
                    />
                </LayersControl.Overlay>
            </LayersControl>
            <ScaleControl />
            <AutoResize />
            {bounds && <FitBounds bounds={bounds} />}
            {children}
        </MapContainer>
    )
}
