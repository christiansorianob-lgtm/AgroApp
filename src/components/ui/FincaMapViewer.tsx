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
    lotes?: any[]
}

export function FincaMapViewer({ lat, lng, polygon, lotes = [] }: FincaMapViewerProps) {
    // Process lotes to extract polygons
    const otherPolygons = lotes
        .filter(l => l.poligono)
        .map(l => {
            try {
                return {
                    id: l.id,
                    name: l.nombre,
                    points: typeof l.poligono === 'string' ? JSON.parse(l.poligono) : l.poligono
                }
            } catch { return null }
        })
        .filter((l): l is NonNullable<typeof l> => l !== null)

    return (
        <MapPicker
            lat={lat}
            lng={lng}
            onLocationSelect={() => { }}
            initialPolygon={polygon}
            readOnly={true}
            initialZoom={14}
            otherPolygons={otherPolygons}
        />
    )
}
