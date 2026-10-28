'use client'

import dynamic from "next/dynamic"
import { MapPinOff } from "lucide-react"

export interface GeoViewerLayer {
    id: string
    nombre: string
    geometria: unknown
    estilo?: "finca" | "lote" | "destacado" | "tenue"
    subtitulo?: string
    areaHa?: number | null
    href?: string
}

const GeoViewerMap = dynamic(() => import("./GeoViewerMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

/** Mapa de solo lectura con linderos de fincas y lotes. */
export function GeoViewer({ layers, points = [], emptyText = "Aún no se ha georreferenciado." }: {
    layers: GeoViewerLayer[]
    points?: { id: string; nombre: string; lat: number; lng: number; href?: string }[]
    emptyText?: string
}) {
    const hasData = layers.some(l => l.geometria) || points.length > 0
    if (!hasData) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                <MapPinOff className="h-8 w-8 opacity-40" />
                {emptyText}
            </div>
        )
    }
    return <GeoViewerMap layers={layers} points={points} />
}
