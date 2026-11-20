"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit2, Save, X, KeyRound, Power, UserCheck, Info } from "lucide-react"
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
    usuario?: { activo: boolean, debeCambiarPassword: boolean, ultimoIngreso: Date | string | null } | null
}

type Resultado = { success?: boolean; error?: string; mensaje?: string }

/** Acciones de acceso a la plataforma: solo se pasan en Configuración (desarrollador). */
export interface AccionesAcceso {
    darAcceso: (responsableId: string) => Promise<Resultado>
    restablecer: (responsableId: string) => Promise<Resultado>
    cambiar: (responsableId: string, activo: boolean) => Promise<Resultado>
}

interface ResponsablesManagerProps {
    responsables: Responsable[]
    cargos: { id: string, nombre: string }[]
    createAction: (nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<Resultado>
    updateAction: (id: string, nombre: string, email?: string, cargoId?: string, celular?: string) => Promise<Resultado>
    deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    createCargoAction: (nombre: string) => Promise<{ success?: boolean; error?: string }>
    deleteCargoAction: (id: string) => Promise<{ success?: boolean; error?: string }>
    onRefreshCargos: () => void
    onSuccess: () => void
    acceso?: AccionesAcceso
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
    onSuccess,
    acceso
}: ResponsablesManagerProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)

    const ejecutarAcceso = async (accion: () => Promise<Resultado>, confirmar?: string) => {
        if (confirmar && !confirm(confirmar)) return
        setIsLoading(true); setError(null); setInfo(null)
        const res = await accion()
        setIsLoading(false)
        if (res.error) setError(res.error)
        else { if (res.mensaje) setInfo(res.mensaje); onSuccess() }
    }

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
        setInfo(null)
        const res = await createAction(newName, newEmail, newCargoId, newCelular)
        setIsLoading(false)
        if (res.success) {
            if (res.mensaje) setInfo(`${newName.trim()}: ${res.mensaje}`)
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
        setInfo(null)
        const res = await updateAction(editingId, editName, editEmail, editCargoId, editCelular)
        setIsLoading(false)
        if (res.success) {
            if (res.mensaje) setInfo(`${editName.trim()}: ${res.mensaje}`)
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

            {info && (
                <div className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                    <p className="flex gap-2 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0" /> {info}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-emerald-100" onClick={() => setInfo(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Create Section */}
            <div className="bg-muted/10 border rounded-xl p-4 sm:p-6 space-y-4">
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
                        <div key={r.id} className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group sm:flex-row sm:items-center sm:justify-between">
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
                                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                            {r.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                                            {acceso && <EstadoAcceso r={r} />}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-t pt-2 opacity-100 transition-opacity sm:border-t-0 sm:pt-0 md:opacity-0 md:group-hover:opacity-100">
                                        {acceso && !r.usuario && r.celular && (
                                            <Button size="sm" variant="outline" className="h-8" disabled={isLoading}
                                                onClick={() => ejecutarAcceso(() => acceso.darAcceso(r.id))}>
                                                <UserCheck className="mr-1.5 h-4 w-4" /> Dar acceso
                                            </Button>
                                        )}
                                        {acceso && r.usuario && (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={isLoading}
                                                    title="Restablecer contraseña"
                                                    onClick={() => ejecutarAcceso(() => acceso.restablecer(r.id), `¿Restablecer la contraseña de ${r.nombre}? Quedará en la contraseña inicial y deberá cambiarla al ingresar.`)}>
                                                    <KeyRound className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" disabled={isLoading}
                                                    className={r.usuario.activo ? "h-8 w-8 text-muted-foreground hover:text-destructive" : "h-8 w-8 text-emerald-600 hover:text-emerald-700"}
                                                    title={r.usuario.activo ? "Desactivar acceso" : "Activar acceso"}
                                                    onClick={() => ejecutarAcceso(() => acceso.cambiar(r.id, !r.usuario!.activo),
                                                        r.usuario!.activo ? `¿Desactivar el acceso de ${r.nombre}? No podrá ingresar hasta que lo active de nuevo.` : undefined)}>
                                                    <Power className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
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

function EstadoAcceso({ r }: { r: Responsable }) {
    const u = r.usuario
    const [texto, cls] = !r.celular ? ["Sin acceso: falta el celular", "bg-muted text-muted-foreground"]
        : !u ? ["Sin acceso", "bg-muted text-muted-foreground"]
            : !u.activo ? ["Acceso desactivado", "bg-red-50 text-red-700"]
                : u.debeCambiarPassword ? ["Puede ingresar · contraseña inicial", "bg-amber-50 text-amber-800"]
                    : ["Puede ingresar", "bg-emerald-50 text-emerald-700"]
    return (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded px-1.5 py-0.5 font-medium ${cls}`}>{texto}</span>
            {u?.ultimoIngreso && <span className="text-muted-foreground">Último ingreso: {new Date(u.ultimoIngreso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>}
        </div>
    )
}
