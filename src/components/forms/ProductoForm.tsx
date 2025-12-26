'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { createProducto } from "@/app/actions/almacen"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

interface ProductoFormProps {
    nombres: any[]
    categorias: any[]
    unidades: any[]
}

export function ProductoForm({ nombres, categorias, unidades }: ProductoFormProps) {
    const [selectedCategoria, setSelectedCategoria] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Find the ID of the selected category for filtering
    const filteredNombres = useMemo(() => {
        if (!selectedCategoria) return []

        // Find the cat object by Name (which is the value of the select)
        const catObj = categorias.find(c => c.nombre === selectedCategoria)
        if (!catObj) return []

        return nombres.filter(n => n.categoriaId === catObj.id)
    }, [selectedCategoria, nombres, categorias])

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
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
                                    <Label htmlFor="categoria">Categoría</Label>
                                    <Link href="/configuracion/categorias-producto" className="text-xs text-primary hover:underline">
                                        + Administrar
                                    </Link>
                                </div>
                                <select
                                    id="categoria"
                                    name="categoria"
                                    required
                                    value={selectedCategoria}
                                    onChange={(e) => setSelectedCategoria(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione categoría...</option>
                                    {categorias.map((item) => (
                                        <option key={item.id} value={item.nombre}>{item.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* NOMBRE COMERCIAL - Dependent */}
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Comercial</Label>
                                <select
                                    id="nombre"
                                    name="nombre"
                                    required
                                    disabled={!selectedCategoria}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">
                                        {selectedCategoria ? "Seleccione producto..." : "Primero seleccione una categoría"}
                                    </option>
                                    {filteredNombres.map((item) => (
                                        <option key={item.id} value={item.nombre}>{item.nombre}</option>
                                    ))}
                                </select>
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
                                    <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                                    <Link href="/configuracion/unidades-medida" className="text-xs text-primary hover:underline">
                                        + Administrar
                                    </Link>
                                </div>
                                <select
                                    id="unidadMedida"
                                    name="unidadMedida"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione unidad...</option>
                                    {unidades.map((item) => (
                                        <option key={item.id} value={item.nombre}>{item.nombre}</option>
                                    ))}
                                </select>
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
