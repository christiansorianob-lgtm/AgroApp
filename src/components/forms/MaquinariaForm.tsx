'use client'

import { useState } from "react"
import Link from "next/link"
import { createMaquinaria } from "@/app/actions/maquinaria"
import {
    getTiposMaquinaria, createTipoMaquinaria, deleteTipoMaquinaria,
    getMarcasMaquinaria, createMarcaMaquinaria, deleteMarcaMaquinaria,
    getUbicacionesMaquinaria, createUbicacionMaquinaria, deleteUbicacionMaquinaria
} from "@/app/actions/maquinaria"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { CatalogManager } from "@/components/common/CatalogManager"

interface MaquinariaFormProps {
    fincas: any[]
    tipos: any[]
    marcas: any[]
    ubicaciones: any[]
}

export function MaquinariaForm({ fincas, tipos: initialTipos, marcas: initialMarcas, ubicaciones: initialUbicaciones }: MaquinariaFormProps) {
    // Local state for catalogs
    const [tipos, setTipos] = useState(initialTipos)
    const [marcas, setMarcas] = useState(initialMarcas)
    const [ubicaciones, setUbicaciones] = useState(initialUbicaciones)

    const [selectedFinca, setSelectedFinca] = useState("")
    const [selectedTipo, setSelectedTipo] = useState("")
    const [selectedMarca, setSelectedMarca] = useState("")
    const [selectedEstado, setSelectedEstado] = useState("DISPONIBLE")
    const [selectedUbicacion, setSelectedUbicacion] = useState("")

    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data Refresh Handlers
    const refreshTipos = async () => {
        const res = await getTiposMaquinaria()
        if (res.data) setTipos(res.data)
    }

    const refreshMarcas = async () => {
        const res = await getMarcasMaquinaria()
        if (res.data) setMarcas(res.data)
    }

    const refreshUbicaciones = async () => {
        const res = await getUbicacionesMaquinaria()
        if (res.data) setUbicaciones(res.data)
    }

    const fincaOptions = fincas.map(f => ({ value: f.id, label: f.nombre }))
    const tipoOptions = tipos.map((t: any) => ({ value: t.id, label: t.nombre }))
    const marcaOptions = marcas.map((m: any) => ({ value: m.id, label: m.nombre }))
    const ubicacionOptions = ubicaciones.map((u: any) => ({ value: u.id, label: u.nombre }))

    const estadoOptions = [
        { value: "DISPONIBLE", label: "Disponible" },
        { value: "EN_USO", label: "En Uso" },
        { value: "MANTENIMIENTO", label: "Mantenimiento" },
        { value: "FUERA_DE_SERVICIO", label: "Fuera de Servicio" }
    ]

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        const result = await createMaquinaria(formData)
        if (result?.error) {
            alert(result.error)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header removed: Rendered by parent page */}

            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        {/* Hidden Inputs */}
                        <input type="hidden" name="fincaId" value={selectedFinca} />
                        <input type="hidden" name="tipoId" value={selectedTipo} />
                        <input type="hidden" name="marcaId" value={selectedMarca} />
                        <input type="hidden" name="estado" value={selectedEstado} />
                        <input type="hidden" name="ubicacionId" value={selectedUbicacion} />

                        <div className="space-y-2">
                            <Label htmlFor="fincaId">Finca (Propietaria)</Label>
                            <Combobox
                                options={fincaOptions}
                                value={selectedFinca}
                                onSelect={setSelectedFinca}
                                placeholder="Seleccione Finca..."
                            />
                            <p className="text-[0.8rem] text-muted-foreground">La máquina se asignará a esta finca.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Interno</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    placeholder="Autogenerado"
                                    readOnly
                                    className="bg-muted text-muted-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="tipoId">Tipo de Máquina</Label>
                                    <CatalogManager
                                        triggerLabel="Administrar"
                                        title="Gestionar Tipos de Máquina"
                                        description="Cree o elimine categorías de maquinaria."
                                        placeholder="Ej: Tractor"
                                        items={tipos}
                                        onCreate={createTipoMaquinaria}
                                        onDelete={deleteTipoMaquinaria}
                                        onRefresh={refreshTipos}
                                    />
                                </div>
                                <Combobox
                                    options={tipoOptions}
                                    value={selectedTipo}
                                    onSelect={setSelectedTipo}
                                    placeholder="Seleccione tipo..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="marcaId">Marca</Label>
                                    <CatalogManager
                                        triggerLabel="Administrar"
                                        title="Gestionar Marcas"
                                        description="Cree o elimine marcas de maquinaria."
                                        placeholder="Ej: John Deere"
                                        items={marcas}
                                        onCreate={createMarcaMaquinaria}
                                        onDelete={deleteMarcaMaquinaria}
                                        onRefresh={refreshMarcas}
                                    />
                                </div>
                                <Combobox
                                    options={marcaOptions}
                                    value={selectedMarca}
                                    onSelect={setSelectedMarca}
                                    placeholder="Seleccione marca..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="modelo">Modelo</Label>
                                <Input id="modelo" name="modelo" placeholder="Ej: 5090E" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialPlaca">Serial / Placa</Label>
                                <Input id="serialPlaca" name="serialPlaca" placeholder="Ej: XYZ-123" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="estado">Estado Inicial</Label>
                                <Combobox
                                    options={estadoOptions}
                                    value={selectedEstado}
                                    onSelect={setSelectedEstado}
                                    placeholder="Seleccione estado..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="ubicacionId">Ubicación</Label>
                                <CatalogManager
                                    triggerLabel="Administrar"
                                    title="Gestionar Ubicaciones"
                                    description="Cree o elimine lugares de almacenamiento."
                                    placeholder="Ej: Bodega Central"
                                    items={ubicaciones}
                                    onCreate={createUbicacionMaquinaria}
                                    onDelete={deleteUbicacionMaquinaria}
                                    onRefresh={refreshUbicaciones}
                                />
                            </div>
                            <Combobox
                                options={ubicacionOptions}
                                value={selectedUbicacion}
                                onSelect={setSelectedUbicacion}
                                placeholder="Seleccione ubicación..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Textarea id="observaciones" name="observaciones" placeholder="Notas..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/maquinaria">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                                Guardar Máquina
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
