'use client'

import { useState, useEffect } from "react"
import { getTiposCultivo, createTipoCultivo, deleteTipoCultivo, createVariedad, deleteVariedad } from "@/app/actions/cultivos"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CultivosConfigPage() {
    const router = useRouter()
    const [tipos, setTipos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newTipo, setNewTipo] = useState("")
    const [newVariedad, setNewVariedad] = useState<{ [key: string]: string }>({})
    const [addingTipo, setAddingTipo] = useState(false)
    const [addingVariedad, setAddingVariedad] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const res = await getTiposCultivo()
            if (res.data) setTipos(res.data)
        } catch (e) {
            console.error(e)
            alert("Error: No se pudieron cargar los cultivos")
        } finally {
            setLoading(false)
        }
    }

    async function handleAddTipo() {
        if (!newTipo.trim()) return
        setAddingTipo(true)
        const res = await createTipoCultivo(newTipo)
        setAddingTipo(false)
        if (res.success) {
            setNewTipo("")
            loadData()
        } else {
            alert(res.error || "Error al agregar cultivo")
        }
    }

    async function handleDeleteTipo(id: string) {
        if (!confirm("¿Seguro que desea eliminar este cultivo? Se eliminarán también sus variedades.")) return
        const res = await deleteTipoCultivo(id)
        if (res.success) {
            loadData()
        } else {
            alert(res.error || "Error al eliminar cultivo")
        }
    }

    async function handleAddVariedad(tipoId: string) {
        const nombre = newVariedad[tipoId]
        if (!nombre?.trim()) return

        setAddingVariedad(prev => ({ ...prev, [tipoId]: true }))
        const res = await createVariedad(tipoId, nombre)
        setAddingVariedad(prev => ({ ...prev, [tipoId]: false }))

        if (res.success) {
            setNewVariedad(prev => ({ ...prev, [tipoId]: "" }))
            loadData()
        } else {
            alert(res.error || "Error al agregar variedad")
        }
    }

    async function handleDeleteVariedad(id: string) {
        if (!confirm("¿Eliminar variedad?")) return
        const res = await deleteVariedad(id)
        if (res.success) {
            loadData()
        } else {
            alert(res.error || "Error al eliminar variedad")
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Configuración de Cultivos</h1>
                    <p className="text-muted-foreground">Administre los tipos de cultivos y sus variedades</p>
                </div>
            </div>

            <Card className="mb-8 border-primary/20">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">Agregar Nuevo Tipo de Cultivo</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="newTipo" className="sr-only">Nombre del Cultivo</Label>
                            <Input
                                id="newTipo"
                                placeholder="Ej: Maíz"
                                value={newTipo}
                                onChange={e => setNewTipo(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddTipo} disabled={addingTipo || !newTipo.trim()}>
                            {addingTipo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Agregar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tipos.map((tipo) => (
                        <Card key={tipo.id} className="relative overflow-hidden">
                            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b flex flex-row justify-between items-center py-3">
                                <CardTitle className="text-base font-semibold">{tipo.nombre}</CardTitle>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteTipo(tipo.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 bg-card">
                                <ul className="space-y-2 mb-4">
                                    {tipo.variedades.length === 0 && <li className="text-xs text-muted-foreground italic">Sin variedades registradas</li>}
                                    {tipo.variedades.map((v: any) => (
                                        <li key={v.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-muted/50 group">
                                            <span>{v.nombre}</span>
                                            <button
                                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteVariedad(v.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2 mt-4 pt-4 border-t">
                                    <Input
                                        placeholder="Nueva variedad..."
                                        className="h-8 text-xs"
                                        value={newVariedad[tipo.id] || ""}
                                        onChange={e => setNewVariedad({ ...newVariedad, [tipo.id]: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddVariedad(tipo.id)
                                        }}
                                    />
                                    <Button size="sm" variant="secondary" className="h-8" onClick={() => handleAddVariedad(tipo.id)} disabled={addingVariedad[tipo.id]}>
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
