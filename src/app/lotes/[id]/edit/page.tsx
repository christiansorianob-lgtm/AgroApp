'use client'

import React, { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { getFincas } from "@/app/actions/fincas"
import { getTiposCultivo } from "@/app/actions/cultivos"
import { getLoteById, updateLote } from "@/app/actions/lotes" // Import the actions
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2, Map as MapIcon, RotateCcw, Trash2, Crosshair, ClipboardList } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"

// Dynamic Map import
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>
})

function EditLoteForm() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [loading, setLoading] = useState(true)

    // Catalog State
    const [tiposCultivo, setTiposCultivo] = useState<any[]>([])
    const [variedades, setVariedades] = useState<any[]>([])

    // Form State
    const [fincaId, setFincaId] = useState("")
    const [fincaName, setFincaName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorDetail, setErrorDetail] = useState("")

    // Form Fields
    const [nombre, setNombre] = useState("")
    const [codigo, setCodigo] = useState("")
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
    const [activeOtherPolygons, setActiveOtherPolygons] = useState<any[]>([])

    useEffect(() => {
        async function load() {
            try {
                // 1. Load Catalogs
                const resCultivos = await getTiposCultivo()
                if (resCultivos.data) setTiposCultivo(resCultivos.data)

                // 2. Load Lote Data
                const resLote = await getLoteById(id)
                if (resLote.error || !resLote.data) {
                    throw new Error(resLote.error || "Lote no encontrado")
                }

                const lote = resLote.data
                setFincaId(lote.fincaId)
                setFincaName(lote.finca.nombre) // Display only
                setNombre(lote.nombre)
                setCodigo(lote.codigo)
                setAreaHa(lote.areaHa.toString())

                // Crop
                setSelectedTipo(lote.tipoCultivo)
                if (lote.tipoCultivo) {
                    // Find varieties for this type
                    // We need to wait for state update or look in resCultivos.data directly
                    const tipo = resCultivos.data?.find((t: any) => t.nombre === lote.tipoCultivo)
                    if (tipo) setVariedades(tipo.variedades)
                }
                setSelectedVariedad(lote.variedad || "")

                if (lote.fechaSiembra) {
                    setFechaSiembra(new Date(lote.fechaSiembra).toISOString().split('T')[0])
                }
                setObservaciones(lote.observaciones || "")

                // Geo
                if (lote.latitud) setLat(lote.latitud.toString())
                if (lote.longitud) setLng(lote.longitud.toString())

                if (lote.poligono) {
                    try {
                        const poly = typeof lote.poligono === 'string' ? JSON.parse(lote.poligono) : lote.poligono
                        setPolygonPoints(poly)
                    } catch (e) { console.error("Error parsing polygon", e) }
                }

                // 3. Load Context (Finca Polygon & Other Lotes)
                // We need to fetch the Finca to get its polygon and other lotes
                // Could optimize if getLoteById returned this, currently it returns Finca basic info.
                // But getFincas returns all... let's use getFincaById equivalent or search in getFincas if list is small, 
                // OR better, just update the server action to include lotes in finca if needed, 
                // but getLoteById includes finca. Let's see if it included 'poligono' of finca.
                // The current getLoteById uses 'include: { finca: true }', so we have finca data.

                const finca = lote.finca

                // Finca Ref Polygon
                if (finca.poligono) {
                    setActiveRefPolygon(typeof finca.poligono === 'string' ? JSON.parse(finca.poligono) : finca.poligono)
                }

                // Other lots - Not loaded by getLoteById (it includes Finca but not Finca.lotes).
                // We might want to fetch siblings. For now, skipping other polygons display to keep it simple or fetch separate.
                // If critical, we should fetch siblings.

            } catch (e: any) {
                console.error(e)
                setErrorDetail(e.message)
                setShowErrorModal(true)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])


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

            // Normalization handled in server action or here? Server action does minimal.
            // Let's ensure dots in floats
            if (areaHa) formData.set('areaHa', areaHa.replace(',', '.'))
            if (lat) formData.set('latitud', lat.replace(',', '.'))
            if (lng) formData.set('longitud', lng.replace(',', '.'))

            const res = await updateLote(id, formData)

            if (res.error) {
                throw new Error(res.error)
            }

            // Success
            window.location.href = `/fincas/${fincaId}`

        } catch (error: any) {
            console.error(error)
            setErrorDetail(String(error.message))
            setShowErrorModal(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/fincas/${fincaId}`}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Editar Lote</h2>
                    <p className="text-muted-foreground">{nombre} ({codigo}) - {fincaName}</p>
                </div>
                <div className="ml-auto">
                    <Button variant="outline" asChild>
                        <Link href={`/tareas?loteId=${id}`}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Tareas del Lote
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ERROR MODAL */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-red-500">
                        <div className="bg-red-500 text-white px-4 py-2 font-bold flex justify-between items-center">
                            <span>Error</span>
                            <button onClick={() => setShowErrorModal(false)} className="text-white hover:text-red-200">✕</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {errorDetail || "Ocurrió un error desconocido."}
                            </p>
                            <Button type="button" onClick={() => setShowErrorModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAP MODAL */}
            {showMap && (
                <div className="fixed inset-0 z-[100] bg-background flex flex-col">
                    <div className="border-b p-4 flex items-center justify-between bg-card shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="text-2xl">🗺️</span> Editor de Lote
                            </h2>
                            <div className="flex gap-2">
                                <Button size="sm" variant={drawingMode ? "default" : "outline"} onClick={() => {
                                    setDrawingMode(!drawingMode)
                                    mapRef.current?.toggleDrawing()
                                }}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    {drawingMode ? 'Terminar Dibujo' : '✏️ Editar Área'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => mapRef.current?.undo()}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Deshacer
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => mapRef.current?.clear()}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Borrar Todo
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setShowMap(false)}>
                                ❌ Cancelar
                            </Button>
                            <Button onClick={() => setShowMap(false)}>
                                <Save className="w-4 h-4 mr-2" /> Confirmar
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 relative">
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
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ubicación y Geografía</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <Label>Ubicación Geográfica</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {lat && lng ? `Lat: ${parseFloat(lat).toFixed(5)}, Lng: ${parseFloat(lng).toFixed(5)}` : 'No definida'}
                                    {polygonPoints.length > 0 && ` • Polígono: ${polygonPoints.length} puntos`}
                                </p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => setShowMap(true)}>
                                🗺️ {lat || polygonPoints.length > 0 ? "Editar Mapa / Polígono" : "Abrir Editor de Mapa"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Lote</Label>
                                <Input
                                    id="codigo"
                                    value={codigo}
                                    readOnly
                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Lote</Label>
                                <Input
                                    id="nombre"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    placeholder="Ej: Lote Norte"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="areaHa">Área (Ha)</Label>
                                <Input
                                    id="areaHa"
                                    value={areaHa}
                                    onChange={e => setAreaHa(e.target.value)}
                                    type="number"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Detalles Agronómicos</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipoCultivo">Tipo Cultivo</Label>
                                <Select value={selectedTipo} onValueChange={handleTipoChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccione Tipo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" disabled>Seleccione...</SelectItem>
                                        {tiposCultivo.map((t) => (
                                            <SelectItem key={t.id} value={t.nombre}>{t.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variedad">Variedad</Label>
                                <Select value={selectedVariedad} onValueChange={setSelectedVariedad} disabled={!selectedTipo}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccione Variedad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variedades.map((v) => (
                                            <SelectItem key={v.id} value={v.nombre}>{v.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fechaSiembra">Fecha Inicio</Label>
                                <Input
                                    id="fechaSiembra"
                                    type="date"
                                    value={fechaSiembra}
                                    onChange={e => setFechaSiembra(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Observaciones</CardTitle></CardHeader>
                    <CardContent>
                        <Input
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            placeholder="Notas adicionales..."
                        />
                    </CardContent>
                </Card>

                <div className="pt-4 flex justify-end gap-3">
                    <Button variant="outline" type="button" asChild>
                        <Link href={`/fincas/${fincaId}`}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="mr-2 w-4 h-4" /> Actualizar Lote</>}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default function EditLotePage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <EditLoteForm />
        </Suspense>
    )
}
