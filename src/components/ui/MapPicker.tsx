'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in Next.js/Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng)
            onLocationSelect(e.latlng.lat, e.latlng.lng)
            map.flyTo(e.latlng, 18)
        },
    })

    return position === null ? null : (
        <Marker position={position}></Marker>
    )
}

export default function MapPicker({ onLocationSelect, lat, lng }: { onLocationSelect: (lat: number, lng: number) => void, lat?: number, lng?: number }) {
    const [position, setPosition] = useState<L.LatLng | null>(null)
    const [mounted, setMounted] = useState(false)
    const [map, setMap] = useState<L.Map | null>(null)

    useEffect(() => {
        setMounted(true)
        // If initial lat/lng provided, set it
        if (lat && lng) {
            const latlng = new L.LatLng(lat, lng)
            setPosition(latlng)
        } else if (navigator.geolocation) {
            // Only try geolocation if no props provided initially
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords
                const latlng = new L.LatLng(latitude, longitude)
                setPosition(latlng)
                onLocationSelect(latitude, longitude)
            })
        }
    }, [])

    // Sync external props to map
    useEffect(() => {
        if (lat && lng && map) {
            const newPos = new L.LatLng(lat, lng)
            // Only update if significantly different to avoid loop
            if (!position || position.distanceTo(newPos) > 10) {
                setPosition(newPos)
                map.flyTo(newPos, 18) // High zoom for precision on manual input
            }
        }
    }, [lat, lng, map])

    if (!mounted) return <div className="h-[300px] w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>

    return (
        <div className="h-[300px] w-full rounded-md overflow-hidden border">
            <MapContainer
                center={position || [4.5709, -74.2973]}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                ref={setMap}
            >
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    // Satellite Imagery
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
            </MapContainer>
        </div>
    )
}
