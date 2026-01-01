'use client'

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"

interface UsoMaquinariaFormProps {
    maquinas: any[]
    tareas: any[]
}

export function UsoMaquinariaForm({ maquinas, tareas }: UsoMaquinariaFormProps) {
    const router = useRouter()
    const [maquinaId, setMaquinaId] = useState("")
    const [tareaId, setTareaId] = useState("")

    // Derived options
    const maquinaOptions = useMemo(() =>
        maquinas.filter(m => m.estado === 'DISPONIBLE' || m.estado === 'EN_USO').map(m => ({
            value: m.id,
            label: `${m.tipo.nombre} - ${m.codigo}`
        }))
        , [maquinas])

    const tareaOptions = useMemo(() =>
        tareas.filter(t => t.estado === 'PROGRAMADA' || t.estado === 'EN_PROCESO').map(t => ({
            value: t.id,
            label: `${t.tipo} ({new Date(t.fechaProgramada).toLocaleDateString()}) - ${t.finca.nombre}`
        }))
        , [tareas])

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/maquinaria/uso">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Registrar Uso</h2>
                    <p className="text-muted-foreground">Asignar maquinaria a una tarea</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reporte de Operación</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6">
                        {/* Note: Logic implementation pending as per original file stub */}
                        <div className="space-y-2">
                            <Label htmlFor="maquinaId">Máquina</Label>
                            <Combobox
                                options={maquinaOptions}
                                value={maquinaId}
                                onSelect={setMaquinaId}
                                placeholder="Seleccione Máquina..."
                                searchPlaceholder="Buscar máquina..."
                                emptyText="No encontrada."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tareaId">Tarea Relacionada</Label>
                            <Combobox
                                options={tareaOptions}
                                value={tareaId}
                                onSelect={setTareaId}
                                placeholder="Seleccione Tarea..."
                                searchPlaceholder="Buscar tarea..."
                                emptyText="No encontrada."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="operador">Operador</Label>
                                <Input id="operador" name="operador" placeholder="Nombre del operario" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="horasUso">Horas de Uso</Label>
                                <Input id="horasUso" name="horasUso" type="number" step="0.1" placeholder="0.0" required />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/maquinaria/uso">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled>
                                <Save className="mr-2 w-4 h-4" />
                                Guardar (Funcionalidad Pendiente)
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
