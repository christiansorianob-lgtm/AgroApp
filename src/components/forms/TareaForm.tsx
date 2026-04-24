'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createTarea } from '@/app/actions/tareas'
import { createTipoActividad, getTiposActividad, createResponsable, getResponsables, updateResponsable, deleteResponsable, getCargos, createCargo, deleteCargo } from "@/app/actions/configuracion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Combobox } from "@/components/ui/combobox"
import { QuickCreateDialog } from "@/components/common/QuickCreateDialog"
import { ManageResponsablesDialog } from "@/components/forms/ManageResponsablesDialog"
import { GoBackButton } from "@/components/ui/GoBackButton"
import { DatePicker } from "@/components/ui/DatePicker"
import { createTareasMasivas } from "@/app/actions/tareas"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink } from "lucide-react"

// ... imports

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
    responsables: { id: string, nombre: string, celular?: string | null }[]
    cargos: { id: string, nombre: string }[]
}

export function TareaForm({ fincas, lotes, tiposActividad: initialTipos, responsables: initialResponsables, cargos: initialCargos }: TareaFormProps) {
    const router = useRouter()

    // Local state for catalogs
    const [tiposActividad, setTiposActividad] = useState(initialTipos)
    const [responsables, setResponsables] = useState(initialResponsables)
    const [cargos, setCargos] = useState(initialCargos)

    // Initialize state from URL params (removed as per instruction, but keeping the original logic for selectedFinca/Lote if no initial value is provided)
    // const initialFincaId = searchParams.get('fincaId') || ""
    // const initialLoteId = searchParams.get('loteId') || ""

    const searchParams = useSearchParams()
    const initialLoteId = searchParams?.get('loteId') || ""
    let initialFincaId = searchParams?.get('fincaId') || ""

    // Si viene loteId pero no fincaId, deducir la finca a partir del lote
    if (!initialFincaId && initialLoteId) {
        const foundLote = lotes.find(l => l.id === initialLoteId)
        if (foundLote) {
            initialFincaId = foundLote.fincaId
        }
    }

    const [selectedFinca, setSelectedFinca] = useState<string>(initialFincaId)
    const [selectedLote, setSelectedLote] = useState<string>(initialLoteId)
    // const [nivel, setNivel] = useState<"FINCA" | "LOTE">(initialLoteId ? "LOTE" : "FINCA") // Removed as per instruction

    // Controlled states for other Comboboxes
    const [selectedTipo, setSelectedTipo] = useState("")
    const [selectedResponsable, setSelectedResponsable] = useState("")
    const [selectedPrioridad, setSelectedPrioridad] = useState("MEDIA")
    const [selectedEstado, setSelectedEstado] = useState("PROGRAMADA")
    // Changed to string for input type="date"
    const today = new Date()
    const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const [fechaProgramada, setFechaProgramada] = useState(todayISO)

    // Programación Masiva
    const [modoMasivo, setModoMasivo] = useState(false)
    const [periodicidadDias, setPeriodicidadDias] = useState("20")
    const [modoFin, setModoFin] = useState<'repeticiones' | 'fechaFin'>('repeticiones')
    const [repeticiones, setRepeticiones] = useState("5")
    const [fechaFin, setFechaFin] = useState("")
    // Detalle técnico
    const [insumo, setInsumo] = useState("")
    const [dosis, setDosis] = useState("")
    const [metodo, setMetodo] = useState("")
    // Vista previa de fechas
    const [previewFechas, setPreviewFechas] = useState<string[]>([])

    // Calcular preview de fechas cuando cambian los parámetros
    const calcPreview = () => {
        const fechas: string[] = []
        if (!fechaProgramada || !periodicidadDias || parseInt(periodicidadDias) < 1) return []
        const start = new Date(fechaProgramada + 'T12:00:00')
        const dias = parseInt(periodicidadDias)
        if (modoFin === 'repeticiones') {
            const reps = parseInt(repeticiones) || 0
            for (let i = 0; i < Math.min(reps, 20); i++) {
                const d = new Date(start)
                d.setDate(d.getDate() + i * dias)
                fechas.push(d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }))
            }
        } else if (fechaFin) {
            const end = new Date(fechaFin + 'T12:00:00')
            let cur = new Date(start)
            let safety = 0
            while (cur <= end && safety < 20) {
                fechas.push(cur.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }))
                cur.setDate(cur.getDate() + dias)
                safety++
            }
        }
        return fechas
    }

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createdTask, setCreatedTask] = useState<{ id: string, responsableId: string, tipo: string, fincaNombre: string } | null>(null)

    // Data Refresh Handlers
    const refreshTipos = async () => {
        const res = await getTiposActividad()
        if (res.data) setTiposActividad(res.data)
    }

    const refreshResponsables = async () => {
        const res = await getResponsables()
        if (res.data) setResponsables(res.data)
    }

    const refreshCargos = async () => {
        const res = await getCargos()
        if (res.data) setCargos(res.data)
    }

    // Filter lotes based on selected Finca
    const loteOptions = useMemo(() => {
        if (!selectedFinca) return []
        return lotes
            .filter(l => l.fincaId === selectedFinca)
            .map(l => ({ value: l.id, label: `${l.nombre} (${l.codigo})` }))
    }, [selectedFinca, lotes])

    // Options for Comboboxes
    const fincaOptions = fincas.map(f => ({ value: f.id, label: `${f.nombre} (${f.codigo})` }))

    // const nivelOptions = [ // Removed as per instruction
    //     { value: "FINCA", label: "A Nivel de Finca (General)" },
    //     { value: "LOTE", label: "A Nivel de Lote (Específico)" }
    // ]

    // Note: Server expects Names for Tipo and Responsable, not IDs
    const tipoOptions = tiposActividad.map(t => ({ value: t.id, label: t.nombre }))
    const responsableOptions = responsables.map(r => ({ value: r.id, label: r.nombre }))

    const prioridadOptions = [
        { value: "ALTA", label: "Alta" },
        { value: "MEDIA", label: "Media" },
        { value: "BAJA", label: "Baja" }
    ]

    const estadoOptions = [
        { value: "PROGRAMADA", label: "Programada" },
        { value: "EN_PROCESO", label: "En Progreso" },
        { value: "CANCELADA", label: "Cancelada" }
    ]

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)

        // Construir las observaciones (con detalle técnico si aplica)
        let obsBase = (formData.get('observaciones') as string) || ''
        const parts = []
        if (insumo) parts.push(`[INSUMO: ${insumo}]`)
        if (dosis) parts.push(`[DOSIS: ${dosis}]`)
        if (metodo) parts.push(`[MÉTODO: ${metodo}]`)
        if (parts.length > 0) obsBase = parts.join(' | ') + (obsBase ? ' | ' + obsBase : '')

        if (modoMasivo) {
            // --- MODO MASIVO ---
            const result = await createTareasMasivas({
                fincaId: selectedFinca,
                loteId: selectedLote || null,
                tipo: tiposActividad.find(t => t.id === selectedTipo)?.nombre || '',
                responsable: responsables.find(r => r.id === selectedResponsable)?.nombre || '',
                prioridad: selectedPrioridad,
                fechaInicio: fechaProgramada,
                periodicidadDias: parseInt(periodicidadDias) || 20,
                modoFin,
                repeticiones: parseInt(repeticiones) || undefined,
                fechaFin: fechaFin || undefined,
                observacionesBase: obsBase,
                requiereTrazabilidad: formData.get('requiereTrazabilidad') === 'on'
            })
            setIsSubmitting(false)
            if (result?.error) {
                alert(result.error)
            } else {
                const finca = fincas.find(f => f.id === selectedFinca)
                setCreatedTask({
                    id: 'plan',
                    responsableId: selectedResponsable,
                    tipo: `Plan Masivo (${result.count} tareas)`,
                    fincaNombre: finca?.nombre || 'Finca'
                })
            }
        } else {
            // --- MODO SIMPLE ---
            formData.set('observaciones', obsBase)
            const result = await createTarea(formData)
            if (result?.error) {
                alert(result.error)
                setIsSubmitting(false)
            } else {
                const finca = fincas.find(f => f.id === selectedFinca)
                setCreatedTask({
                    id: "new",
                    responsableId: selectedResponsable,
                    tipo: tiposActividad.find(t => t.id === selectedTipo)?.nombre || "Tarea",
                    fincaNombre: finca?.nombre || "Finca"
                })
                setIsSubmitting(false)
            }
        }
    }

    const handleClose = () => {
        router.back()
    }

    const handleNotify = () => {
        if (!createdTask) return

        const resp = responsables.find(r => r.id === createdTask.responsableId)
        if (resp && resp.celular) {
            const message = `Hola ${resp.nombre}, se te ha asignado una nueva tarea: *${createdTask.tipo}* en *${createdTask.fincaNombre}*`
            // const deepLink = `agroapp://tasks` // Future integration
            const whatsappUrl = `https://wa.me/57${resp.celular}?text=${encodeURIComponent(message)}`
            window.open(whatsappUrl, '_blank')
        }

        if (window.history.length > 2) {
            router.back()
        } else {
            router.push("/tareas")
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <GoBackButton fallbackRoute="/tareas" />
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
                    <form action={handleSubmit} className="space-y-6">

                        {/* Hidden Inputs for Combobox Data */}
                        <input type="hidden" name="fincaId" value={selectedFinca} />
                        <input type="hidden" name="loteId" value={selectedLote} />
                        {/* <input type="hidden" name="nivel" value={nivel} /> */} {/* Removed */}
                        <input type="hidden" name="tipo" value={tiposActividad.find(t => t.id === selectedTipo)?.nombre || ""} />
                        <input type="hidden" name="responsable" value={responsables.find(r => r.id === selectedResponsable)?.nombre || ""} />
                        <input type="hidden" name="prioridad" value={selectedPrioridad} />
                        <input type="hidden" name="estado" value={selectedEstado} />
                        {/* <input type="hidden" name="fechaProgramada" value={fechaProgramada?.toISOString() || ""} /> */} {/* Removed, handled by visible input */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fincaId">Finca (Obligatorio)</Label>
                                <Combobox
                                    options={fincaOptions}
                                    value={selectedFinca}
                                    onSelect={(val) => {
                                        setSelectedFinca(val)
                                        setSelectedLote("") // Reset lote
                                    }}
                                    placeholder="Seleccione una Finca..."
                                    searchPlaceholder="Buscar finca..."
                                    emptyText="No encontrada."
                                    disabled={!!initialFincaId}
                                />
                            </div>

                            {/* Removed Nivel selector as per instruction */}
                            {/* <div className="space-y-2">
                                <Label htmlFor="nivel">Nivel de la Tarea</Label>
                                <Combobox
                                    options={nivelOptions}
                                    value={nivel}
                                    onSelect={(val) => setNivel(val as "FINCA" | "LOTE")}
                                    placeholder="Seleccione nivel..."
                                    searchPlaceholder="Buscar nivel..."
                                    emptyText="No encontrado."
                                />
                            </div> */}
                        </div>

                        {/* Lote Selector - Hidden if creating task strictly for Finca (context mode) */}
                        {!(initialFincaId && !initialLoteId) && (
                            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                                <Label htmlFor="loteId">Seleccione el Lote (Opcional)</Label>
                                <Combobox
                                    options={loteOptions}
                                    value={selectedLote}
                                    onSelect={setSelectedLote}
                                    placeholder={selectedFinca ? "Seleccione un Lote..." : "Seleccione una finca primero"}
                                    searchPlaceholder="Buscar lote..."
                                    emptyText={selectedFinca ? "No hay lotes en esta finca." : "Seleccione una finca primero."}
                                    disabled={!selectedFinca || loteOptions.length === 0 || !!initialLoteId}
                                />
                                {!selectedFinca && <p className="text-xs text-muted-foreground">Seleccione una finca primero para ver sus lotes.</p>}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="tipo">Tipo de Actividad</Label>
                                    <QuickCreateDialog
                                        triggerLabel="Administrar"
                                        title="Nuevo Tipo de Actividad"
                                        description="Agregue un nuevo tipo de actividad para las tareas."
                                        placeholder="Ej: Fertilización"
                                        action={createTipoActividad}
                                        onSuccess={refreshTipos}
                                    />
                                </div>
                                <Combobox
                                    options={tipoOptions}
                                    value={selectedTipo}
                                    onSelect={setSelectedTipo}
                                    placeholder="Seleccione tipo..."
                                    searchPlaceholder="Buscar tipo..."
                                    emptyText="No encontrado."
                                />
                            </div>
                        <div className="space-y-2">
                                <Label htmlFor="fechaProgramada">{modoMasivo ? 'Fecha de Inicio del Plan' : 'Fecha Programada'}</Label>
                                <DatePicker
                                    value={fechaProgramada}
                                    onChange={setFechaProgramada}
                                    placeholder="Seleccionar fecha"
                                />
                                <input type="hidden" name="fechaProgramada" value={fechaProgramada} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="responsable">Responsable</Label>
                                    <ManageResponsablesDialog
                                        responsables={responsables as any} // Cast to match interface if needed or fix interface
                                        cargos={cargos}
                                        createAction={createResponsable}
                                        updateAction={updateResponsable}
                                        deleteAction={deleteResponsable}
                                        createCargoAction={createCargo}
                                        deleteCargoAction={deleteCargo}
                                        onRefreshCargos={refreshCargos}
                                        onSuccess={refreshResponsables}
                                    />
                                </div>
                                <Combobox
                                    options={responsableOptions}
                                    value={selectedResponsable}
                                    onSelect={setSelectedResponsable}
                                    placeholder="Seleccione responsable..."
                                    searchPlaceholder="Buscar responsable..."
                                    emptyText="No encontrado."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prioridad">Prioridad</Label>
                                    <Combobox
                                        options={prioridadOptions}
                                        value={selectedPrioridad}
                                        onSelect={setSelectedPrioridad}
                                        placeholder="Seleccione prioridad..."
                                        searchPlaceholder="Buscar prioridad..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="estado">Estado Inicial</Label>
                                    <Combobox
                                        options={estadoOptions}
                                        value={selectedEstado}
                                        onSelect={setSelectedEstado}
                                        placeholder="Seleccione estado..."
                                        searchPlaceholder="Buscar estado..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas adicionales..." />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="requiereTrazabilidad"
                                    name="requiereTrazabilidad"
                                    defaultChecked
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <Label htmlFor="requiereTrazabilidad">Requiere Trazabilidad GPS (Seguimiento de Operario)</Label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                                Activa el rastreo continuo de ubicación durante la ejecución. Recomendado para campo.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className={modoMasivo ? 'bg-green-600 hover:bg-green-700' : ''}>
                                {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                                {modoMasivo
                                    ? `Generar Plan (${modoFin === 'repeticiones' ? repeticiones + ' tareas' : 'por fechas'})`
                                    : 'Guardar Tarea'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={!!createdTask} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¡Tarea Creada!</DialogTitle>
                        <DialogDescription>
                            La actividad se ha programado correctamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-2">
                            ¿Deseas notificar al responsable vía WhatsApp ahora mismo?
                        </p>
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="secondary" onClick={handleClose}>
                            No, salir
                        </Button>
                        <Button onClick={handleNotify} className="bg-green-600 hover:bg-green-700">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Notificar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
