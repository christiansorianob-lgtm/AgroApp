'use client'

import { useState } from "react"
import { createUnidadMedida, deleteUnidadMedida, getUnidadesMedida } from "@/app/actions/configuracion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"

export function UnidadesMedidaClient({ initialData }: { initialData: any[] }) {
    const [items, setItems] = useState<any[]>(initialData)
    const [newItem, setNewItem] = useState("")
    const [adding, setAdding] = useState(false)

    async function loadData() {
        const res = await getUnidadesMedida()
        if (res.data) setItems(res.data)
    }

    async function handleAdd() {
        if (!newItem.trim()) return
        setAdding(true)
        const res = await createUnidadMedida(newItem)
        setAdding(false)
        if (res.success) {
            setNewItem("")
            loadData()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar unidad?")) return
        const res = await deleteUnidadMedida(id)
        if (res.success) loadData()
        else alert(res.error)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <BackButton fallback="/configuracion" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Unidades de Medida</h1>
                    <p className="text-muted-foreground">Catálogo de unidades de medida</p>
                </div>
            </div>

            <Card className="mb-8 border-primary/20">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">Agregar Nueva Unidad</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="newItem" className="sr-only">Nombre</Label>
                            <Input
                                id="newItem"
                                placeholder="Ej: Kg, Litro, Bulto"
                                value={newItem}
                                onChange={e => setNewItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={adding || !newItem.trim()}>
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Agregar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-2">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm">
                        <span className="font-medium">{item.nombre}</span>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {items.length === 0 && <p className="text-center text-muted-foreground py-8">No hay unidades registradas.</p>}
            </div>
        </div>
    )
}
