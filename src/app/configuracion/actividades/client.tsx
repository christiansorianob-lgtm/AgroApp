'use client'

import { useState } from "react"
import { createTipoActividad, deleteTipoActividad, seedTiposActividad, getTiposActividad } from "@/app/actions/configuracion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Loader2, Wand2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/common/BackButton"

export function ActividadesClient({ initialData }: { initialData: any[] }) {
    const router = useRouter()
    const [tipos, setTipos] = useState<any[]>(initialData)
    const [loading, setLoading] = useState(false)
    const [newTipo, setNewTipo] = useState("")
    const [adding, setAdding] = useState(false)

    async function loadData() {
        const res = await getTiposActividad()
        if (res.data) setTipos(res.data)
    }

    async function handleAdd() {
        if (!newTipo.trim()) return
        setAdding(true)
        const res = await createTipoActividad(newTipo)
        setAdding(false)
        if (res.success) {
            setNewTipo("")
            loadData()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar actividad?")) return
        const res = await deleteTipoActividad(id)
        if (res.success) loadData()
        else alert(res.error)
    }

    async function handleSeed() {
        setLoading(true)
        const res = await seedTiposActividad()
        setLoading(false)
        if (res.success) loadData()
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <BackButton fallback="/configuracion" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Tipos de Actividad</h1>
                    <p className="text-muted-foreground">Catálogo de actividades disponibles</p>
                </div>
                {tipos.length === 0 && (
                    <Button variant="outline" className="ml-auto" onClick={handleSeed} disabled={loading}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Cargar Sugeridos
                    </Button>
                )}
            </div>

            <Card className="mb-8 border-primary/20">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">Agregar Nueva Actividad</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="newTipo" className="sr-only">Nombre</Label>
                            <Input
                                id="newTipo"
                                placeholder="Ej: Fertilización Foliar"
                                value={newTipo}
                                onChange={e => setNewTipo(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={adding || !newTipo.trim()}>
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Agregar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-2">
                {tipos.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm">
                        <span className="font-medium">{item.nombre}</span>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {tipos.length === 0 && <p className="text-center text-muted-foreground py-8">No hay actividades registradas.</p>}
            </div>
        </div>
    )
}
