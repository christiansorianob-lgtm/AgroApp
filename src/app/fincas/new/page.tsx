'use client'

import Link from "next/link"
import { createFinca } from "@/app/actions/fincas"
import { getDepartamentos, getMunicipios } from "@/app/actions/locations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import dynamic from 'next/dynamic'
import { MapPickerHandle } from '@/components/ui/MapPicker'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">Cargando Mapa...</div>
})

export default function NewFincaPage() {
    const [departamentos, setDepartamentos] = useState<any[]>([])
    const [municipios, setMunicipios] = useState<any[]>([])

    // Selection State (IDs)
    const [selectedDeptId, setSelectedDeptId] = useState("")
    const [selectedDeptName, setSelectedDeptName] = useState("") // To store in DB
    const [selectedMuniName, setSelectedMuniName] = useState("") // To store in DB

    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const [showMap, setShowMap] = useState(false) // Restore this!
    // Map Ref and State
    const mapRef = useRef<MapPickerHandle>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasPoints, setHasPoints] = useState(false)

    useEffect(() => {
        // Load Depts on mount
        getDepartamentos().then(res => {
            if (res.data) setDepartamentos(res.data)
        })
    }, [])

    const handleDeptChange = async (deptId: string) => {
        setSelectedDeptId(deptId)
        const dept = departamentos.find(d => d.id === deptId)
        setSelectedDeptName(dept?.nombre || "")

        // Reset Muni
        setMunicipios([])
        setSelectedMuniName("")

        // Load Munis
        const res = await getMunicipios(deptId)
        if (res.data) setMunicipios(res.data)
    }

    const handleGeolocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLat(position.coords.latitude.toString())
                    setLng(position.coords.longitude.toString())
                    // If map is already open, fly to it
                    if (showMap && mapRef.current) {
                        mapRef.current.flyTo(position.coords.latitude, position.coords.longitude)
                    }
                },
                (error) => {
                    alert("Error obteniendo ubicación: " + error.message)
                }
            )
        } else {
            alert("Tu navegador no soporta geolocalización.")
        }
    }

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorDetail, setErrorDetail] = useState("")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formData = new FormData(e.currentTarget)

            // Manual validation
            if (!formData.get('nombre')) throw new Error("El nombre es obligatorio")
            if (!formData.get('areaTotalHa')) throw new Error("El área es obligatoria")
            if (!selectedDeptName) throw new Error("Seleccione un departamento")
            if (!selectedMuniName) throw new Error("Seleccione un municipio")

            // Ensure numeric formats
            const area = formData.get('areaTotalHa') as string
            formData.set('areaTotalHa', area.replace(',', '.'))

            if (lat) formData.set('latitud', lat.toString().replace(',', '.'))
            if (lng) formData.set('longitud', lng.toString().replace(',', '.'))

            // Ensure strings logic
            formData.set('departamento', selectedDeptName)
            formData.set('municipio', selectedMuniName)

            // Use fetch instead of Server Action to avoid Turbopack proxy errors
            const res = await fetch('/api/fincas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: formData.get('nombre'),
                    departamento: selectedDeptName,
                    municipio: selectedMuniName,
                    veredaSector: formData.get('veredaSector'),
                    responsable: formData.get('responsable'),
                    areaTotalHa: formData.get('areaTotalHa'),
                    latitud: formData.get('latitud'),
                    longitud: formData.get('longitud'),
                    poligono: formData.get('poligono'),
                    observaciones: formData.get('observaciones')
                })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Error desconocido al guardar")
            }

            // Success
            window.location.href = "/fincas"

        } catch (error: any) {
            console.error(error)
            setErrorDetail(String(error.message))
            setShowErrorModal(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/fincas">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nueva Finca</h2>
                    <p className="text-muted-foreground">Registre una nueva unidad productiva</p>
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

            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Finca</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    placeholder="Autogenerado (Ej: FIN-001)"
                                    disabled
                                    className="bg-muted text-muted-foreground"
                                />
                                <p className="text-[0.8rem] text-muted-foreground">Se asignará automáticamente al guardar.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Finca</Label>
                                <Input id="nombre" name="nombre" placeholder="Ej: La Esperanza" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Departamento</Label>
                                {/* Hidden input to send name to server action */}
                                <input type="hidden" name="departamento" value={selectedDeptName} />
                                <Select onValueChange={handleDeptChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departamentos.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Municipio</Label>
                                <input type="hidden" name="municipio" value={selectedMuniName} />
                                <Select
                                    disabled={!selectedDeptId}
                                    onValueChange={(val) => {
                                        // Find name from value (which could be ID or Name, let's use Name directly if easy, or Map)
                                        // Using ID as value is cleaner but we need Name for DB.
                                        // Let's store Name in state.
                                        const mun = municipios.find(m => m.id === val)
                                        setSelectedMuniName(mun?.nombre || "")
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {municipios.map(mun => (
                                            <SelectItem key={mun.id} value={mun.id}>
                                                {mun.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="veredaSector">Vereda / Sector</Label>
                            <Input id="veredaSector" name="veredaSector" placeholder="Ej: Vereda El Triunfo" required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="responsable">Responsable / Administrador</Label>
                                <Input id="responsable" name="responsable" placeholder="Nombre completo" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="areaTotalHa">Área Total (Ha)</Label>
                                <Input id="areaTotalHa" name="areaTotalHa" type="number" step="0.01" placeholder="0.00" required />
                            </div>
                        </div>

                        {/* Geolocation Section */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-medium">Ubicación Geográfica</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="latitud">Latitud</Label>
                                    <Input id="latitud" name="latitud" type="number" step="any" placeholder="0.000000" value={lat} onChange={(e) => setLat(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitud">Longitud</Label>
                                    <Input id="longitud" name="longitud" type="number" step="any" placeholder="0.000000" value={lng} onChange={(e) => setLng(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap items-center">
                                <Button type="button" variant="secondary" size="sm" onClick={handleGeolocation}>
                                    📍 Detectar mi Ubicación
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowMap(true)}>
                                    🗺️ Abrir Editor de Mapa
                                </Button>
                            </div>

                            {/* Fullscreen Map Editor Modal */}
                            {showMap && (
                                <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between p-4 border-b bg-card shadow-sm z-10 w-full shrink-0">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <h3 className="font-semibold text-lg whitespace-nowrap hidden md:block">Editor de Finca</h3>

                                            {/* Toolbar */}
                                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient">
                                                <Button
                                                    type="button"
                                                    variant={isDrawing ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        mapRef.current?.toggleDrawing()
                                                        // Ensure center if just starting
                                                        if (!isDrawing && lat && lng) {
                                                            mapRef.current?.flyTo(parseFloat(lat.replace(',', '.')), parseFloat(lng.replace(',', '.')))
                                                        }
                                                    }}
                                                    className={isDrawing ? "bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap" : "whitespace-nowrap"}
                                                >
                                                    {isDrawing ? "✅ Finalizar" : "✏️ Dibujar"}
                                                </Button>

                                                {hasPoints && (
                                                    <>
                                                        <Button type="button" variant="secondary" size="sm" onClick={() => mapRef.current?.undo()}>
                                                            ↩️ Deshacer
                                                        </Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => { if (confirm('¿Borrar?')) mapRef.current?.clear() }}>
                                                            🗑️ Borrar
                                                        </Button>
                                                    </>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (lat && lng) mapRef.current?.flyTo(parseFloat(lat.replace(',', '.')), parseFloat(lng.replace(',', '.')))
                                                        else alert('Sin coordenadas')
                                                    }}
                                                >
                                                    🎯 Centrar
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>
                                                ❌ Cancelar
                                            </Button>
                                            <Button type="button" size="sm" onClick={() => setShowMap(false)}>
                                                💾 Guardar
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Map Container */}
                                    <div className="flex-1 relative bg-muted/20 w-full min-h-0">
                                        <MapPicker
                                            ref={mapRef}
                                            lat={parseFloat(lat.replace(',', '.'))}
                                            lng={parseFloat(lng.replace(',', '.'))}
                                            onLocationSelect={(la, lo) => {
                                                setLat(la.toString())
                                                setLng(lo.toString())
                                            }}
                                            onAreaCalculated={(areaHa) => {
                                                const input = document.getElementById('areaTotalHa') as HTMLInputElement
                                                if (input && areaHa > 0) input.value = areaHa.toString()
                                            }}
                                            onPolygonChange={(points) => {
                                                const input = document.getElementById('poligono') as HTMLInputElement
                                                if (input) input.value = JSON.stringify(points)
                                            }}
                                            onStatusChange={(drawing, points) => {
                                                setIsDrawing(drawing)
                                                setHasPoints(points)
                                            }}
                                        />
                                    </div>

                                    {/* Footer Info */}
                                    <div className="p-2 text-center text-xs text-muted-foreground border-t bg-card shrink-0">
                                        Use el mouse o dedos para mover el mapa. Click para agregar puntos del lindero.
                                    </div>
                                </div>
                            )}

                            {/* Hidden Inputs for Persistence */}
                            <input type="hidden" id="poligono" name="poligono" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas adicionales..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/fincas">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
                                <Save className="mr-2 w-4 h-4" />
                                {isSubmitting ? 'Guardando...' : 'Guardar Finca'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
