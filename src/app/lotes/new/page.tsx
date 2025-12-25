'use client'

import Link from "next/link"
import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getFincas } from "@/app/actions/fincas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2, Map as MapIcon, RotateCcw, Trash2, Crosshair } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic Map import
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Cargando Mapa...</div>
})

function LoteForm() {
    const searchParams = useSearchParams()
    const preFincaId = searchParams.get('fincaId')

    const [fincas, setFincas] = useState<any[]>([])
    const [loadingFincas, setLoadingFincas] = useState(true)

    // Form State
    const [selectedFinca, setSelectedFinca] = useState(preFincaId || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorDetail, setErrorDetail] = useState("")

    // Map State
    const [showMap, setShowMap] = useState(false)
    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const mapRef = useRef<any>(null)
    const [drawingMode, setDrawingMode] = useState(false)
    const [polygonPoints, setPolygonPoints] = useState<any[]>([])

    useEffect(() => {
        async function load() {
            try {
                const res = await getFincas()
                if (res.data) setFincas(res.data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoadingFincas(false)
            }
        }
        load()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorDetail("")

        try {
            const formData = new FormData(e.currentTarget)

            const payload = {
                fincaId: selectedFinca,
                codigo: formData.get('codigo'),
                nombre: formData.get('nombre'),
                areaHa: formData.get('areaHa'),
                tipoCultivo: formData.get('tipoCultivo'),
                variedad: formData.get('variedad'),
                fechaSiembra: formData.get('fechaSiembra'),
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

            // Redirect back to Finca
            window.location.href = `/fincas/${selectedFinca}`

        } catch (error: any) {
            console.error(error)
            setErrorDetail(String(error.message))
            setShowErrorModal(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/fincas/${selectedFinca || ''}`}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
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
                            <select
                                id="fincaId"
                                name="fincaId"
                                required
                                value={selectedFinca}
                                onChange={(e) => setSelectedFinca(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!!preFincaId} // If passed via URL, lock it? Or allow change? Let's allow change unless strict. Existing code didn't strict. But pre-fill is help. 
                            >
                                <option value="">Seleccione una Finca...</option>
                                {fincas.map((finca) => (
                                    <option key={finca.id} value={finca.id}>
                                        {finca.nombre} ({finca.codigo})
                                    </option>
                                ))}
                            </select>
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
                                <Input id="codigo" name="codigo" placeholder="Autogenerado (Ej: L-01)" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Lote</Label>
                                <Input id="nombre" name="nombre" placeholder="Ej: Lote Norte" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="areaHa">Área (Ha)</Label>
                                <Input id="areaHa" name="areaHa" type="number" step="0.01" placeholder="0.00" required />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Detalles Agronómicos</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipoCultivo">Tipo Cultivo</Label>
                                <Input id="tipoCultivo" name="tipoCultivo" placeholder="Ej: Palma de Aceite" required defaultValue="Palma de Aceite" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variedad">Variedad</Label>
                                <Input id="variedad" name="variedad" placeholder="Ej: Guineensis" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fechaSiembra">Fecha Siembra</Label>
                                <Input id="fechaSiembra" name="fechaSiembra" type="date" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button variant="outline" type="button" asChild>
                        <Link href={`/fincas/${selectedFinca || ''}`}>Cancelar</Link>
                    </Button>
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
