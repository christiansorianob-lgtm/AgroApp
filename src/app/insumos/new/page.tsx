'use client'

import Link from "next/link"
import { createInsumo } from "@/app/actions/insumos"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function NewInsumoPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/insumos">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nuevo Insumo</h2>
                    <p className="text-muted-foreground">Registrar producto en catálogo</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Datos del Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createInsumo} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código</Label>
                                <Input id="codigo" name="codigo" placeholder="Ej: FERT-001" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Comercial</Label>
                                <Input id="nombre" name="nombre" placeholder="Ej: Urea 46%" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="categoria">Categoría</Label>
                                <Input id="categoria" name="categoria" placeholder="Ej: Fertilizante, Herbicida" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                                <Input id="unidadMedida" name="unidadMedida" placeholder="Ej: kg, litro, bulto" required />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/insumos">Cancelar</Link>
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 w-4 h-4" />
                                Guardar Insumo
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
