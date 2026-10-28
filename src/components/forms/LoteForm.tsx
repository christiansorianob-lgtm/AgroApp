'use client'

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { rutaSegura } from "@/lib/navegacion"
import { Loader2, Save, AlertCircle, LocateFixed } from "lucide-react"
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
interface TipoCultivo { id: string; nombre: string; variedades: { id: string; nombre: string }[] }

export interface LoteFormData {
    id: string
    fincaId: string
    codigo: string
    nombre: string
    areaHa: number
    tipoCultivo: string
    variedad: string | null
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

export function LoteForm({ fincas, tiposCultivo: tiposIniciales, lote, fincaIdInicial }: {
    fincas: FincaRef[]
    tiposCultivo: TipoCultivo[]
    lote?: LoteFormData
    fincaIdInicial?: string
}) {
    const router = useRouter()
    const editando = !!lote
    const returnTo = rutaSegura(useSearchParams()?.get("returnTo"))

    const [tipos, setTipos] = useState(tiposIniciales)
    const [fincaId, setFincaId] = useState(lote?.fincaId ?? fincaIdInicial ?? "")
    const [form, setForm] = useState({
        codigo: lote?.codigo ?? "",
        nombre: lote?.nombre ?? "",
        areaHa: lote ? String(lote.areaHa) : "",
        tipoCultivo: lote?.tipoCultivo ?? "",
        variedad: lote?.variedad ?? "",
        fechaSiembra: toISODate(lote?.fechaSiembra),
        estado: lote?.estado ?? "ACTIVO",
        observaciones: lote?.observaciones ?? "",
    })
    const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

    const geometriaInicial = normalizeGeometry(lote?.geometria)
    const [lindero, setLindero] = useState<BoundaryValue | null>(
        geometriaInicial ? { geometria: geometriaInicial, metodo: lote?.metodoGeorreferenciacion || "DIBUJO_MAPA", precisionM: lote?.precisionM } : null,
    )
    const [linderoTocado, setLinderoTocado] = useState(false)
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

    const variedades = tipos.find(t => t.nombre === form.tipoCultivo)?.variedades ?? []
    const areaMedida = useMemo(() => {
        const g = normalizeGeometry(lindero?.geometria)
        return g ? computeMetrics(g).areaHa : null
    }, [lindero])

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
            codigo: form.codigo || null,
            nombre: form.nombre,
            areaHa: areaTxt ? Number(areaTxt) : null,
            tipoCultivo: form.tipoCultivo,
            variedad: form.variedad || null,
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
                            <Input id="codigo" value={form.codigo} onChange={e => set("codigo")(e.target.value)} placeholder={fincaId ? siguienteCodigo : "L-01"} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="nombre">Nombre del lote *</Label>
                            <Input id="nombre" value={form.nombre} onChange={e => set("nombre")(e.target.value)} placeholder="Ej: Lote El Palmar" required />
                        </div>
                    </div>
                    {!editando && <p className="text-xs text-muted-foreground">Si deja el código vacío se asigna automáticamente ({fincaId ? siguienteCodigo : "L-01"}).</p>}
                </FormSection>

                <FormSection title="Cultivo" description="Especie, material genético y fecha de siembra.">
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
                                onSelect={v => setForm(f => ({ ...f, tipoCultivo: v, variedad: "" }))} placeholder="Seleccione…" />
                        </div>
                        <div className="space-y-2">
                            <Label>Variedad / material</Label>
                            <Combobox options={variedades.map(v => ({ value: v.nombre, label: v.nombre }))} value={form.variedad}
                                onSelect={set("variedad")} placeholder={variedades.length ? "Seleccione…" : "Sin variedades"} disabled={!variedades.length} />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de siembra</Label>
                            <DatePicker value={form.fechaSiembra} onChange={set("fechaSiembra")} />
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
                </FormSection>

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
                            titulo={`Lindero del lote ${form.nombre || form.codigo || siguienteCodigo}`}
                            subtitulo={finca ? `Finca ${finca.nombre}` : undefined}
                            storageKey={`agroapp:recorrido:lote:${lote?.id ?? `nuevo-${fincaId}`}`}
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
                <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3 md:px-8">
                    <Button type="button" variant="outline" onClick={() => router.push(returnTo ?? (editando ? `/lotes/${lote!.id}` : fincaIdInicial ? `/fincas/${fincaIdInicial}` : "/lotes"))} disabled={guardando}>Cancelar</Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {editando ? "Guardar cambios" : "Registrar lote"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
