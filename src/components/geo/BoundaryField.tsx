'use client'

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon, PenLine, Upload, Footprints, Pencil, AlertTriangle, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GeoViewer, type GeoViewerLayer } from "./GeoViewer"
import type { BoundaryEditorProps } from "./BoundaryEditor"
import { computeMetrics, normalizeGeometry, validateBoundary, formatHa, formatMeters, METODO_LABELS, type BoundaryValue } from "@/lib/geo"

const BoundaryEditor = dynamic(() => import("./BoundaryEditor"), { ssr: false })

interface BoundaryFieldProps {
    value: BoundaryValue | null
    onChange: (v: BoundaryValue | null) => void
    titulo: string
    subtitulo?: string
    storageKey: string
    contexto?: BoundaryEditorProps["contexto"]
    /** Capas de referencia para la vista previa (finca, lotes vecinos) */
    capasReferencia?: GeoViewerLayer[]
}

/** Campo de formulario para el lindero: vista previa, medidas y acceso al editor a pantalla completa. */
export function BoundaryField({ value, onChange, titulo, subtitulo, storageKey, contexto, capasReferencia = [] }: BoundaryFieldProps) {
    const [abierto, setAbierto] = useState(false)
    const geom = useMemo(() => normalizeGeometry(value?.geometria), [value])
    const metricas = useMemo(() => (geom ? computeMetrics(geom) : null), [geom])
    const avisos = useMemo(() => (geom ? validateBoundary(geom, contexto) : []), [geom, contexto])

    const capas: GeoViewerLayer[] = [
        ...capasReferencia,
        ...(geom ? [{ id: "actual", nombre: "Lindero", geometria: geom, estilo: "destacado" as const }] : []),
    ]

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            {geom ? (
                <div className="grid md:grid-cols-[1fr_260px]">
                    <div className="relative h-56 md:h-64">
                        <GeoViewer layers={capas} />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border p-4 md:border-l md:border-t-0">
                        <div>
                            <div className="text-xs text-muted-foreground">Área medida</div>
                            <div className="text-2xl font-semibold tabular-nums">{formatHa(metricas!.areaHa)}</div>
                        </div>
                        <dl className="space-y-1 text-xs">
                            <div className="flex justify-between"><dt className="text-muted-foreground">Perímetro</dt><dd className="font-medium tabular-nums">{formatMeters(metricas!.perimetroM)}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Vértices</dt><dd className="font-medium">{metricas!.vertices}</dd></div>
                            {value?.metodo && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Método</dt><dd className="text-right font-medium">{METODO_LABELS[value.metodo]}</dd></div>}
                            {value?.precisionM != null && <div className="flex justify-between"><dt className="text-muted-foreground">Precisión GPS</dt><dd className="font-medium">±{value.precisionM.toFixed(1)} m</dd></div>}
                        </dl>
                        {avisos.length > 0 && (
                            <p className="flex gap-1.5 rounded-md bg-amber-50 p-2 text-[11px] leading-snug text-amber-900">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {avisos[0].mensaje}{avisos.length > 1 ? ` (+${avisos.length - 1})` : ""}
                            </p>
                        )}
                        <Button type="button" variant="outline" size="sm" className="mt-auto" onClick={() => setAbierto(true)}>
                            <Pencil className="mr-1.5 h-4 w-4" /> Editar lindero
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MapPinned className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-medium">Defina el lindero</p>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            El área y el perímetro se calculan automáticamente a partir del polígono.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><PenLine className="h-3.5 w-3.5" /> Dibujar sobre satélite</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Upload className="h-3.5 w-3.5" /> Importar KML / GeoJSON</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Footprints className="h-3.5 w-3.5" /> Caminar con GPS</span>
                    </div>
                    <Button type="button" onClick={() => setAbierto(true)}>
                        <MapIcon className="mr-2 h-4 w-4" /> Abrir editor de linderos
                    </Button>
                </div>
            )}

            {abierto && (
                <BoundaryEditor
                    titulo={titulo}
                    subtitulo={subtitulo}
                    valorInicial={value}
                    contexto={contexto}
                    storageKey={storageKey}
                    onCancel={() => setAbierto(false)}
                    onSave={v => { onChange(v); setAbierto(false) }}
                />
            )}
        </div>
    )
}
