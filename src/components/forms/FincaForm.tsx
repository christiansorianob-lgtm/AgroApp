'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { rutaSegura } from "@/lib/navegacion"
import { Loader2, Save, AlertCircle, LocateFixed } from "lucide-react"
import { createFinca, updateFinca, type FincaInput } from "@/app/actions/fincas"
import { getDepartamentos, getMunicipios } from "@/app/actions/locations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/DatePicker"
import { FincaImageUploader } from "@/components/forms/FincaImageUploader"
import { BoundaryField } from "@/components/geo/BoundaryField"
import { FormSection } from "@/components/layout/PageHeader"
import { computeMetrics, normalizeGeometry, formatHa, type BoundaryValue } from "@/lib/geo"

export interface FincaFormData {
    id: string
    codigo: string
    nombre: string
    departamento: string
    municipio: string
    veredaSector: string
    responsable: string
    areaTotalHa: number
    observaciones: string | null
    estado: "ACTIVO" | "INACTIVO"
    logo: string | null
    fotos: string | null
    createdAt: Date | string
    latitud: number | null
    longitud: number | null
    geometria: unknown
    metodoGeorreferenciacion: BoundaryValue["metodo"] | null
    precisionM: number | null
    lotes?: { id: string; nombre: string; geometria: unknown }[]
}

const toISODate = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

