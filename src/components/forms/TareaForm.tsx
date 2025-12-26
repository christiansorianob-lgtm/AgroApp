'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createTarea } from '@/app/actions/tareas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import { BackButton } from "@/components/common/BackButton"

// Types for props
interface Finca {
    id: string
    nombre: string
    codigo: string
}

interface Lote {
    id: string
    nombre: string
    codigo: string
    fincaId: string
}

interface TareaFormProps {
    fincas: Finca[]
    lotes: Lote[]
    tiposActividad: { id: string, nombre: string }[]
    responsables: { id: string, nombre: string }[]
}

export function TareaForm({ fincas, lotes, tiposActividad, responsables }: TareaFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize state from URL params
    const initialFincaId = searchParams.get('fincaId') || ""
    const initialLoteId = searchParams.get('loteId') || ""

    const [selectedFinca, setSelectedFinca] = useState<string>(initialFincaId)
    const [selectedLote, setSelectedLote] = useState<string>(initialLoteId)
    const [nivel, setNivel] = useState<"FINCA" | "LOTE">(initialLoteId ? "LOTE" : "FINCA")
    const [loading, setLoading] = useState(false)

    // Filter lotes based on selected Finca
    const filteredLotes = lotes.filter(l => l.fincaId === selectedFinca)

    // Effect to auto-select Finca if only Lote provided
    useEffect(() => {
        if (initialLoteId && !initialFincaId && !selectedFinca) {
            const l = lotes.find(x => x.id === initialLoteId)
            if (l) setSelectedFinca(l.fincaId)
        }
    }, [initialLoteId, initialFincaId, selectedFinca, lotes])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // Validation handled by browser 'required' + server action
        // We just toggle loading state here if needed, but since we use action prop/formAction, 
        // we might not catch the submit event unless we use onSubmit.
        // Let's use onSubmit to be safe to show loading.
        setLoading(true)
        // Note: Actual submission is handled by the form action, but if we intercept it we must call it manually or let it bubble?
        // To keep it simple with server actions + client loading state:
        // We let the action run via the form's action attribute, but we can't easily wait for it without useFormStatus (React generic).
        // Since we are not using useFormStatus here (it requires simpler component structure), 
        // We will just let the form submit normally.
    }

    // Since we are using a Server Action attached to the form, we can't easily set loading state *during* the request on the button directly without useFormStatus.
    // However, createTarea handles redirect, so loading state is just until page unloads.

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <BackButton fallback="/tareas" />
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nueva Tarea</h2>
                    <p className="text-muted-foreground">Programe una actividad de campo</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles de la Actividad</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createTarea as any} onSubmit={() => setLoading(true)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fincaId">Finca (Obligatorio)</Label>
                                {!!initialFincaId && <input type="hidden" name="fincaId" value={selectedFinca} />}
                                <select
                                    id="fincaId"
                                    name={initialFincaId ? undefined : "fincaId"}
                                    required
                                    value={selectedFinca}
                                    onChange={(e) => {
                                        setSelectedFinca(e.target.value)
                                        setSelectedLote("") // Reset lote when finca changes
                                        // If level was LOTE and we change finca, we might want to keep LOTE level or not?
                                        // Keep level, just reset selection.
                                    }}
                                    disabled={!!initialFincaId}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione una Finca...</option>
                                    {fincas.map((finca) => (
                                        <option key={finca.id} value={finca.id}>
                                            {finca.nombre} ({finca.codigo})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nivel">Nivel de la Tarea</Label>
                                <select
                                    id="nivel"
                                    name="nivel"
                                    required
                                    value={nivel}
                                    onChange={(e) => setNivel(e.target.value as "FINCA" | "LOTE")}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="FINCA">A Nivel de Finca (General)</option>
                                    <option value="LOTE">A Nivel de Lote (Específico)</option>
                                </select>
                            </div>
                        </div>

                        {/* Lote Selector - Only if Nivel is LOTE */}
                        {nivel === 'LOTE' && (
                            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                                <Label htmlFor="loteId">Seleccione el Lote</Label>
                                <select
                                    id="loteId"
                                    name="loteId"
                                    required={nivel === 'LOTE'}
                                    value={selectedLote}
                                    onChange={(e) => setSelectedLote(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione un Lote...</option>
                                    {filteredLotes.length > 0 ? (
                                        filteredLotes.map((lote) => (
                                            <option key={lote.id} value={lote.id}>
                                                {lote.nombre} ({lote.codigo})
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No hay lotes en esta finca</option>
                                    )}
                                </select>
                                {!selectedFinca && <p className="text-xs text-muted-foreground">Seleccione una finca primero para ver sus lotes.</p>}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Tarea</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    placeholder="Autogenerado al guardar"
                                    readOnly
                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="tipo">Tipo de Actividad</Label>
                                    <Link href="/configuracion/actividades" className="text-xs text-primary hover:underline">
                                        + Administrar
                                    </Link>
                                </div>
                                <select
                                    id="tipo"
                                    name="tipo"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione tipo...</option>
                                    {tiposActividad.map(t => (
                                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fechaProgramada">Fecha Programada</Label>
                                <Input id="fechaProgramada" name="fechaProgramada" type="date" required />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="responsable">Responsable</Label>
                                    <Link href="/configuracion/responsables" className="text-xs text-primary hover:underline">
                                        + Administrar
                                    </Link>
                                </div>
                                <select
                                    id="responsable"
                                    name="responsable"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Seleccione responsable...</option>
                                    {responsables.map(r => (
                                        <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prioridad">Prioridad</Label>
                                <select
                                    id="prioridad"
                                    name="prioridad"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="MEDIA">Media</option>
                                    <option value="BAJA">Baja</option>
                                    <option value="ALTA">Alta</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estado">Estado Inicial</Label>
                                <select
                                    id="estado"
                                    name="estado"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="PROGRAMADA">Programada</option>
                                    <option value="EN_PROCESO">En Proceso</option>
                                    {/* <option value="EJECUTADA">Ejecutada</option> - Estado reservado para ejecución */}
                                    <option value="CANCELADA">Cancelada</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción</Label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Detalles sobre la labor a realizar..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas adicionales..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/tareas">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={loading}>
                                <Save className="mr-2 w-4 h-4" />
                                {loading ? 'Guardando...' : 'Guardar Tarea'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
