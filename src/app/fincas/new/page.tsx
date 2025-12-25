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
import { MapPickerHandle } from '@/components/ui/MapPicker' // Ensure this is exported

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

    // Location State
    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
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
                    setShowMap(true) // Show map to confirm
                },
                (error) => {
                    alert("Error obteniendo ubicación: " + error.message)
                }
            )
        } else {
            alert("Tu navegador no soporta geolocalización.")
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

            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createFinca as any} className="space-y-6">
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
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
                                    🗺️ {showMap ? 'Ocultar Mapa' : 'Seleccionar en Mapa'}
                                </Button>

                                {showMap && (
                                    <>
                                        <div className="w-px h-6 bg-border mx-2" /> {/* Separator */}

                                        <Button
                                            type="button"
                                            variant={isDrawing ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => mapRef.current?.toggleDrawing()}
                                            className={isDrawing ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                                        >
                                            {isDrawing ? "✅ Finalizar" : "✏️ Dibujar Área"}
                                        </Button>

                                        {hasPoints && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => mapRef.current?.undo()}
                                                >
                                                    ↩️ Deshacer
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm('¿Borrar todo el polígono?')) mapRef.current?.clear()
                                                    }}
                                                >
                                                    🗑️ Borrar
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            {showMap && (
                                <div className="rounded-lg border overflow-hidden">
                                    <MapPicker
                                        ref={mapRef}
                                        onLocationSelect={(la, lo) => {
                                            setLat(la.toString())
                                            setLng(lo.toString())
                                        }}
                                        lat={parseFloat(lat.replace(',', '.'))}
                                        lng={parseFloat(lng.replace(',', '.'))}
                                        onAreaCalculated={(areaHa) => {
                                            const input = document.getElementById('areaTotalHa') as HTMLInputElement
                                            if (input && areaHa > 0) {
                                                input.value = areaHa.toString()
                                            }
                                        }}
                                        onPolygonChange={(points) => {
                                            const input = document.getElementById('poligono') as HTMLInputElement
                                            if (input) {
                                                input.value = JSON.stringify(points)
                                            }
                                        }}
                                        onStatusChange={(drawing, points) => {
                                            setIsDrawing(drawing)
                                            setHasPoints(points)
                                        }}
                                    />
                                    <input type="hidden" id="poligono" name="poligono" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas adicionales..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/fincas">Cancelar</Link>
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 w-4 h-4" />
                                Guardar Finca
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
