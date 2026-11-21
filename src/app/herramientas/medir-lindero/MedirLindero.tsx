'use client'

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import type { BoundaryGeometry } from "@/lib/geo"

// El editor usa Leaflet: solo se carga en el navegador
const BoundaryEditor = dynamic(() => import("@/components/geo/BoundaryEditor"), {
    ssr: false,
    loading: () => <div className="fixed inset-0 z-[60] animate-pulse bg-muted" />,
})

export function MedirLindero({ referencias, centro }: {
    referencias: { nombre: string; geometria: BoundaryGeometry }[]
    centro: { lat: number; lng: number } | null
}) {
    const router = useRouter()
    return (
        <BoundaryEditor
            modo="herramienta"
            titulo="Medir lindero"
            subtitulo="Herramienta de medición · no se guarda en la plataforma"
            valorInicial={null}
            // Los linderos existentes se ven en el mapa y el trazado se puede pegar a ellos
            contexto={{ vecinos: referencias, centro }}
            storageKey="agroapp:recorrido:herramienta-medir"
            onCancel={() => router.push("/herramientas")}
            onSave={() => { }}
        />
    )
}
