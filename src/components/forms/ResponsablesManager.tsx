"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit2, Save, X } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { CatalogManager } from "@/components/common/CatalogManager"

interface Responsable {
    id: string
    nombre: string
    email?: string | null
    celular?: string | null
    cargo?: string | null
    cargoId?: string | null
    cargoRef?: { id: string, nombre: string } | null
}

interface ResponsablesManagerProps {
    responsables: Responsable[]
    cargos: { id: string, nombre: string }[]
    createAction: (nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<{ success?: boolean; error?: string }>
    updateAction: (id: string, nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<{ success?: boolean; error?: string }>
    deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    createCargoAction: (nombre: string) => Promise<{ success?: boolean; error?: string }>
    deleteCargoAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    onRefreshCargos: () => void
    onSuccess: () => void
}

export function ResponsablesManager({
    responsables,
    cargos,
    createAction,
    updateAction,
    deleteAction,
    createCargoAction,
    deleteCargoAction,
    onRefreshCargos,
    onSuccess
}: ResponsablesManagerProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Create State
    const [newName, setNewName] = useState("")
    const [newEmail, setNewEmail] = useState("")
    const [newCelular, setNewCelular] = useState("")
    const [newCargoId, setNewCargoId] = useState("")

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editEmail, setEditEmail] = useState("")
    const [editCelular, setEditCelular] = useState("")
    const [editCargoId, setEditCargoId] = useState("")

    const cargoOptions = cargos.map(c => ({ value: c.id, label: c.nombre }))

    const handleCreate = async () => {
        if (!newName.trim()) return
        setIsLoading(true)
        setError(null)
        const res = await createAction(newName, newEmail, newCargoId, newCelular)
        setIsLoading(false)
        if (res.success) {
            setNewName("")
            setNewEmail("")
            setNewCelular("")
            setNewCargoId("")
            onSuccess()
        } else {
            setError(res.error || "Error desconocido")
        }
    }

    const startEdit = (r: Responsable) => {
        setError(null)
        setEditingId(r.id)
        setEditName(r.nombre)
        setEditEmail(r.email || "")
        setEditCelular(r.celular || "")
        setEditCargoId(r.cargoId || r.cargoRef?.id || "")
    }

    const cancelEdit = () => {
        setError(null)
        setEditingId(null)
        setEditName("")
        setEditEmail("")
        setEditCelular("")
        setEditCargoId("")
    }

    const handleUpdate = async () => {
        if (!editingId || !editName.trim()) return
        setIsLoading(true)
        setError(null)
        const res = await updateAction(editingId, editName, editEmail, editCargoId, editCelular)
        setIsLoading(false)
        if (res.success) {
            cancelEdit()
            onSuccess()
        } else {
            setError(res.error || "Error desconocido")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Está seguro de eliminar este responsable?")) return
        setIsLoading(true)
        setError(null)
        const res = await deleteAction(id)
        setIsLoading(false)
        if (res.success) {
            onSuccess()
        } else {
            setError(res.error || "Error desconocido")
        }
    }

    return (
        <div className="space-y-6 py-4">
            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-lg flex items-center justify-between border border-destructive/20">
                    <p className="text-sm font-medium">{error}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/20" onClick={() => setError(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Create Section */}
            <div className="bg-muted/10 border rounded-xl p-6 space-y-4">
                <h4 className="font-semibold text-base">Agregar Nuevo Responsable</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="newName" className="text-xs font-medium">Nombre *</Label>
                        <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nombre completo"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newEmail" className="text-xs font-medium">Email</Label>
                        <Input
                            id="newEmail"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newCelular" className="text-xs font-medium">Celular</Label>
                        <Input
                            id="newCelular"
                            value={newCelular}
                            onChange={(e) => setNewCelular(e.target.value)}
                            placeholder="Ej: 300 123 4567"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="newCargo" className="text-xs font-medium">Cargo</Label>
                            <CatalogManager
                                triggerLabel="Administrar"
                                title="Administrar Cargos"
                                description="Agregue o elimine cargos de la lista."
                                placeholder="Ej: Veterinario"
                                items={cargos}
                                onCreate={createCargoAction}
                                onDelete={deleteCargoAction}
                                onRefresh={onRefreshCargos}
                            />
                        </div>
                        <Combobox
                            options={cargoOptions}
                            value={newCargoId}
                            onSelect={setNewCargoId}
                            placeholder="Seleccione cargo..."
                            className="w-full"
                        />
                    </div>
                </div>
                <Button className="w-full md:w-auto" onClick={handleCreate} disabled={!newName.trim() || isLoading}>
                    <Plus className="w-4 h-4 mr-2" /> Agregar Responsable
                </Button>
            </div>

            {/* List Section */}
            <div className="space-y-2">
                {responsables.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                        No hay responsables registrados.
                    </div>
                ) : (
                    responsables.map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group">
                            {editingId === r.id ? (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Nombre"
                                        className="h-8"
                                    />
                                    <Input
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="Email"
                                        className="h-8"
                                    />
                                    <Input
                                        value={editCelular}
                                        onChange={(e) => setEditCelular(e.target.value)}
                                        placeholder="Celular"
                                        className="h-8"
                                    />
                                    <div className="flex gap-2 items-center">
                                        <Combobox
                                            options={cargoOptions}
                                            value={editCargoId}
                                            onSelect={setEditCargoId}
                                            placeholder="Cargo"
                                            className="h-8 w-32"
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdate} disabled={isLoading}>
                                            <Save className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEdit} disabled={isLoading}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                            {r.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm text-foreground">{r.nombre}</p>
                                                {(r.cargoRef?.nombre || r.cargo) && (
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                        {r.cargoRef?.nombre || r.cargo}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                                {r.email && <span>{r.email}</span>}
                                                {r.celular && (r.email) && <span>•</span>}
                                                {r.celular && <span className="text-green-600 font-medium">Cel: {r.celular}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEdit(r)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
