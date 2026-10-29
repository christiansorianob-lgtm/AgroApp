'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { rutaSegura } from "@/lib/navegacion"
import { limpiarRecorrido } from "@/components/geo/useGpsSurvey"
import { cn } from "@/lib/utils"
import { Loader2, Save, AlertCircle, LocateFixed, Sprout, Warehouse, Home, Trees, Shapes } from "lucide-react"
import { ViveroMaterialesEditor, filaVacia, type FilaVivero } from "@/components/forms/ViveroMaterialesEditor"
import { FINALIDADES, USOS_INFRAESTRUCTURA, formatEntero, type Finalidad, type EtapaVivero } from "@/lib/cultivos"
import { createLote, updateLote, type LoteInput } from "@/app/actions/lotes"
import { getTiposCultivo, createTipoCultivo } from "@/app/actions/cultivos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/DatePicker"
import { QuickCreateDialog } from "@/components/common/QuickCreateDialog"
import { BoundaryField } from "@/components/geo/BoundaryField"
import { FormSection } from "@/components/layout/PageHeader"
import { computeMetrics, normalizeGeometry, formatHa, type BoundaryValue } from "@/lib/geo"

interface LoteRef { id: string; nombre: string; codigo: string; geometria: unknown }
export interface FincaRef {
    id: string
    nombre: string
    codigo: string
    geometria: unknown
    latitud: number | null
    longitud: number | null
    lotes: LoteRef[]
}
interface TipoCultivo {
    id: string
    nombre: string
    especies?: { id: string; nombre: string; nombreComun: string | null }[]
    variedades: { id: string; nombre: string; especieId?: string | null; casaGenetica?: string | null }[]
}

export interface LoteFormData {
    id: string
    fincaId: string
    codigo: string
    nombre: string
    areaHa: number
    finalidad?: Finalidad
    usoDetalle?: string | null
    numeroPlantas?: number | null
    materialesVivero?: { tipoCultivo: string; especie: string | null; variedad: string | null; casaGenetica: string | null; opcionesGeneticas?: string[]; etapa: EtapaVivero; ubicacion?: string | null; cantidad: number; fechaIngreso: Date | string | null }[]
    tipoCultivo: string | null
    especie?: string | null
    variedad: string | null
    casaGenetica?: string | null
    opcionesGeneticas?: string[]
    nombreComercial?: string | null
    fechaSiembra: Date | string | null
    estado: "ACTIVO" | "INACTIVO" | "EN_RENOVACION"
    observaciones: string | null
    latitud: number | null
    longitud: number | null
    geometria: unknown
    metodoGeorreferenciacion: BoundaryValue["metodo"] | null
    precisionM: number | null
}

const toISODate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "")
const selectCls = "flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"

interface OpcionGenetica { id: string; codigo: string; nombre: string; grupo: string; casaGenetica: string; descripcion: string | null }

