'use client'
import { formatDate } from "@/lib/utils"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createTarea } from '@/app/actions/tareas'
import { createTipoActividad, getTiposActividad, createResponsable, getResponsables, updateResponsable, deleteResponsable, getCargos, createCargo, deleteCargo, getNombresProducto, createNombreProducto, getCategoriasProducto, createCategoriaProducto } from "@/app/actions/configuracion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Combobox } from "@/components/ui/combobox"
import { QuickCreateDialog } from "@/components/common/QuickCreateDialog"
import { ManageResponsablesDialog } from "@/components/forms/ManageResponsablesDialog"
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
import { ExternalLink, MapPin, Grid3x3, Map as MapIcon } from "lucide-react"
import { PageHeader, type Breadcrumb } from "@/components/layout/PageHeader"
import { rutaSegura } from "@/lib/navegacion"
import { cn } from "@/lib/utils"

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
    nombres: { id: string, nombre: string, categoriaId?: string | null }[]
    categorias: { id: string, nombre: string }[]
}

export function TareaForm({ fincas, lotes, tiposActividad: initialTipos, responsables: initialResponsables, cargos: initialCargos, nombres: initialNombres, categorias: initialCategorias }: TareaFormProps) {
    const router = useRouter()

    // Local state for catalogs
    const [tiposActividad, setTiposActividad] = useState(initialTipos)
    const [responsables, setResponsables] = useState(initialResponsables)
    const [cargos, setCargos] = useState(initialCargos)
    const [nombres, setNombres] = useState(initialNombres)
    const [categorias, setCategorias] = useState(initialCategorias)

    // Memoria de navegación: de dónde viene el usuario define el nivel de la tarea.
    //  - desde un lote  → tarea de ese lote
    //  - desde una finca → tarea general de la finca (puede pasarla a un lote de la misma finca)
    //  - sin contexto (panel, menú) → el usuario elige explícitamente finca o lote
    const searchParams = useSearchParams()
    const initialLoteId = searchParams?.get('loteId') || ""
    let initialFincaId = searchParams?.get('fincaId') || ""
    if (!initialFincaId && initialLoteId) {
        initialFincaId = lotes.find(l => l.id === initialLoteId)?.fincaId || ""
    }
    const origen: "lote" | "finca" | "libre" = initialLoteId ? "lote" : initialFincaId ? "finca" : "libre"
    const returnTo = rutaSegura(searchParams?.get('returnTo'))
    const destino = returnTo
        ?? (origen === "lote" ? `/lotes/${initialLoteId}` : origen === "finca" ? `/fincas/${initialFincaId}` : "/tareas")

    const [selectedFinca, setSelectedFinca] = useState<string>(initialFincaId)
    const [selectedLote, setSelectedLote] = useState<string>(initialLoteId)
    const [nivel, setNivel] = useState<"" | "FINCA" | "LOTE">(origen === "lote" ? "LOTE" : origen === "finca" ? "FINCA" : "")
    const [errorForm, setErrorForm] = useState<string | null>(null)

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
                fechas.push(formatDate(d))
            }
        } else if (fechaFin) {
            const end = new Date(fechaFin + 'T12:00:00')
            let cur = new Date(start)
            let safety = 0
            while (cur <= end && safety < 20) {
                fechas.push(formatDate(cur))
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

    const refreshNombres = async () => {
        const res = await getNombresProducto()
        if (res.data) setNombres(res.data)
    }

    const refreshCategorias = async () => {
        const res = await getCategoriasProducto()
        if (res.data) setCategorias(res.data)
    }

    // Filter lotes based on selected Finca
    const loteOptions = useMemo(() => {
        if (!selectedFinca) return []
        return lotes
            .filter(l => l.fincaId === selectedFinca)
            .map(l => ({ value: l.id, label: `${l.nombre} (${l.codigo})` }))
    }, [selectedFinca, lotes])

    const fincaSeleccionada = fincas.find(f => f.id === selectedFinca)
    const loteSeleccionado = lotes.find(l => l.id === selectedLote)
    const migas: Breadcrumb[] = origen === "lote"
        ? [{ label: "Fincas", href: "/fincas" }, { label: fincaSeleccionada?.nombre ?? "Finca", href: `/fincas/${initialFincaId}` }, { label: loteSeleccionado?.nombre ?? "Lote", href: `/lotes/${initialLoteId}` }, { label: "Nueva tarea" }]
        : origen === "finca"
            ? [{ label: "Fincas", href: "/fincas" }, { label: fincaSeleccionada?.nombre ?? "Finca", href: `/fincas/${initialFincaId}` }, { label: "Nueva tarea" }]
            : [{ label: "Tareas", href: "/tareas" }, { label: "Nueva tarea" }]

    // Options for Comboboxes
    const fincaOptions = fincas.map(f => ({ value: f.id, label: `${f.nombre} (${f.codigo})` }))

    // const nivelOptions = [ // Removed as per instruction
    //     { value: "FINCA", label: "A Nivel de Finca (General)" },
    //     { value: "LOTE", label: "A Nivel de Lote (Específico)" }
    // ]

    // Note: Server expects Names for Tipo and Responsable, not IDs
    const tipoOptions = tiposActividad.map(t => ({ value: t.id, label: t.nombre }))
    const responsableOptions = responsables.map(r => ({ value: r.id, label: r.nombre }))
    const categoriaOptions = categorias.map(c => ({ value: c.nombre, label: c.nombre }))
    const nombreOptions = nombres.map(n => ({ value: n.nombre, label: n.nombre }))

    // Detectar si el tipo seleccionado admite plan masivo
    const tipoNombreSeleccionado = useMemo(() => 
        tiposActividad.find(t => t.id === selectedTipo)?.nombre || ''
    , [selectedTipo, tiposActividad])

    const esFertilizacion = tipoNombreSeleccionado.toLowerCase().includes('fertiliz')

    // Cuando cambia el tipo y ya no es fertilización, cerrar modo masivo
    const handleTipoChange = (val: string) => {
        setSelectedTipo(val)
        const nombre = tiposActividad.find(t => t.id === val)?.nombre || ''
        if (!nombre.toLowerCase().includes('fertiliz')) {
            setModoMasivo(false)
        }
    }

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
        setErrorForm(null)
        const faltante = !nivel ? "Indique si la tarea es para toda la finca o para un lote."
            : !selectedFinca ? "Seleccione la finca."
                : nivel === "LOTE" && !selectedLote ? "Seleccione el lote."
                    : !selectedTipo ? "Seleccione el tipo de actividad."
                        : !selectedResponsable ? "Seleccione el responsable." : null
        if (faltante) {
            setErrorForm(faltante)
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }
        formData.set('nivel', nivel)
        formData.set('loteId', nivel === "LOTE" ? selectedLote : "")
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
                loteId: nivel === "LOTE" ? selectedLote : null,
                nivel: nivel as "FINCA" | "LOTE",
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
        router.push(destino)
        router.refresh()
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

        handleClose()
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="Nueva tarea"
                description={origen === "lote" ? `${loteSeleccionado?.nombre ?? ""} · ${fincaSeleccionada?.nombre ?? ""}`
                    : origen === "finca" ? fincaSeleccionada?.nombre : "Programe una actividad de campo"}
                breadcrumbs={migas}
            />
            {errorForm && (
                <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorForm}</div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Detalles de la Actividad</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">

                        {/* Hidden Inputs for Combobox Data */}
                        <input type="hidden" name="fincaId" value={selectedFinca} />
                        <input type="hidden" name="loteId" value={nivel === "LOTE" ? selectedLote : ""} />
                        <input type="hidden" name="nivel" value={nivel} />
                        <input type="hidden" name="tipo" value={tiposActividad.find(t => t.id === selectedTipo)?.nombre || ""} />
                        <input type="hidden" name="responsable" value={responsables.find(r => r.id === selectedResponsable)?.nombre || ""} />
                        <input type="hidden" name="prioridad" value={selectedPrioridad} />
                        <input type="hidden" name="estado" value={selectedEstado} />
                        {/* <input type="hidden" name="fechaProgramada" value={fechaProgramada?.toISOString() || ""} /> */} {/* Removed, handled by visible input */}

                        {/* ── ¿Dónde se hace la tarea? ── */}
                        {origen === "libre" ? (
                            <div className="space-y-3">
                                <Label>¿Dónde se realizará la tarea? *</Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {([
                                        ["FINCA", MapIcon, "Toda la finca", "Labores generales: vías, cercas, infraestructura…"],
                                        ["LOTE", Grid3x3, "Un lote específico", "Fertilización, cosecha, sanidad de un lote."],
                                    ] as const).map(([valor, Icon, titulo, desc]) => (
                                        <button key={valor} type="button"
                                            onClick={() => { setNivel(valor); if (valor === "FINCA") setSelectedLote(""); setErrorForm(null) }}
                                            className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                                                nivel === valor ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50")}>
                                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", nivel === valor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">{titulo}</div>
                                                <div className="text-xs text-muted-foreground">{desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {nivel && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Finca *</Label>
                                            <Combobox options={fincaOptions} value={selectedFinca}
                                                onSelect={(val) => { setSelectedFinca(val); setSelectedLote("") }}
                                                placeholder="Seleccione una finca…" />
                                        </div>
                                        {nivel === "LOTE" && (
                                            <div className="space-y-2">
                                                <Label>Lote *</Label>
                                                <Combobox options={loteOptions} value={selectedLote} onSelect={setSelectedLote}
                                                    placeholder={!selectedFinca ? "Seleccione la finca primero" : loteOptions.length ? "Seleccione un lote…" : "Esta finca no tiene lotes"}
                                                    disabled={!selectedFinca || loteOptions.length === 0} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    {nivel === "LOTE" ? <Grid3x3 className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium uppercase tracking-wide text-primary">
                                        {nivel === "LOTE" ? "Tarea de lote" : "Tarea general de la finca"}
                                    </div>
                                    {nivel === "LOTE" && origen === "lote" ? (
                                        <div className="text-sm font-semibold">{loteSeleccionado?.nombre} <span className="font-normal text-muted-foreground">({loteSeleccionado?.codigo}) · {fincaSeleccionada?.nombre}</span></div>
                                    ) : (
                                        <div className="text-sm font-semibold"><MapPin className="mr-1 inline h-3.5 w-3.5" />{fincaSeleccionada?.nombre}</div>
                                    )}
                                    {origen === "finca" && nivel === "LOTE" && (
                                        <div className="mt-2 max-w-sm">
                                            <Combobox options={loteOptions} value={selectedLote} onSelect={setSelectedLote}
                                                placeholder={loteOptions.length ? "Seleccione el lote…" : "Esta finca no tiene lotes"} disabled={loteOptions.length === 0} />
                                        </div>
                                    )}
                                </div>
                                {origen === "finca" && loteOptions.length > 0 && (
                                    <Button type="button" variant="outline" size="sm"
                                        onClick={() => { setNivel(nivel === "LOTE" ? "FINCA" : "LOTE"); setSelectedLote("") }}>
                                        {nivel === "LOTE" ? "Es para toda la finca" : "Asignar a un lote"}
                                    </Button>
                                )}
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
                                    onSelect={handleTipoChange}
                                    placeholder="Seleccione tipo..."
                                    searchPlaceholder="Buscar tipo..."
                                    emptyText="No encontrado."
                                />

                                {/* Botón contextual Plan de Fertilización */}
                                {esFertilizacion && (
                                    <button
                                        type="button"
                                        onClick={() => setModoMasivo(m => !m)}
                                        className={`mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                                            modoMasivo
                                                ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/30'
                                                : 'bg-green-50 dark:bg-green-950/30 border-green-500/60 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-500'
                                        }`}
                                    >
                                        <span className="text-base">📅</span>
                                        {modoMasivo
                                            ? '✔ Plan de Fertilización Activo — Click para desactivar'
                                            : 'Plan de Fertilización (Programación Masiva)'}
                                    </button>
                                )}
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

                        {/* ══════════════════════════════════════════════
                           PANEL DE PLAN DE FERTILIZACIÓN (solo visible si modoMasivo)
                           ══════════════════════════════════════════════ */}
                        {modoMasivo && (
                            <div className="rounded-xl border-2 border-green-500/40 bg-green-50/5 dark:bg-green-950/10 overflow-hidden">
                                <div className="bg-green-600 px-4 py-2 flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">📅 Plan de Fertilización</span>
                                    <span className="text-green-200 text-xs ml-auto">Configure la programación recurrente</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Periodicidad y Modo Fin */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Repetir cada (días)</Label>
                                            <Input
                                                type="number" min="1" max="365"
                                                value={periodicidadDias}
                                                onChange={e => setPeriodicidadDias(e.target.value)}
                                                placeholder="Ej: 20"
                                            />
                                            <p className="text-xs text-muted-foreground">Intervalo en días entre cada aplicación</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Definir fin del plan por</Label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setModoFin('repeticiones')}
                                                    className={`flex-1 py-2 px-3 text-sm rounded-md border font-medium transition-colors ${
                                                        modoFin === 'repeticiones'
                                                            ? 'bg-green-600 text-white border-green-600'
                                                            : 'bg-background border-input hover:bg-accent'
                                                    }`}
                                                >
                                                    # Aplicaciones
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setModoFin('fechaFin')}
                                                    className={`flex-1 py-2 px-3 text-sm rounded-md border font-medium transition-colors ${
                                                        modoFin === 'fechaFin'
                                                            ? 'bg-green-600 text-white border-green-600'
                                                            : 'bg-background border-input hover:bg-accent'
                                                    }`}
                                                >
                                                    Fecha Límite
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {modoFin === 'repeticiones' ? (
                                        <div className="space-y-2">
                                            <Label>Número de aplicaciones a generar</Label>
                                            <Input
                                                type="number" min="1" max="100"
                                                value={repeticiones}
                                                onChange={e => setRepeticiones(e.target.value)}
                                                placeholder="Ej: 5"
                                            />
                                            <p className="text-xs text-muted-foreground">Se crearán {repeticiones} tareas iniciando desde la fecha de inicio del plan</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label>Generar aplicaciones hasta</Label>
                                            <DatePicker
                                                value={fechaFin}
                                                onChange={setFechaFin}
                                                placeholder="Seleccione fecha límite del plan"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3 border-t border-green-500/20 pt-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Detalle por Aplicación</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-xs">Insumo / Producto</Label>
                                                    <QuickCreateDialog
                                                        triggerLabel="Administrar"
                                                        title="Nuevo Nombre de Producto"
                                                        description="Agregue un nuevo producto al catálogo global."
                                                        placeholder="Ej: Urea 46%, DAP..."
                                                        action={async (nombre) => {
                                                            // For the plan, we can just create it without a category or find a default one
                                                            return await createNombreProducto(nombre);
                                                        }}
                                                        onSuccess={refreshNombres}
                                                    />
                                                </div>
                                                <Combobox
                                                    options={nombreOptions}
                                                    value={insumo}
                                                    onSelect={setInsumo}
                                                    placeholder="Seleccione o busque insumo..."
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Dosis</Label>
                                                <Input value={dosis} onChange={e => setDosis(e.target.value)} placeholder="Ej: 2gr/mata" className="h-9" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Método de Aplicación</Label>
                                                <Input value={metodo} onChange={e => setMetodo(e.target.value)} placeholder="Ej: Manual, Fumigadora" className="h-9" />
                                            </div>
                                            {/* Empty space for alignment if needed */}
                                            <div></div>
                                        </div>
                                        {(insumo || dosis || metodo) && (
                                            <div className="bg-muted/50 rounded p-2 text-xs font-mono text-muted-foreground border">
                                                <span className="font-semibold text-green-600">Observaciones generadas: </span>
                                                {[insumo && `[INSUMO: ${insumo}]`, dosis && `[DOSIS: ${dosis}]`, metodo && `[MÉTODO: ${metodo}]`].filter(Boolean).join(' | ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Preview de fechas */}
                                    <div className="space-y-2 border-t border-green-500/20 pt-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Vista Previa del Calendario</p>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewFechas(calcPreview())}
                                                className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 font-medium transition-colors"
                                            >
                                                📊 Calcular fechas
                                            </button>
                                        </div>
                                        {previewFechas.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                                {previewFechas.map((f, i) => (
                                                    <span key={i} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300/50 px-2 py-0.5 rounded-full">
                                                        #{i + 1} {f}
                                                    </span>
                                                ))}
                                                {(modoFin === 'repeticiones' && parseInt(repeticiones) > 20) && (
                                                    <span className="text-xs text-muted-foreground px-2 py-0.5">...y {parseInt(repeticiones) - 20} más</span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Presione "Calcular fechas" para previsualizar el plan</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" onClick={() => router.push(destino)}>
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
