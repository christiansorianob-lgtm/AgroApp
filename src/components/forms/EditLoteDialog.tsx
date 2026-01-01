'use client'

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getTiposCultivo } from "@/app/actions/cultivos"
import { updateLote } from "@/app/actions/lotes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Map as MapIcon, RotateCcw, Trash2, Save, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import { Combobox } from "@/components/ui/combobox"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Dynamic Map import
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>
})

interface EditLoteDialogProps {
    lote: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EditLoteDialog({ lote, open, onOpenChange, onSuccess }: EditLoteDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false) // Catalogs loading

    // Catalog State
    const [tiposCultivo, setTiposCultivo] = useState<any[]>([])
    const [variedades, setVariedades] = useState<any[]>([])

    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorDetail, setErrorDetail] = useState("")

    // Form Fields
    const [nombre, setNombre] = useState("")
    const [areaHa, setAreaHa] = useState("")
    const [selectedTipo, setSelectedTipo] = useState("")
    const [selectedVariedad, setSelectedVariedad] = useState("")
    const [fechaSiembra, setFechaSiembra] = useState("")
    const [observaciones, setObservaciones] = useState("")

    // Map State
    const [showMap, setShowMap] = useState(false)
    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const mapRef = useRef<any>(null)
    const [drawingMode, setDrawingMode] = useState(false)
    const [polygonPoints, setPolygonPoints] = useState<any[]>([])

    // Map Overlays
    const [activeRefPolygon, setActiveRefPolygon] = useState<any[]>([])

    // Initialize Data
    useEffect(() => {
        if (open && lote) {
            setLoading(true)
            getTiposCultivo().then(res => {
                if (res.data) {
                    setTiposCultivo(res.data)
                    // Set varieties if type selected
                    if (lote.tipoCultivo) {
                        const tipo = res.data.find((t: any) => t.nombre === lote.tipoCultivo)
                        if (tipo) setVariedades(tipo.variedades)
                    }
                }
            }).finally(() => setLoading(false))

            setNombre(lote.nombre)
            setAreaHa(lote.areaHa.toString())
            setSelectedTipo(lote.tipoCultivo || "")
            setSelectedVariedad(lote.variedad || "")

            if (lote.fechaSiembra) {
                setFechaSiembra(new Date(lote.fechaSiembra).toISOString().split('T')[0])
            } else {
                setFechaSiembra("")
            }

            setObservaciones(lote.observaciones || "")

            if (lote.latitud) setLat(lote.latitud.toString())
            else setLat("")

            if (lote.longitud) setLng(lote.longitud.toString())
            else setLng("")

            if (lote.poligono) {
                try {
                    const poly = typeof lote.poligono === 'string' ? JSON.parse(lote.poligono) : lote.poligono
                    setPolygonPoints(poly)
                } catch (e) { console.error("Error parsing polygon", e) }
            } else {
                setPolygonPoints([])
            }

            if (lote.finca && lote.finca.poligono) {
                try {
                    const poly = typeof lote.finca.poligono === 'string' ? JSON.parse(lote.finca.poligono) : lote.finca.poligono
                    setActiveRefPolygon(poly)
                } catch (e) { }
            }
        }
    }, [open, lote])


    const handleTipoChange = (value: string) => {
        setSelectedTipo(value)
        setSelectedVariedad("")
        const tipo = tiposCultivo.find(t => t.nombre === value)
        setVariedades(tipo ? tipo.variedades : [])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorDetail("")

        try {
            const formData = new FormData()
            formData.append('nombre', nombre)
            formData.append('areaHa', areaHa)
            formData.append('tipoCultivo', selectedTipo)
            formData.append('variedad', selectedVariedad)
            formData.append('fechaSiembra', fechaSiembra)
            formData.append('observaciones', observaciones)
            if (lat) formData.append('latitud', lat)
            if (lng) formData.append('longitud', lng)
            if (polygonPoints.length > 0) formData.append('poligono', JSON.stringify(polygonPoints))

            if (areaHa) formData.set('areaHa', areaHa.replace(',', '.'))
            if (lat) formData.set('latitud', lat.replace(',', '.'))
            if (lng) formData.set('longitud', lng.replace(',', '.'))

            const res = await updateLote(lote.id, formData)

            if (res.error) {
                throw new Error(res.error)
            }

            // Success
            onOpenChange(false)
            if (onSuccess) onSuccess()
            router.refresh()

        } catch (error: any) {
            console.error(error)
            setErrorDetail(String(error.message))
        } finally {
            setIsSubmitting(false)
        }
    }

    const tipoCultivoOptions = useMemo(() => tiposCultivo.map(t => ({
        value: t.nombre,
        label: t.nombre
    })), [tiposCultivo])

    const variedadOptions = useMemo(() => variedades.map(v => ({
        value: v.nombre,
        label: v.nombre
    })), [variedades])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle>Editar Lote: {lote?.codigo}</DialogTitle>
                </DialogHeader>

                {errorDetail && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{errorDetail}</span>
                    </div>
                )}

                {/* MAP MODAL OVERLAY (Within Dialog? Or separate? Better separate/conditional rendering to avoid nesting issues or z-index wars in Radix UI) */}
                {/* Actually, Radix Dialog overlaying another Dialog can be tricky. Maybe just hide the form content and show map? */}
                {/* Let's toggle content view */}

                {showMap ? (
                    <div className="flex flex-col h-[600px]">
                        <div className="border-b pb-2 flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold">Editor de Mapa</h3>
                                <div className="flex gap-1">
                                    <Button size="sm" variant={drawingMode ? "default" : "outline"} onClick={() => {
                                        setDrawingMode(!drawingMode)
                                        mapRef.current?.toggleDrawing()
                                    }}>
                                        <MapIcon className="w-3 h-3 mr-1" />
                                        {drawingMode ? 'Terminar' : 'Dibujar'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => mapRef.current?.clear()}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>Cancelar</Button>
                                <Button size="sm" onClick={() => setShowMap(false)}>Confirmar</Button>
                            </div>
                        </div>
                        <div className="flex-1 relative border rounded overflow-hidden">
                            <MapPicker
                                ref={mapRef}
                                lat={lat ? parseFloat(lat.replace(',', '.')) : undefined}
                                lng={lng ? parseFloat(lng.replace(',', '.')) : undefined}
                                onLocationSelect={(la, lo) => {
                                    setLat(la.toString())
                                    setLng(lo.toString())
                                }}
                                onAreaCalculated={(val) => {
                                    if (val > 0) setAreaHa(val.toString())
                                }}
                                onPolygonChange={(points) => setPolygonPoints(points)}
                                referencePolygon={activeRefPolygon}
                                initialPolygon={polygonPoints}
                            />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Location Summary */}
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                            <div className="text-sm">
                                <span className="font-semibold">Ubicación: </span>
                                {lat && lng ? 'Definida' : 'No definida'}
                                {polygonPoints.length > 0 && ` • Polígono (${polygonPoints.length} pts)`}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowMap(true)}>
                                <MapIcon className="w-4 h-4 mr-2" /> Editar Mapa
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="areaHa">Área (Ha)</Label>
                                <Input id="areaHa" type="number" step="0.01" value={areaHa} onChange={e => setAreaHa(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo Cultivo</Label>
                                <Combobox
                                    options={tipoCultivoOptions}
                                    value={selectedTipo}
                                    onSelect={handleTipoChange}
                                    placeholder="Seleccione..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Variedad</Label>
                                <Combobox
                                    options={variedadOptions}
                                    value={selectedVariedad}
                                    onSelect={setSelectedVariedad}
                                    placeholder="Seleccione..."
                                    disabled={!selectedTipo}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha Siembra/Inicio</Label>
                                <Input type="date" value={fechaSiembra} onChange={e => setFechaSiembra(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observaciones</Label>
                            <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
