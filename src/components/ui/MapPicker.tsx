'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
// @ts-ignore
import * as turf from '@turf/helpers'
// @ts-ignore
import area from '@turf/area'

// Fix for default marker icon in Next.js/Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, onLocationSelect, drawingMode, setPolygonPoints, polygonPoints }: any) {
    const map = useMapEvents({
        click(e) {
            if (drawingMode) {
                // Add point to polygon
                setPolygonPoints((prev: any) => [...prev, e.latlng])
            } else {
                // Normal marker placement
                setPosition(e.latlng)
                onLocationSelect(e.latlng.lat, e.latlng.lng)
                map.flyTo(e.latlng, 18)
            }
        },
    })

    return (
        <>
            {position && !drawingMode && <Marker position={position}></Marker>}
            {polygonPoints.length > 0 && (
                <Polygon positions={polygonPoints} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }} />
            )}
            {/* Markers for polygon vertices */}
            {drawingMode && polygonPoints.map((p: any, idx: number) => (
                <Marker key={idx} position={p} icon={new L.DivIcon({
                    className: 'bg-transparent border-none',
                    html: `<div style="background:white; border:2px solid blue; width:10px; height:10px; border-radius:50%;"></div>`
                })} />
            ))}
        </>
    )
}

interface MapPickerProps {
    onLocationSelect: (lat: number, lng: number) => void
    lat?: number
    lng?: number
    onPolygonChange?: (points: any[]) => void
    onAreaCalculated?: (ha: number) => void
}

export default function MapPicker({ onLocationSelect, lat, lng, onPolygonChange, onAreaCalculated }: MapPickerProps) {
    const [position, setPosition] = useState<L.LatLng | null>(null)
    const [mounted, setMounted] = useState(false)
    const [map, setMap] = useState<L.Map | null>(null)

    // Polygon drawing
    const [drawingMode, setDrawingMode] = useState(false)
    const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>([])

    useEffect(() => {
        setMounted(true)
        if (lat && lng) {
            const latlng = new L.LatLng(lat, lng)
            setPosition(latlng)
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords
                const latlng = new L.LatLng(latitude, longitude)
                setPosition(latlng)
                onLocationSelect(latitude, longitude)
            })
        }
    }, [])

    useEffect(() => {
        if (lat && lng && map && !drawingMode) {
            const newPos = new L.LatLng(lat, lng)
            if (!position || position.distanceTo(newPos) > 10) {
                setPosition(newPos)
                map.flyTo(newPos, 18)
            }
        }
    }, [lat, lng, map])

    // Calculate Area
    useEffect(() => {
        if (polygonPoints.length >= 3) {
            // Convert to GeoJSON Polygon. Turf expects [lng, lat]
            const coords = [...polygonPoints, polygonPoints[0]].map(p => [p.lng, p.lat])
            const poly = turf.polygon([coords])
            const areaSqMeters = area(poly)
            const areaHa = areaSqMeters / 10000

            if (onAreaCalculated) onAreaCalculated(parseFloat(areaHa.toFixed(2)))
            if (onPolygonChange) onPolygonChange(polygonPoints)
        } else {
            if (onAreaCalculated) onAreaCalculated(0)
            if (onPolygonChange) onPolygonChange(polygonPoints)
        }
    }, [polygonPoints])

    if (!mounted) return <div className="h-[300px] w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>

    return (
        <div className="space-y-2">
            <div className={`rounded-md overflow-hidden border relative group ${drawingMode
                    ? 'fixed inset-0 z-[9999] h-screen w-screen bg-background rounded-none border-none'
                    : 'h-[300px] w-full'
                }`}>
                <MapContainer
                    center={position || [4.5709, -74.2973]}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    ref={setMap}
                >
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={onLocationSelect}
                        drawingMode={drawingMode}
                        setPolygonPoints={setPolygonPoints}
                        polygonPoints={polygonPoints}
                    />
                </MapContainer>

                {/* Floating Controls - Using high z-index and absolute positioning */}
                <div className={`absolute right-2 z-[500] flex flex-col gap-2 pointer-events-none transition-all duration-300 ${drawingMode ? 'top-4 right-4' : 'top-2 right-2'
                    }`}>
                    <div className="pointer-events-auto flex flex-col gap-2 items-end">
                        <button
                            type="button"
                            onClick={() => setDrawingMode(!drawingMode)}
                            className={`px-3 py-1.5 text-xs font-bold rounded shadow-lg border transition-colors ${drawingMode
                                    ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {drawingMode ? '✅ Finalizar' : '✏️ Dibujar Área'}
                        </button>

                        {polygonPoints.length > 0 && drawingMode && (
                            <button
                                type="button"
                                onClick={() => setPolygonPoints(prev => prev.slice(0, -1))}
                                className="px-3 py-1.5 text-xs bg-white text-gray-800 font-bold rounded shadow-lg border border-gray-300 hover:bg-gray-50"
                            >
                                ↩️ Deshacer
                            </button>
                        )}

                        {polygonPoints.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPolygonPoints([])
                                    if (onAreaCalculated) onAreaCalculated(0)
                                }}
                                className="px-3 py-1.5 text-xs bg-red-500 text-white font-bold rounded shadow-lg border border-red-600 hover:bg-red-600"
                            >
                                🗑️ Borrar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Text */}
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <p>
                    {drawingMode
                        ? 'Haz clic en el mapa para marcar los vértices.'
                        : polygonPoints.length > 0
                            ? 'Polígono guardado.'
                            : 'Haz clic en el mapa para ubicar el marcador principal.'}
                </p>
                {polygonPoints.length > 2 && (
                    <span className="font-medium text-primary">
                        Área dibujada: {(area(turf.polygon([[...polygonPoints, polygonPoints[0]].map(p => [p.lng, p.lat])])) / 10000).toFixed(2)} Ha
                    </span>
                )}
            </div>
        </div>
    )
}
