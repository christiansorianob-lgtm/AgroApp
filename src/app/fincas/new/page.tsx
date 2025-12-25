'use client'

import Link from "next/link"
import { createFinca } from "@/app/actions/fincas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function NewFincaPage() {
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
                                <Label htmlFor="departamento">Departamento</Label>
                                <Input id="departamento" name="departamento" placeholder="Ej: Meta" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="municipio">Municipio</Label>
                                <Input id="municipio" name="municipio" placeholder="Ej: San Martín" required />
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
