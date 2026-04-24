'use client'

import Link from "next/link"
import { useState, useEffect, useRef, Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { getFincas } from "@/app/actions/fincas"
import { getTiposCultivo, createTipoCultivo } from "@/app/actions/cultivos"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2, Map as MapIcon, RotateCcw, Trash2, Crosshair } from "lucide-react"
import dynamic from "next/dynamic"
import { Combobox } from "@/components/ui/combobox"

import { QuickCreateDialog } from "@/components/common/QuickCreateDialog"
import { GoBackButton } from "@/components/ui/GoBackButton"

// Dynamic Map import
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>
})

function LoteForm() {
    const searchParams = useSearchParams()
    const preFincaId = searchParams?.get('fincaId')

    const [fincas, setFincas] = useState<any[]>([])
    const [loadingFincas, setLoadingFincas] = useState(true)

    // Catalog State
    const [tiposCultivo, setTiposCultivo] = useState<any[]>([])
    const [variedades, setVariedades] = useState<any[]>([])

    // Form State
    const [selectedFinca, setSelectedFinca] = useState(preFincaId || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorDetail, setErrorDetail] = useState("")

    const [selectedTipo, setSelectedTipo] = useState("")
    const [selectedVariedad, setSelectedVariedad] = useState("")

    // Date State
    const today = new Date()
    const [dateDay, setDateDay] = useState(today.getDate().toString().padStart(2, '0'))
    const [dateMonth, setDateMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'))
    const [dateYear, setDateYear] = useState(today.getFullYear().toString())
    const fechaSiembraValue = `${dateYear}-${dateMonth}-${dateDay}`

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

    // Function to refresh Types (passed to QuickCreateDialog)
    const refreshCultivos = async () => {
        const resCultivos = await getTiposCultivo()
        if (resCultivos.data) {
            setTiposCultivo(resCultivos.data)
        }
    }

    useEffect(() => {
        async function load() {
            try {
                // Load Fincas
                const resFincas = await getFincas()
                if (resFincas.data) {
                    setFincas(resFincas.data)
                    if (preFincaId) {
                        const target = resFincas.data.find((f: any) => f.id === preFincaId)
                        if (target) updateFincaContext(target)
                    }
                }

                // Load Tipos Cultivo using the refresh function
                await refreshCultivos()

            } catch (e) {
                console.error(e)
            } finally {
                setLoadingFincas(false)
            }
        }
        load()
    }, [preFincaId])

    const updateFincaContext = (finca: any) => {
        console.log("Updating context for Finca:", finca.nombre)

        // 1. Set Reference Polygon
        let refPoly: any[] = []
        if (finca.poligono) {
            try {
                refPoly = typeof finca.poligono === 'string' ? JSON.parse(finca.poligono) : finca.poligono
            } catch (e) { console.error("Error parsing polygon", e) }
        }
        setActiveRefPolygon(refPoly)

        // 2. Set Other Lotes
        if (finca.lotes && finca.lotes.length > 0) {
            const others = finca.lotes.map((l: any) => {
                try {
                    return {
                        id: l.id,
                        name: l.nombre,
                        points: typeof l.poligono === 'string' ? JSON.parse(l.poligono) : l.poligono
                    }
                } catch { return null }
            }).filter((l: any) => l && l.points && l.points.length > 0)
            setActiveOtherPolygons(others)
        } else {
            setActiveOtherPolygons([])
        }

        // 3. Center Map & Update Form
        if (finca.latitud && finca.longitud) {
            const newLat = finca.latitud.toString()
            const newLng = finca.longitud.toString()
            setLat(newLat)
            setLng(newLng)

            if (mapRef.current) {
                mapRef.current.flyTo(finca.latitud, finca.longitud)
            }
        }
    }

    const handleFincaSelect = (id: string) => {
        setSelectedFinca(id)
        const finca = fincas.find(f => f.id === id)
        if (finca) updateFincaContext(finca)
    }

    const handleTipoChange = (value: string) => {
        setSelectedTipo(value)
        setSelectedVariedad("") // Reset variedad
        const tipo = tiposCultivo.find(t => t.nombre === value)
        setVariedades(tipo ? tipo.variedades : [])
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorDetail("")

        try {
            const formData = new FormData(e.currentTarget)

            const payload = {
                fincaId: selectedFinca,
                codigo: "", // Autogenerated by API
                nombre: formData.get('nombre'),
                areaHa: formData.get('areaHa'),
                tipoCultivo: selectedTipo,
                variedad: selectedVariedad,
                fechaSiembra: fechaSiembraValue,
                latitud: lat,
                longitud: lng,
                poligono: JSON.stringify(polygonPoints),
                observaciones: formData.get('observaciones')
            }

            // Client normalization
            if (payload.areaHa) payload.areaHa = payload.areaHa.toString().replace(',', '.')
            if (payload.latitud) payload.latitud = payload.latitud.toString().replace(',', '.')
            if (payload.longitud) payload.longitud = payload.longitud.toString().replace(',', '.')

            const res = await fetch('/api/lotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Error al guardar el lote")
            }

            window.location.href = `/fincas/${selectedFinca}`

        } catch (error: any) {
            console.error(error)
            setErrorDetail(String(error.message))
            setShowErrorModal(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    const fincaOptions = useMemo(() => fincas.map(f => ({
        value: f.id,
        label: `${f.nombre} (${f.codigo})`
    })), [fincas])

    const tipoCultivoOptions = useMemo(() => tiposCultivo.map(t => ({
        value: t.nombre,
        label: t.nombre
    })), [tiposCultivo])

    const variedadOptions = useMemo(() => variedades.map(v => ({
        value: v.nombre,
        label: v.nombre
    })), [variedades])


    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <GoBackButton fallbackRoute={`/fincas/${selectedFinca || ''}`} />
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nuevo Lote</h2>
                    <p className="text-muted-foreground">Registre un lote dentro de una finca</p>
                </div>
            </div>

            {/* ERROR MODAL */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-red-500">
                        <div className="bg-red-500 text-white px-4 py-2 font-bold flex justify-between items-center">
                            <span>Error al Guardar</span>
                            <button onClick={() => setShowErrorModal(false)} className="text-white hover:text-red-200">✕</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Ocurrió un error técnico. Por favor comparte este mensaje con soporte:
                            </p>
                            <textarea
                                readOnly
                                className="w-full h-32 p-2 text-xs font-mono bg-gray-100 dark:bg-slate-800 border rounded resize-none"
                                value={errorDetail}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(errorDetail)
                                        alert("Copiado al portapapeles")
                                    }}
                                >
                                    📋 Copiar Error
                                </Button>
                                <Button type="button" onClick={() => setShowErrorModal(false)}>Cerrar</Button>
                            </div>
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
                            <div className="h-6 w-px bg-border mx-2" />
                            <div className="flex gap-2">
                                <Button size="sm" variant={drawingMode ? "default" : "outline"} onClick={() => {
                                    setDrawingMode(!drawingMode)
                                    mapRef.current?.toggleDrawing()
                                }}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    {drawingMode ? 'Terminar Dibujo' : '✏️ Dibujar Área'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => mapRef.current?.undo()}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Deshacer
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => mapRef.current?.clear()}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Borrar Todo
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                    if (lat && lng) mapRef.current?.flyTo(parseFloat(lat), parseFloat(lng))
                                    else if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(p => mapRef.current?.flyTo(p.coords.latitude, p.coords.longitude))
                                    }
                                }}>
                                    <Crosshair className="w-4 h-4 mr-2" /> Centrar
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setShowMap(false)}>
                                ❌ Cancelar
                            </Button>
                            <Button onClick={() => setShowMap(false)}>
                                <Save className="w-4 h-4 mr-2" /> Guardar Mapa
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
                            onAreaCalculated={(areaHa) => {
                                const input = document.getElementById('areaHa') as HTMLInputElement
                                if (input && areaHa > 0) input.value = areaHa.toString()
                            }}
                            onPolygonChange={(points) => setPolygonPoints(points)}
                            referencePolygon={activeRefPolygon}
                            otherPolygons={activeOtherPolygons}
                        />
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ubicación y Finca</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fincaId">Finca</Label>
                            <Combobox
                                options={fincaOptions}
                                value={selectedFinca}
                                onSelect={handleFincaSelect}
                                placeholder="Seleccione una Finca..."
                                searchPlaceholder="Buscar Finca..."
                                emptyText="No encontrada"
                                disabled={!!preFincaId}
                            />
                        </div>

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
                                    name="codigo"
                                    placeholder="Autogenerado al guardar"
                                    readOnly
                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Lote</Label>
                                <Input id="nombre" name="nombre" placeholder="Ej: Lote Norte" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="areaHa">Área (Ha)</Label>
                                <Input
                                    id="areaHa"
                                    name="areaHa"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    required
                                    pattern="[0-9]+([.][0-9]+)?"
                                    title="Use punto (.) como separador decimal. Ej: 12.5"
                                    onKeyDown={(e) => {
                                        // Block comma key
                                        if (e.key === ',') e.preventDefault()
                                    }}
                                    onChange={(e) => {
                                        // Auto-replace comma with dot
                                        e.target.value = e.target.value.replace(',', '.')
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">Use punto (.) como separador decimal. Ej: 123.45</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Detalles Agronómicos</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="tipoCultivo">Tipo Cultivo</Label>
                                    <QuickCreateDialog
                                        triggerLabel="Administrar"
                                        title="Nuevo Tipo de Cultivo"
                                        description="Defina un nuevo tipo de cultivo (ej: Café, Palma)."
                                        placeholder="Nombre del cultivo"
                                        action={createTipoCultivo}
                                        onSuccess={refreshCultivos}
                                    />
                                </div>
                                <Combobox
                                    options={tipoCultivoOptions}
                                    value={selectedTipo}
                                    onSelect={handleTipoChange}
                                    placeholder="Seleccione Tipo de Cultivo..."
                                    searchPlaceholder="Buscar cultivo..."
                                    emptyText="No encontrado"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variedad">Variedad</Label>
                                <Combobox
                                    options={variedadOptions}
                                    value={selectedVariedad}
                                    onSelect={setSelectedVariedad}
                                    placeholder="Seleccione Variedad..."
                                    searchPlaceholder="Buscar variedad..."
                                    emptyText="No encontrada"
                                    disabled={!selectedTipo}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Siembra</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground text-center">Día</p>
                                        <select
                                            value={dateDay}
                                            onChange={e => setDateDay(e.target.value)}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground text-center">Mes</p>
                                        <select
                                            value={dateMonth}
                                            onChange={e => setDateMonth(e.target.value)}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            {[
                                                ['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],
                                                ['05','Mayo'],['06','Junio'],['07','Julio'],['08','Agosto'],
                                                ['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']
                                            ].map(([v, l]) => (
                                                <option key={v} value={v}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground text-center">Año</p>
                                        <select
                                            value={dateYear}
                                            onChange={e => setDateYear(e.target.value)}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            {Array.from({ length: 30 }, (_, i) => (2010 + i).toString()).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Fecha seleccionada: {dateDay}/{dateMonth}/{dateYear}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <GoBackButton variant="outline" size="default" fallbackRoute={`/fincas/${selectedFinca || ''}`}>
                        Cancelar
                    </GoBackButton>
                    <Button type="submit" disabled={isSubmitting || !selectedFinca}>
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="mr-2 w-4 h-4" /> Guardar Lote</>}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default function NewLotePage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <LoteForm />
        </Suspense>
    )
}
