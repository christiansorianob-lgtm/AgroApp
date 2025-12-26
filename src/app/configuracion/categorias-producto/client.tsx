'use client'

import { useState } from "react"
import Link from "next/link"
import { createCategoriaProducto, deleteCategoriaProducto, getCategoriasProducto } from "@/app/actions/configuracion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Loader2, Settings } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"

export function CategoriasProductoClient({ initialData }: { initialData: any[] }) {
    const [items, setItems] = useState<any[]>(initialData)
    const [newItem, setNewItem] = useState("")
    const [adding, setAdding] = useState(false)

    async function loadData() {
        const res = await getCategoriasProducto()
        if (res.data) setItems(res.data)
    }

    async function handleAdd() {
        if (!newItem.trim()) return
        setAdding(true)
        const res = await createCategoriaProducto(newItem)
        setAdding(false)
        if (res.success) {
            setNewItem("")
            loadData()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar categoría?")) return
        const res = await deleteCategoriaProducto(id)
        if (res.success) loadData()
        else alert(res.error)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <BackButton fallback="/configuracion" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Categorías de Producto</h1>
                    <p className="text-muted-foreground">Clasificación de insumos</p>
                </div>
            </div>

            <Card className="mb-8 border-primary/20">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">Agregar Nueva Categoría</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="newItem" className="sr-only">Nombre</Label>
                            <Input
                                id="newItem"
                                placeholder="Ej: Fertilizante, Herbicida"
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
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                                <Link href={`/configuracion/categorias-producto/${item.id}`}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Gestionar
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="text-center text-muted-foreground py-8">No hay categorías registradas.</p>}
            </div>
        </div>
    )
}
