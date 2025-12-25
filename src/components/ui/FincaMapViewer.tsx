'use client'

import dynamic from "next/dynamic"

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>
})

interface FincaMapViewerProps {
    lat: number
    lng: number
    polygon: any[]
}

export function FincaMapViewer({ lat, lng, polygon }: FincaMapViewerProps) {
    return (
        <MapPicker
            lat={lat}
            lng={lng}
            onLocationSelect={() => { }}
            initialPolygon={polygon}
            readOnly={true}
            initialZoom={14}
        />
    )
}