export function FincaForm({ finca, siguienteCodigo }: { finca?: FincaFormData; siguienteCodigo?: string }) {
    const router = useRouter()
    const editando = !!finca
    const returnTo = rutaSegura(useSearchParams()?.get("returnTo"))

    const [departamentos, setDepartamentos] = useState<{ id: string; nombre: string }[]>([])
    const [municipios, setMunicipios] = useState<{ id: string; nombre: string }[]>([])
    const [deptId, setDeptId] = useState("")
    const [muniId, setMuniId] = useState("")

    const [form, setForm] = useState({
        nombre: finca?.nombre ?? "",
        veredaSector: finca?.veredaSector ?? "",
        responsable: finca?.responsable ?? "",
        areaTotalHa: finca ? String(finca.areaTotalHa) : "",
        observaciones: finca?.observaciones ?? "",
        estado: finca?.estado ?? "ACTIVO",
        createdAt: finca ? toISODate(finca.createdAt) : toISODate(new Date()),
    })
    const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

    const geometriaInicial = normalizeGeometry(finca?.geometria)
    const [lindero, setLindero] = useState<BoundaryValue | null>(
        geometriaInicial ? { geometria: geometriaInicial, metodo: finca?.metodoGeorreferenciacion || "DIBUJO_MAPA", precisionM: finca?.precisionM } : null,
    )
    const [linderoTocado, setLinderoTocado] = useState(false)
    const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(
        finca?.latitud != null && finca?.longitud != null ? { lat: finca.latitud, lng: finca.longitud } : null,
    )

    const [logo, setLogo] = useState<string | null>(finca?.logo ?? null)
    const [fotos, setFotos] = useState<string[]>(() => {
        try { return finca?.fotos ? JSON.parse(finca.fotos) : [] } catch { return [] }
    })

    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getDepartamentos().then(async res => {
            if (!res.data) return
            setDepartamentos(res.data)
            const d = finca && res.data.find((x: any) => x.nombre === finca.departamento)
            if (d) {
                setDeptId(d.id)
                const m = await getMunicipios(d.id)
                if (m.data) {
                    setMunicipios(m.data)
                    const mu = m.data.find((x: any) => x.nombre === finca!.municipio)
                    if (mu) setMuniId(mu.id)
                }
            }
        })
    }, [finca])

    const onDept = async (id: string) => {
        setDeptId(id); setMuniId(""); setMunicipios([])
        if (id) {
            const res = await getMunicipios(id)
            if (res.data) setMunicipios(res.data)
        }
    }

    const areaMedida = useMemo(() => {
        const g = normalizeGeometry(lindero?.geometria)
        return g ? computeMetrics(g).areaHa : null
    }, [lindero])

    const vecinos = useMemo(() => (finca?.lotes || [])
        .map(l => ({ nombre: l.nombre, geometria: normalizeGeometry(l.geometria)! }))
        .filter(l => l.geometria), [finca])

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
        const dept = departamentos.find(d => d.id === deptId)
        const muni = municipios.find(m => m.id === muniId)
        const areaTxt = form.areaTotalHa.trim().replace(",", ".")

        const payload: FincaInput = {
            nombre: form.nombre,
            departamento: dept?.nombre || "",
            municipio: muni?.nombre || "",
            veredaSector: form.veredaSector,
            responsable: form.responsable,
            areaTotalHa: areaTxt ? Number(areaTxt) : null,
            observaciones: form.observaciones,
            estado: form.estado as FincaInput["estado"],
            logo,
            fotos,
            createdAt: form.createdAt,
            ubicacion,
            lindero: editando && !linderoTocado ? undefined : lindero,
        }

        setGuardando(true)
        const res = editando ? await updateFinca(finca!.id, payload) : await createFinca(payload)
        setGuardando(false)

        if (res.error) {
            setError(res.error)
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }
        const id = editando ? finca!.id : (res as any).data.id
        router.push(editando && returnTo ? returnTo : `/fincas/${id}`)
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
                <FormSection title="Información general" description="Datos de identificación de la unidad productiva.">
                    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                        <div className="space-y-2">
                            <Label htmlFor="codigo">Código</Label>
                            <Input id="codigo" value={finca?.codigo ?? siguienteCodigo ?? "FIN-…"} disabled readOnly
                                className="bg-muted/60 font-mono" title="Se asigna automáticamente" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre de la finca *</Label>
                            <Input id="nombre" value={form.nombre} onChange={e => set("nombre")(e.target.value)} placeholder="Ej: Hacienda La Esperanza" required />
                        </div>
                        <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
                            {editando ? "El código de la finca no se puede modificar." : "El código se asigna automáticamente al guardar."}
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="responsable">Responsable / administrador *</Label>
                            <Input id="responsable" value={form.responsable} onChange={e => set("responsable")(e.target.value)} placeholder="Nombre completo" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de registro</Label>
                            <DatePicker value={form.createdAt} onChange={set("createdAt")} />
                        </div>
                        {editando && (
                            <div className="space-y-2">
                                <Label htmlFor="estado">Estado</Label>
                                <select id="estado" value={form.estado} onChange={e => set("estado")(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <option value="ACTIVO">Activa</option>
                                    <option value="INACTIVO">Inactiva</option>
                                </select>
                            </div>
                        )}
                    </div>
                </FormSection>

                <FormSection title="Ubicación" description="División político-administrativa donde se encuentra la finca.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Departamento *</Label>
                            <Combobox options={departamentos.map(d => ({ value: d.id, label: d.nombre }))} value={deptId} onSelect={onDept} placeholder="Seleccione…" />
                        </div>
                        <div className="space-y-2">
                            <Label>Municipio *</Label>
                            <Combobox options={municipios.map(m => ({ value: m.id, label: m.nombre }))} value={muniId} onSelect={setMuniId} placeholder="Seleccione…" disabled={!deptId} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="vereda">Vereda / sector *</Label>
                            <Input id="vereda" value={form.veredaSector} onChange={e => set("veredaSector")(e.target.value)} placeholder="Ej: Vereda El Triunfo" required />
                        </div>
                    </div>
                </FormSection>

                <FormSection
                    title="Lindero y área"
                    description="Georreferencie el perímetro dibujándolo sobre la imagen satelital, importando un archivo del topógrafo o caminándolo con el GPS del teléfono."
                >
                    <BoundaryField
                        value={lindero}
                        onChange={v => { setLindero(v); setLinderoTocado(true) }}
                        titulo={`Lindero de la finca ${form.nombre || "nueva"}`}
                        subtitulo={[form.veredaSector, municipios.find(m => m.id === muniId)?.nombre].filter(Boolean).join(" · ")}
                        storageKey={`agroapp:recorrido:finca:${finca?.id ?? "nueva"}`}
                        contexto={{
                            vecinos,
                            areaDeclaradaHa: form.areaTotalHa ? Number(form.areaTotalHa.replace(",", ".")) : null,
                            centro: ubicacion,
                        }}
                        capasReferencia={vecinos.map((v, i) => ({ id: `l${i}`, nombre: v.nombre, geometria: v.geometria, estilo: "tenue" as const }))}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="area">Área total registrada (ha)</Label>
                            <Input id="area" inputMode="decimal" value={form.areaTotalHa} onChange={e => set("areaTotalHa")(e.target.value)}
                                placeholder={areaMedida ? areaMedida.toFixed(2) : "0,00"} />
                            <p className="text-xs text-muted-foreground">
                                Según escritura o certificado catastral. Si lo deja vacío se usa el área medida.
                            </p>
                            {areaMedida != null && (
                                <button type="button" className="text-xs font-medium text-primary hover:underline"
                                    onClick={() => set("areaTotalHa")(areaMedida.toFixed(2))}>
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
                                <p className="text-xs text-muted-foreground">Opcional mientras no haya lindero. Con lindero se usa su centroide.</p>
                            </div>
                        )}
                    </div>
                </FormSection>

                <FormSection title="Imágenes" description="Logo de la finca y fotografías generales.">
                    <FincaImageUploader logo={logo} fotos={fotos} onLogoChange={setLogo} onFotosChange={setFotos} disabled={guardando} />
                </FormSection>

                <FormSection title="Observaciones">
                    <Textarea value={form.observaciones} onChange={e => set("observaciones")(e.target.value)} rows={3} placeholder="Notas adicionales, accesos, colindantes…" />
                </FormSection>
            </div>

            {/* Barra de acciones fija */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
                <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3 md:px-8">
                    <Button type="button" variant="outline" onClick={() => router.push(returnTo ?? (editando ? `/fincas/${finca!.id}` : "/fincas"))} disabled={guardando}>Cancelar</Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {editando ? "Guardar cambios" : "Registrar finca"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
