'use client'

import Link from "next/link"
import { createMaquinaria } from "@/app/actions/maquinaria"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function NewMaquinariaPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/maquinaria">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nueva Máquina</h2>
                    <p className="text-muted-foreground">Registre un nuevo equipo o vehículo</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información del Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createMaquinaria} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Interno</Label>
                                <Input id="codigo" name="codigo" placeholder="Ej: TRK-01" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipo">Tipo de Máquina</Label>
                                <Input id="tipo" name="tipo" placeholder="Ej: Tractor, Fumigadora" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="marca">Marca</Label>
                                <Input id="marca" name="marca" placeholder="Ej: John Deere" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="modelo">Modelo</Label>
                                <Input id="modelo" name="modelo" placeholder="Ej: 5090E" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialPlaca">Serial / Placa</Label>
                                <Input id="serialPlaca" name="serialPlaca" placeholder="Ej: XYZ-123" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estado">Estado Inicial</Label>
                                <select
                                    id="estado"
                                    name="estado"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="DISPONIBLE">Disponible</option>
                                    <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                                    <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fincaId">Ubicación (Finca Base)</Label>
                            {/* Could be a dropdown if we passed Fincas, using simple input for now as it wasn't strict relation in logic */}
                            <Input id="fincaId" name="fincaId" placeholder="ID o Nombre de Finca" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/maquinaria">Cancelar</Link>
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 w-4 h-4" />
                                Guardar Máquina
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
