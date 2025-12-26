'use client'

import { useState } from "react"
import { createResponsable, deleteResponsable, getResponsables } from "@/app/actions/configuracion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Loader2, User } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"

export function ResponsablesClient({ initialData }: { initialData: any[] }) {
    const [items, setItems] = useState<any[]>(initialData)
    const [adding, setAdding] = useState(false)

    // Form State
    const [nombre, setNombre] = useState("")
    const [email, setEmail] = useState("")
    const [cargo, setCargo] = useState("")

    async function loadData() {
        const res = await getResponsables()
        if (res.data) setItems(res.data)
    }

    async function handleAdd() {
        if (!nombre.trim()) return
        setAdding(true)
        const res = await createResponsable(nombre, email, cargo)
        setAdding(false)
        if (res.success) {
            setNombre("")
            setEmail("")
            setCargo("")
            loadData()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar responsable?")) return
        const res = await deleteResponsable(id)
        if (res.success) loadData()
        else alert(res.error)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <BackButton fallback="/configuracion" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Responsables</h1>
                    <p className="text-muted-foreground">Gestión del personal</p>
                </div>
            </div>

            <Card className="mb-8 border-primary/20">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">Agregar Nuevo Responsable</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <Label htmlFor="nombre">Nombre *</Label>
                            <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                        </div>
                        <div>
                            <Label htmlFor="cargo">Cargo</Label>
                            <Input id="cargo" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej: Supervisor" />
                        </div>
                    </div>
                    <Button onClick={handleAdd} disabled={adding || !nombre.trim()} className="w-full md:w-auto">
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Agregar Responsable
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-card border rounded-md shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <p className="font-medium">{item.nombre}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    {item.cargo && <span>{item.cargo}</span>}
                                    {item.email && <span>• {item.email}</span>}
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {items.length === 0 && <p className="text-center text-muted-foreground py-8">No hay responsables registrados.</p>}
            </div>
        </div>
    )
}