export function LoteForm({ fincas, tiposCultivo: tiposIniciales, opcionesGeneticas = [], lote, fincaIdInicial }: {
    fincas: FincaRef[]
    tiposCultivo: TipoCultivo[]
    opcionesGeneticas?: OpcionGenetica[]
    lote?: LoteFormData
    fincaIdInicial?: string
}) {
    const router = useRouter()
    const editando = !!lote
    const returnTo = rutaSegura(useSearchParams()?.get("returnTo"))

    const [tipos, setTipos] = useState(tiposIniciales)
    const [fincaId, setFincaId] = useState(lote?.fincaId ?? fincaIdInicial ?? "")
    const [form, setForm] = useState({
        nombre: lote?.nombre ?? "",
        areaHa: lote ? String(lote.areaHa) : "",
        tipoCultivo: lote?.tipoCultivo ?? "",
        especie: lote?.especie ?? "",
        variedad: lote?.variedad ?? "",
        casaGenetica: lote?.casaGenetica ?? "",
        nombreComercial: lote?.nombreComercial ?? "",
        fechaSiembra: toISODate(lote?.fechaSiembra),
        estado: lote?.estado ?? "ACTIVO",
        observaciones: lote?.observaciones ?? "",
    })
    const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

    // Finalidad: define qué datos pide el formulario
    const [finalidad, setFinalidad] = useState<Finalidad>(lote?.finalidad ?? "SIEMBRA")
    const [usoDetalle, setUsoDetalle] = useState(lote?.usoDetalle ?? "")
    const [numeroPlantas, setNumeroPlantas] = useState(lote?.numeroPlantas != null ? String(lote.numeroPlantas) : "")
    const [filasVivero, setFilasVivero] = useState<FilaVivero[]>(() =>
        lote?.materialesVivero?.length
            ? lote.materialesVivero.map(m => ({
                ...filaVacia(m.etapa, m.tipoCultivo), especie: m.especie ?? "", variedad: m.variedad ?? "", casaGenetica: m.casaGenetica ?? "",
                opciones: m.opcionesGeneticas ?? [], ubicacion: m.ubicacion ?? "", cantidad: String(m.cantidad), fechaIngreso: toISODate(m.fechaIngreso),
            }))
            : [filaVacia("PREVIVERO")])

    const geometriaInicial = normalizeGeometry(lote?.geometria)
    const [lindero, setLindero] = useState<BoundaryValue | null>(
        geometriaInicial ? { geometria: geometriaInicial, metodo: lote?.metodoGeorreferenciacion || "DIBUJO_MAPA", precisionM: lote?.precisionM } : null,
    )
    const [linderoTocado, setLinderoTocado] = useState(false)
    const storageKey = `agroapp:recorrido:lote:${lote?.id ?? `nuevo-${fincaId}`}`
    const pendienteGuardar = linderoTocado

    // Avisar antes de salir si el lindero (p. ej. un recorrido GPS) no se ha guardado
    useEffect(() => {
        if (!pendienteGuardar) return
        const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
        window.addEventListener("beforeunload", aviso)
        return () => window.removeEventListener("beforeunload", aviso)
    }, [pendienteGuardar])
    const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(
        lote?.latitud != null && lote?.longitud != null ? { lat: lote.latitud, lng: lote.longitud } : null,
    )
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const finca = fincas.find(f => f.id === fincaId)
    const fincaGeom = useMemo(() => normalizeGeometry(finca?.geometria), [finca])
    const vecinos = useMemo(() => (finca?.lotes || [])
        .filter(l => l.id !== lote?.id)
        .map(l => ({ nombre: `${l.codigo} ${l.nombre}`, geometria: normalizeGeometry(l.geometria)! }))
        .filter(l => l.geometria), [finca, lote?.id])

    const siguienteCodigo = useMemo(() => {
        const max = (finca?.lotes || []).reduce((n, l) => {
            const num = parseInt(l.codigo.replace(/^L-/, ""), 10)
            return Number.isFinite(num) && num > n ? num : n
        }, 0)
        return `L-${String(max + 1).padStart(2, "0")}`
    }, [finca])

    // Clasificación: cultivo → especie → variedad/cruce → casa genética
    const tipoSel = tipos.find(t => t.nombre === form.tipoCultivo)
    const especies = tipoSel?.especies ?? []
    const especieSel = especies.find(e => e.nombre === form.especie)
    const variedades = (tipoSel?.variedades ?? []).filter(v => !especieSel || !v.especieId || v.especieId === especieSel.id)
    const [opciones, setOpciones] = useState<string[]>(lote?.opcionesGeneticas ?? [])
    // Opciones de la casa genética del material (o todas si aún no hay casa)
    const opcionesDisponibles = opcionesGeneticas.filter(o => !form.casaGenetica || o.casaGenetica === form.casaGenetica)
    const alternarOpcion = (codigo: string) => setOpciones(o => o.includes(codigo) ? o.filter(c => c !== codigo) : [...o, codigo])
    const elegirVariedad = (nombre: string) => {
        const v = tipoSel?.variedades.find(x => x.nombre === nombre)
        const esp = v?.especieId ? especies.find(e => e.id === v.especieId)?.nombre : undefined
        setForm(f => ({ ...f, variedad: nombre, casaGenetica: v?.casaGenetica ?? "", especie: esp ?? f.especie }))
    }
    const areaMedida = useMemo(() => {
        const g = normalizeGeometry(lindero?.geometria)
        return g ? computeMetrics(g).areaHa : null
    }, [lindero])

    const areaParaDensidad = Number(form.areaHa.replace(",", ".")) || areaMedida || 0
    const densidad = areaParaDensidad > 0 && parseInt(numeroPlantas, 10) > 0 ? parseInt(numeroPlantas, 10) / areaParaDensidad : null

    const contexto = useMemo(() => ({
        padre: fincaGeom ? { nombre: `la finca ${finca!.nombre}`, geometria: fincaGeom } : null,
        vecinos,
        areaDeclaradaHa: form.areaHa ? Number(form.areaHa.replace(",", ".")) : null,
        centro: ubicacion ?? (finca?.latitud != null && finca?.longitud != null ? { lat: finca.latitud, lng: finca.longitud } : null),
    }), [fincaGeom, finca, vecinos, form.areaHa, ubicacion])

    const ubicarme = () => {
        navigator.geolocation?.getCurrentPosition(
            p => setUbicacion({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => setError("No se pudo obtener la ubicación del dispositivo."),
            { enableHighAccuracy: true, timeout: 15000 },
        )
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const areaTxt = form.areaHa.trim().replace(",", ".")
        const payload: LoteInput = {
            fincaId,
            nombre: form.nombre,
            areaHa: areaTxt ? Number(areaTxt) : null,
            finalidad,
            usoDetalle,
            numeroPlantas: numeroPlantas ? parseInt(numeroPlantas, 10) : null,
            materialesVivero: filasVivero.filter(f => f.tipoCultivo || f.cantidad).map(f => ({
                tipoCultivo: f.tipoCultivo, especie: f.especie || null, variedad: f.variedad || null, casaGenetica: f.casaGenetica || null,
                opcionesGeneticas: f.opciones,
                etapa: f.etapa, ubicacion: f.ubicacion || null, cantidad: parseInt(f.cantidad, 10) || 0, fechaIngreso: f.fechaIngreso || null,
            })),
            tipoCultivo: form.tipoCultivo,
            especie: form.especie || null,
            variedad: form.variedad || null,
            casaGenetica: form.casaGenetica || null,
            opcionesGeneticas: opciones,
            nombreComercial: form.nombreComercial,
            fechaSiembra: form.fechaSiembra || null,
            estado: form.estado as LoteInput["estado"],
            observaciones: form.observaciones,
            ubicacion,
            lindero: editando && !linderoTocado ? undefined : lindero,
        }
        setGuardando(true)
        const res = editando ? await updateLote(lote!.id, payload) : await createLote(payload)
        setGuardando(false)
        if (res.error) {
            setError(res.error)
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }
        // Ya quedó en la base de datos: se libera el respaldo del recorrido GPS del teléfono
        limpiarRecorrido(storageKey)
        setLinderoTocado(false)
        router.push(returnTo ?? (editando ? `/lotes/${lote!.id}` : `/fincas/${fincaId}`))
        router.refresh()
    }

    return (
        <form onSubmit={onSubmit} className="pb-24">
            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            <div className="rounded-xl border border-border bg-card px-5 shadow-sm md:px-8">
                <FormSection title="Identificación" description="Finca a la que pertenece y nombre del lote.">
                    <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                        <div className="space-y-2">
                            <Label htmlFor="finca">Finca *</Label>
                            <select id="finca" className={selectCls} value={fincaId} onChange={e => setFincaId(e.target.value)} disabled={editando} required>
                                <option value="">Seleccione una finca…</option>
                                {fincas.map(f => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="codigo">Código</Label>
                            <Input id="codigo" value={editando ? lote!.codigo : fincaId ? siguienteCodigo : "—"} disabled readOnly
                                className="bg-muted/60 font-mono" title="Se asigna automáticamente" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del lote *</Label>
                            <Input id="nombre" value={form.nombre} onChange={e => set("nombre")(e.target.value)} placeholder="Ej: Lote El Palmar" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <select id="estado" className={selectCls} value={form.estado} onChange={e => set("estado")(e.target.value)}>
                                <option value="ACTIVO">Activo</option>
                                <option value="EN_RENOVACION">En renovación</option>
                                <option value="INACTIVO">Inactivo</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {editando ? "El código del lote no se puede modificar." : "El código se asigna automáticamente al guardar, en orden dentro de la finca."}
                    </p>
                </FormSection>

                <FormSection title="Finalidad del lote" description="Para qué se usa esta área. Según la finalidad se piden distintos datos.">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {FINALIDADES.map(f => {
                            const Icon = { SIEMBRA: Sprout, VIVERO: Warehouse, INFRAESTRUCTURA: Home, CONSERVACION: Trees, OTRO: Shapes }[f.valor]
                            const activa = finalidad === f.valor
                            return (
                                <button key={f.valor} type="button" onClick={() => setFinalidad(f.valor)} aria-pressed={activa}
                                    className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                                        activa ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50")}>
                                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", activa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold">{f.nombre}</div>
                                        <div className="text-xs text-muted-foreground">{f.descripcion}</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    {editando && lote?.finalidad === "VIVERO" && finalidad !== "VIVERO" && (
                        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">Al guardar con otra finalidad se borrará el inventario del vivero de este lote.</p>
                    )}
                </FormSection>

                {finalidad === "SIEMBRA" && (
                <FormSection title="Cultivo" description="Cultivo, especie, variedad o cruce, casa genética, fecha de siembra y número de plantas.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Tipo de cultivo *</Label>
                                <QuickCreateDialog
                                    triggerLabel="Nuevo"
                                    title="Nuevo tipo de cultivo"
                                    description="Agrega un tipo de cultivo al catálogo."
                                    placeholder="Ej: Palma de aceite"
                                    action={createTipoCultivo}
                                    onSuccess={async () => { const r = await getTiposCultivo(); if (r.data) setTipos(r.data) }}
                                />
                            </div>
                            <Combobox options={tipos.map(t => ({ value: t.nombre, label: t.nombre }))} value={form.tipoCultivo}
                                onSelect={v => setForm(f => ({ ...f, tipoCultivo: v, especie: "", variedad: "", casaGenetica: "" }))} placeholder="Seleccione…" />
                        </div>
                        {especies.length > 0 && (
                            <div className="space-y-2">
                                <Label>Especie</Label>
                                <Combobox options={especies.map(e => ({ value: e.nombre, label: e.nombre }))}
                                    value={form.especie}
                                    onSelect={v => setForm(f => ({ ...f, especie: v, variedad: "", casaGenetica: "" }))} placeholder="Seleccione…" />
                                {especieSel?.nombreComun && <p className="text-xs text-muted-foreground">{especieSel.nombreComun}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Variedad / cruce</Label>
                            <Combobox options={variedades.map(v => ({ value: v.nombre, label: v.casaGenetica ? `${v.nombre} · ${v.casaGenetica}` : v.nombre }))}
                                value={form.variedad} onSelect={elegirVariedad}
                                placeholder={variedades.length ? "Seleccione…" : "Sin variedades en el catálogo"} disabled={!variedades.length} />
                        </div>
                        {(especies.length > 0 || form.casaGenetica) && (
                            <div className="space-y-2">
                                <Label htmlFor="casa">Casa genética / proveedor</Label>
                                <Input id="casa" value={form.casaGenetica} readOnly disabled className="bg-muted/60"
                                    placeholder="Se completa al elegir la variedad" />
                            </div>
                        )}
                        {opcionesDisponibles.length > 0 && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Opciones genéticas del material</Label>
                                <div className="flex flex-wrap gap-2">
                                    {opcionesDisponibles.map(o => {
                                        const activa = opciones.includes(o.codigo)
                                        return (
                                            <button key={o.id} type="button" onClick={() => alternarOpcion(o.codigo)}
                                                title={o.descripcion ?? undefined} aria-pressed={activa}
                                                className={cn("rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
                                                    activa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50")}>
                                                <span className="font-mono font-semibold">{o.codigo}</span> {o.nombre}
                                                {!form.casaGenetica && <span className={cn("ml-1", activa ? "opacity-80" : "text-muted-foreground")}>· {o.casaGenetica}</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Características que la casa genética agrega sobre el cruce (p. ej. #S crecimiento lento). Puede marcar varias.
                                </p>
                            </div>
                        )}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="comercial">Nombre comercial (opcional)</Label>
                            <Input id="comercial" value={form.nombreComercial} onChange={e => set("nombreComercial")(e.target.value)}
                                placeholder="Como lo vendieron o se conoce en la zona, ej: #S Alta Extracción" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de siembra</Label>
                            <DatePicker value={form.fechaSiembra} onChange={set("fechaSiembra")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plantas">Número de plantas *</Label>
                            <Input id="plantas" inputMode="numeric" value={numeroPlantas} placeholder="Ej: 1.250"
                                onChange={e => setNumeroPlantas(e.target.value.replace(/\D/g, ""))} />
                            <p className="text-xs text-muted-foreground">
                                {densidad != null ? `Densidad: ${densidad.toLocaleString("es-CO", { maximumFractionDigits: 0 })} plantas/ha` : "Plantas sembradas en el lote."}
                            </p>
                        </div>
                    </div>
                </FormSection>
                )}

                {finalidad === "VIVERO" && (
                    <FormSection title="Inventario del vivero" description="Materiales que hay en el vivero, con su etapa y cantidad de plantas. Use el mismo catálogo de cultivos y variedades.">
                        <ViveroMaterialesEditor filas={filasVivero} onChange={setFilasVivero} catalogo={tipos} opcionesGeneticas={opcionesGeneticas} />
                    </FormSection>
                )}

                {finalidad !== "SIEMBRA" && finalidad !== "VIVERO" && (
                    <FormSection title="Uso del área" description={finalidad === "INFRAESTRUCTURA" ? "Qué infraestructura hay en este lote." : "Describa brevemente el uso del área."}>
                        <div className="space-y-2">
                            <Label htmlFor="uso">{finalidad === "INFRAESTRUCTURA" ? "Infraestructura *" : "Descripción"}</Label>
                            <Input id="uso" list="usos-infra" value={usoDetalle} onChange={e => setUsoDetalle(e.target.value)}
                                placeholder={finalidad === "INFRAESTRUCTURA" ? "Ej: Casa de finca" : finalidad === "CONSERVACION" ? "Ej: Bosque de galería" : ""} />
                            <datalist id="usos-infra">{USOS_INFRAESTRUCTURA.map(u => <option key={u} value={u} />)}</datalist>
                        </div>
                    </FormSection>
                )}

                <FormSection
                    title="Lindero y área"
                    description="El lote se dibuja sobre la finca: verá el lindero de la finca en amarillo y los lotes vecinos en blanco, y el sistema avisa si se sale o se traslapa."
                >
                    {!fincaId ? (
                        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            Seleccione primero la finca para georreferenciar el lote.
                        </div>
                    ) : (
                        <BoundaryField
                            value={lindero}
                            onChange={v => { setLindero(v); setLinderoTocado(true) }}
                            titulo={`Lindero del lote ${form.nombre || (editando ? lote!.codigo : siguienteCodigo)}`}
                            subtitulo={finca ? `Finca ${finca.nombre}` : undefined}
                            storageKey={storageKey}
                            contexto={contexto}
                            capasReferencia={[
                                ...(fincaGeom ? [{ id: "finca", nombre: finca!.nombre, geometria: fincaGeom, estilo: "finca" as const }] : []),
                                ...vecinos.map((v, i) => ({ id: `v${i}`, nombre: v.nombre, geometria: v.geometria, estilo: "tenue" as const })),
                            ]}
                        />
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="area">Área del lote (ha)</Label>
                            <Input id="area" inputMode="decimal" value={form.areaHa} onChange={e => set("areaHa")(e.target.value)}
                                placeholder={areaMedida ? areaMedida.toFixed(2) : "0,00"} />
                            <p className="text-xs text-muted-foreground">Si lo deja vacío se usa el área medida del lindero.</p>
                            {areaMedida != null && (
                                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => set("areaHa")(areaMedida.toFixed(2))}>
                                    Usar área medida ({formatHa(areaMedida)})
                                </button>
                            )}
                        </div>
                        {!lindero && (
                            <div className="space-y-2">
                                <Label>Punto de referencia</Label>
                                <div className="flex items-center gap-2">
                                    <div className="h-10 flex-1 truncate rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-xs leading-6 text-muted-foreground">
                                        {ubicacion ? `${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}` : "Sin ubicación"}
                                    </div>
                                    <Button type="button" variant="outline" size="icon" onClick={ubicarme} title="Usar mi ubicación actual">
                                        <LocateFixed className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </FormSection>

                <FormSection title="Observaciones">
                    <Textarea value={form.observaciones} onChange={e => set("observaciones")(e.target.value)} rows={3} placeholder="Topografía, drenajes, accesos…" />
                </FormSection>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
                {pendienteGuardar && (
                    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
                        El lindero está listo pero <strong>aún no se ha guardado</strong>. Pulse «{editando ? "Guardar cambios" : "Registrar lote"}» para no perderlo.
                    </div>
                )}
                <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3 md:px-8">
                    <Button type="button" variant="outline" onClick={() => router.push(returnTo ?? (editando ? `/lotes/${lote!.id}` : fincaIdInicial ? `/fincas/${fincaIdInicial}` : "/lotes"))} disabled={guardando}>Cancelar</Button>
                    <Button type="submit" disabled={guardando}
                        className={cn(pendienteGuardar && !guardando && "animate-pulse bg-emerald-600 shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400 hover:bg-emerald-700")}>
                        {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {editando ? "Guardar cambios" : "Registrar lote"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
