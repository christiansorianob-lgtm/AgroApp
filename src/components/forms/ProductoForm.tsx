'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { createProducto } from "@/app/actions/almacen"
// Server actions for refreshing lists
import { getCategoriasProducto, getUnidadesMedida, createCategoriaProducto, createUnidadMedida } from "@/app/actions/configuracion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { QuickCreateDialog } from "@/components/common/QuickCreateDialog"

interface ProductoFormProps {
    nombres: any[]
    categorias: any[]
    unidades: any[]
    fincas: any[]
}

export function ProductoForm({ nombres, categorias: initialCategorias, unidades: initialUnidades, fincas }: ProductoFormProps) {
    // Local state for dynamic lists
    const [categorias, setCategorias] = useState(initialCategorias)
    const [unidades, setUnidades] = useState(initialUnidades)

    // Form States
    const [selectedFinca, setSelectedFinca] = useState("")
    const [selectedCategoria, setSelectedCategoria] = useState("")
    const [selectedNombre, setSelectedNombre] = useState("")
    const [selectedUnidad, setSelectedUnidad] = useState("")

    // UI States
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data Refresh Handlers
    const refreshCategorias = async () => {
        const res = await getCategoriasProducto()
        if (res.data) setCategorias(res.data)
    }

    const refreshUnidades = async () => {
        const res = await getUnidadesMedida()
        if (res.data) setUnidades(res.data)
    }

    // Transform data for Combobox
    const fincaOptions = fincas.map(f => ({ value: f.id, label: f.nombre }))
    const categoriaOptions = categorias.map((c: any) => ({ value: c.nombre, label: c.nombre }))
    const unidadOptions = unidades.map((u: any) => ({ value: u.nombre, label: u.nombre }))

    // Filter product names based on category
    const nombreOptions = useMemo(() => {
        if (!selectedCategoria) return []

        // Find category ID
        const catObj = categorias.find((c: any) => c.nombre === selectedCategoria)
        if (!catObj) return []

        return nombres
            .filter(n => n.categoriaId === catObj.id)
            .map(n => ({ value: n.nombre, label: n.nombre }))
    }, [selectedCategoria, nombres, categorias])

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)

        // Append Combobox values since they are not native inputs
        // Note: We use hidden inputs below so formData provided by the event might already have them if they are in the DOM.
        // Let's verify: yes, if we render <input type="hidden"> with name, they will be in formData.

        const result = await createProducto(formData)

        if (result?.error) {
            alert(result.error)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/almacen">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nuevo Producto</h2>
                    <p className="text-muted-foreground">Registrar entrada en almacén</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Datos del Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        {/* Hidden Inputs for Combobox Values */}
                        <input type="hidden" name="fincaId" value={selectedFinca} />
                        <input type="hidden" name="categoria" value={selectedCategoria} />
                        <input type="hidden" name="nombre" value={selectedNombre} />
                        <input type="hidden" name="unidadMedida" value={selectedUnidad} />

                        <div className="space-y-2">
                            <Label htmlFor="fincaId">Finca (Inventario)</Label>
                            <Combobox
                                options={fincaOptions}
                                value={selectedFinca}
                                onSelect={setSelectedFinca}
                                placeholder="Seleccione Finca..."
                            />
                            <p className="text-[0.8rem] text-muted-foreground">El producto pertenecerá al inventario de esta finca.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    placeholder="Autogenerado (Ej: PRO-001)"
                                    readOnly
                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                />
                            </div>

                            {/* CATEGORIA - First Step */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Categoría</Label>
                                    <QuickCreateDialog
                                        triggerLabel="Administrar"
                                        title="Nueva Categoría"
                                        description="Cree una nueva categoría para agrupar productos."
                                        placeholder="Ej: Fertilizante"
                                        action={createCategoriaProducto}
                                        onSuccess={refreshCategorias}
                                    />
                                </div>
                                <Combobox
                                    options={categoriaOptions}
                                    value={selectedCategoria}
                                    onSelect={(val) => {
                                        setSelectedCategoria(val)
                                        setSelectedNombre("") // Reset dependent field
                                    }}
                                    placeholder="Seleccione categoría..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* NOMBRE COMERCIAL - Dependent */}
                            <div className="space-y-2">
                                <Label>Nombre Comercial</Label>
                                <Combobox
                                    options={nombreOptions}
                                    value={selectedNombre}
                                    onSelect={setSelectedNombre}
                                    placeholder={selectedCategoria ? "Seleccione producto..." : "Primero seleccione categoría"}
                                    disabled={!selectedCategoria}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cantidad">Cantidad Inicial (Stock)</Label>
                                <Input
                                    id="cantidad"
                                    name="cantidad"
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Unidad de Medida</Label>
                                    <QuickCreateDialog
                                        triggerLabel="Administrar"
                                        title="Nueva Unidad"
                                        description="Defina una nueva unidad de medida (kg, lt, etc)."
                                        placeholder="Ej: Bulto 50kg"
                                        action={createUnidadMedida}
                                        onSuccess={refreshUnidades}
                                    />
                                </div>
                                <Combobox
                                    options={unidadOptions}
                                    value={selectedUnidad}
                                    onSelect={setSelectedUnidad}
                                    placeholder="Seleccione unidad..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/almacen">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                                Guardar Producto
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
