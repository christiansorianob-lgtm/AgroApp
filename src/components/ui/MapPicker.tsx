'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, Tooltip } from 'react-leaflet'
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

function LocationMarker({ position, setPosition, onLocationSelect, drawingMode, setPolygonPoints, polygonPoints, setZoom, readOnly }: any) {
    const map = useMapEvents({
        click(e) {
            if (readOnly) return;

            if (drawingMode) {
                // Add point to polygon
                setPolygonPoints((prev: any) => [...prev, e.latlng])
            } else {
                // Normal marker placement
                setPosition(e.latlng)
                onLocationSelect(e.latlng.lat, e.latlng.lng)
                map.flyTo(e.latlng, map.getZoom())
            }
        },
        zoomend() {
            setZoom(map.getZoom())
        }
    })

    return (
        <>
            {position && <Marker position={position} interactive={!drawingMode}></Marker>}
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
    onStatusChange?: (isDrawing: boolean, hasPoints: boolean) => void
    initialZoom?: number
    initialPolygon?: any[]
    readOnly?: boolean
    referencePolygon?: any[]
    otherPolygons?: { id: string, name: string, points: any[] }[]
}

export interface MapPickerHandle {
    toggleDrawing: () => void;
    undo: () => void;
    clear: () => void;
    flyTo: (lat: number, lng: number) => void;
}

const MapPicker = forwardRef<MapPickerHandle, MapPickerProps>(({
    onLocationSelect,
    lat,
    lng,
    onPolygonChange,
    onAreaCalculated,
    onStatusChange,
    initialZoom = 13,
    initialPolygon = [],
    readOnly = false,
    referencePolygon = [],
    otherPolygons = []
}, ref) => {
    const [position, setPosition] = useState<L.LatLng | null>(null)
    const [mounted, setMounted] = useState(false)
    const [map, setMap] = useState<L.Map | null>(null)
    const [currentZoom, setCurrentZoom] = useState(initialZoom)

    // Polygon drawing
    const [drawingMode, setDrawingMode] = useState(false)
    const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>(
        initialPolygon ? initialPolygon.map((p: any) => new L.LatLng(p.lat, p.lng)) : []
    )

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        toggleDrawing: () => setDrawingMode(prev => !prev),
        undo: () => setPolygonPoints(prev => prev.slice(0, -1)),
        clear: () => {
            setPolygonPoints([])
            if (onAreaCalculated) onAreaCalculated(0)
        },
        flyTo: (lat: number, lng: number) => {
            if (map) {
                const newPos = new L.LatLng(lat, lng)
                map.flyTo(newPos, map.getZoom())
                setPosition(newPos)
            }
        }
    }));

    // Notify parent of status changes
    useEffect(() => {
        if (onStatusChange) {
            onStatusChange(drawingMode, polygonPoints.length > 0)
        }
    }, [drawingMode, polygonPoints, onStatusChange])

    useEffect(() => {
        setMounted(true)
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
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

    // Sync props to state
    useEffect(() => {
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng) && map && !drawingMode) {
            const newPos = new L.LatLng(lat, lng)
            // Only update if significantly different to avoid loops/jitters
            if (!position || position.distanceTo(newPos) > 10) {
                setPosition(newPos)
                map.flyTo(newPos, Math.max(map.getZoom(), 15)) // Ensure we see it
            }
        }
    }, [lat, lng, map, drawingMode])

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

    if (!mounted) return <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 relative rounded-md border overflow-hidden">
                <MapContainer
                    center={position || [4.5709, -74.2973]}
                    zoom={currentZoom}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    ref={setMap}
                >
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {/* Reference Polygon (Finca) */}
                    {referencePolygon.length > 0 && (
                        <Polygon
                            positions={referencePolygon}
                            pathOptions={{ color: 'yellow', fillColor: 'transparent', dashArray: '10, 10', weight: 2 }}
                            interactive={false}
                        />
                    )}

                    {/* Other Lotes Polygons */}
                    {otherPolygons.map((op) => (
                        <Polygon
                            key={op.id}
                            positions={op.points}
                            pathOptions={{ color: '#ffffff', fillColor: '#cccccc', fillOpacity: 0.2, weight: 1, dashArray: '5, 5' }}
                        >
                            <Tooltip direction="center" permanent className="bg-transparent border-none text-white font-bold shadow-none">
                                {op.name}
                            </Tooltip>
                        </Polygon>
                    ))}

                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={onLocationSelect}
                        drawingMode={drawingMode}
                        setPolygonPoints={setPolygonPoints}
                        polygonPoints={polygonPoints}
                        setZoom={setCurrentZoom}
                        readOnly={readOnly}
                    />
                </MapContainer>
            </div>

            {/* Minimal Status Bar */}
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1 py-1">
                <p>
                    {drawingMode
                        ? '👆 Haz clic en el mapa para marcar los vértices.'
                        : polygonPoints.length > 0
                            ? '✅ Polígono guardado.'
                            : '👆 Haz clic en el mapa para ubicar el marcador principal.'}
                </p>
                {polygonPoints.length > 2 && (
                    <span className="font-bold text-primary text-sm">
                        Área: {(area(turf.polygon([[...polygonPoints, polygonPoints[0]].map(p => [p.lng, p.lat])])) / 10000).toFixed(2)} Ha
                    </span>
                )}
            </div>
        </div>
    )
});

MapPicker.displayName = "MapPicker";
export default MapPicker;
