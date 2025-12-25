'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTarea } from '@/app/actions/tareas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

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
}

export function TareaForm({ fincas, lotes }: TareaFormProps) {
    const router = useRouter()
    const [selectedFinca, setSelectedFinca] = useState<string>("")
    const [nivel, setNivel] = useState<"FINCA" | "LOTE">("FINCA")
    const [loading, setLoading] = useState(false)

    // Filter lotes based on selected Finca
    const filteredLotes = lotes.filter(l => l.fincaId === selectedFinca)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        // We use the browser's default form submission behavior to the server action
        // But we wrap it here if we wanted client-side validation first.
        // For now, simpler to just let the action trigger via form action prop
        // but since we have dynamic state (nivel), we need to ensure the hidden inputs or values match.
        // Actually, native form inputs work fine if they have `name` attributes.

        const formData = new FormData(event.currentTarget)
        await createTarea(formData)
        setLoading(false)
        // Server action handles redirect, but if not, we can router.push
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/tareas">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
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
                    {/* We use onSubmit to show loading state or custom logic, passed to action */}
                    <form action={createTarea} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fincaId">Finca (Obligatorio)</Label>
                                <select
                                    id="fincaId"
                                    name="fincaId"
                                    required
                                    value={selectedFinca}
                                    onChange={(e) => setSelectedFinca(e.target.value)}
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
                                <Input id="codigo" name="codigo" placeholder="Ej: TAR-001" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipo">Tipo de Actividad</Label>
                                <Input id="tipo" name="tipo" placeholder="Ej: Fertilización, Poda, Riego" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fechaProgramada">Fecha Programada</Label>
                                <Input id="fechaProgramada" name="fechaProgramada" type="date" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="responsable">Responsable</Label>
                                <Input id="responsable" name="responsable" placeholder="Quién ejecuta la tarea" required />
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
                                    <option value="EJECUTADA">Ejecutada</option>
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
