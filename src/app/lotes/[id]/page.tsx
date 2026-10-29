import Link from "next/link"
import { conRetorno } from "@/lib/navegacion"
import { notFound } from "next/navigation"
import { getLoteById } from "@/app/actions/lotes"
import { getTareas } from "@/app/actions/tareas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, StatItem } from "@/components/layout/PageHeader"
import { GeoViewer } from "@/components/geo/GeoViewer"
import { DescargarKMLButton } from "@/components/geo/DescargarKMLButton"
import { LevantamientosList } from "@/components/geo/LevantamientosList"
import { TareasResumenTable, StatusPill } from "@/components/tareas/TareasResumenTable"
import { formatHa, formatMeters, METODO_LABELS } from "@/lib/geo"
import { formatDate, cn } from "@/lib/utils"
import { describirMaterial } from "@/lib/cultivos"
import { Calendar, Leaf, Pencil, Plus, Spline, Hash, Sprout, Ruler, Layers, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

const ESTADO_LOTE: Record<string, [string, string]> = {
    ACTIVO: ["Activo", "bg-emerald-50 text-emerald-700 ring-emerald-600/20"],
    EN_RENOVACION: ["En renovación", "bg-amber-50 text-amber-800 ring-amber-600/20"],
    INACTIVO: ["Inactivo", "bg-slate-100 text-slate-600 ring-slate-500/20"],
}

function edad(fecha: Date | null) {
    if (!fecha) return null
    const meses = Math.floor((Date.now() - new Date(fecha).getTime()) / (30.44 * 24 * 3600 * 1000))
    if (meses < 0) return null
    return meses < 12 ? `${meses} meses` : `${Math.floor(meses / 12)} años ${meses % 12 ? `${meses % 12} m` : ""}`.trim()
}

export default async function LoteDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
    const { id } = await props.params
    const sort = (await props.searchParams).sort === "asc" ? "asc" : "desc"
    const res = await getLoteById(id)
    if (res.error || !res.data) notFound()

    const lote = res.data
    const finca = lote.finca
    const { data: tareas = [] } = await getTareas({ loteId: id, sort })
    const [estadoLabel, estadoCls] = ESTADO_LOTE[lote.estado] ?? ESTADO_LOTE.ACTIVO

    const capas = [
        ...(finca.geometria ? [{ id: finca.id, nombre: finca.nombre, geometria: finca.geometria, estilo: "finca" as const }] : []),
        ...finca.lotes.filter(l => l.geometria && l.id !== lote.id).map(l => ({
            id: l.id, nombre: `${l.codigo} ${l.nombre}`, geometria: l.geometria, estilo: "tenue" as const, href: `/lotes/${l.id}`, areaHa: l.areaHa,
        })),
        ...(lote.geometria ? [{ id: lote.id, nombre: `${lote.codigo} ${lote.nombre}`, geometria: lote.geometria, estilo: "destacado" as const, areaHa: lote.areaMedidaHa }] : []),
    ]
    const puntos = !lote.geometria && lote.latitud != null && lote.longitud != null
        ? [{ id: lote.id, nombre: lote.nombre, lat: lote.latitud, lng: lote.longitud }] : []

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader
                breadcrumbs={[{ label: "Fincas", href: "/fincas" }, { label: finca.nombre, href: `/fincas/${finca.id}` }, { label: lote.nombre }]}
                title={lote.nombre}
                badge={<StatusPill className={estadoCls}>{estadoLabel}</StatusPill>}
                description={<><span className="font-mono">{lote.codigo}</span> · Finca {finca.nombre}</>}
                actions={<>
                    <Button variant="outline" asChild><Link href={conRetorno(`/lotes/${id}/edit`, `/lotes/${id}`)}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
                    <Button asChild><Link href={conRetorno(`/tareas/new`, `/lotes/${id}`, { fincaId: finca.id, loteId: id })}><Plus className="mr-2 h-4 w-4" />Nueva tarea</Link></Button>
                </>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ["Área registrada", formatHa(lote.areaHa), ""],
                    ["Área medida", lote.areaMedidaHa != null ? formatHa(lote.areaMedidaHa) : "—", lote.perimetroM ? `Perímetro ${formatMeters(lote.perimetroM)}` : "Sin lindero"],
                    ["Cultivo", lote.tipoCultivo || "—", [lote.especie, describirMaterial(lote, { conCasa: false })].filter(Boolean).join(" · ")],
                    ["Edad del cultivo", edad(lote.fechaSiembra) ?? "—", lote.fechaSiembra ? `Sembrado ${formatDate(lote.fechaSiembra)}` : ""],
                ].map(([k, v, h]) => (
                    <Card key={k} className="p-4">
                        <div className="text-xs font-medium text-muted-foreground">{k}</div>
                        {/* Textos largos (p. ej. "Palma de Aceite") pasan a dos líneas con letra más pequeña en vez de recortarse */}
                        <div title={v} className={cn("mt-1 line-clamp-2 break-words font-semibold tabular-nums",
                            v.length > 12 ? "text-base leading-snug" : "text-xl")}>{v}</div>
                        <div title={h} className="mt-0.5 line-clamp-3 break-words text-xs text-muted-foreground">{h}</div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-primary" /> Ubicación del lote</h2>
                        <div className="flex items-center gap-3">
                            {lote.latitud != null && lote.longitud != null && (
                                <a href={`https://www.google.com/maps?q=${lote.latitud},${lote.longitud}`} target="_blank" rel="noopener noreferrer"
                                    className="hidden items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary sm:inline-flex">
                                    {lote.latitud.toFixed(5)}, {lote.longitud.toFixed(5)} <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                            <DescargarKMLButton archivo={`${finca.codigo}_${lote.codigo}_${lote.nombre}`} documento={`${finca.nombre} - ${lote.nombre}`}
                                items={[{
                                    nombre: `${lote.codigo} ${lote.nombre}`, geometria: lote.geometria, tipo: "lote",
                                    datos: { Código: lote.codigo, Finca: finca.nombre, Cultivo: lote.tipoCultivo, Especie: lote.especie, Variedad: lote.variedad, "Opciones genéticas": lote.opcionesGeneticas.join(" "), "Nombre comercial": lote.nombreComercial, "Casa genética": lote.casaGenetica, "Área registrada (ha)": lote.areaHa },
                                }]} />
                        </div>
                    </div>
                    <div className="h-[440px]">
                        <GeoViewer layers={capas} points={puntos} emptyText="Este lote aún no tiene lindero. Edítelo para georreferenciarlo." />
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Ficha</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <StatItem icon={Hash} label="Código" value={<span className="font-mono">{lote.codigo}</span>} />
                            <StatItem icon={Sprout} label="Cultivo" value={lote.tipoCultivo || "—"} hint={lote.especie ? <i>{lote.especie}</i> : undefined} />
                            <StatItem icon={Leaf} label="Variedad / cruce" value={lote.variedad ? describirMaterial(lote, { conCasa: false }) : "Por definir"} hint={lote.casaGenetica ? `Casa genética: ${lote.casaGenetica}` : undefined} />
                            <StatItem icon={Calendar} label="Fecha de siembra" value={lote.fechaSiembra ? formatDate(lote.fechaSiembra) : "—"} />
                            <StatItem icon={Spline} label="Georreferenciación"
                                value={lote.metodoGeorreferenciacion ? METODO_LABELS[lote.metodoGeorreferenciacion] : "Pendiente"}
                                hint={lote.precisionM != null ? `Precisión ±${lote.precisionM.toFixed(1)} m` : lote.georreferenciadoEn ? formatDate(lote.georreferenciadoEn) : undefined} />
                            {lote.observaciones && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">{lote.observaciones}</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Ruler className="h-4 w-4 text-primary" /> Historial del lindero</CardTitle></CardHeader>
                        <CardContent><LevantamientosList items={lote.levantamientos} /></CardContent>
                    </Card>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold"><Leaf className="h-4 w-4 text-primary" /> Tareas del lote <span className="text-muted-foreground">({tareas.length})</span></h2>
                    <Button variant="ghost" size="sm" asChild><Link href={`/tareas?loteId=${id}`}>Ver todas</Link></Button>
                </div>
                <TareasResumenTable tareas={tareas} sort={sort} returnTo={`/lotes/${id}`} emptyText="No hay tareas registradas para este lote." />
            </Card>
        </div>
    )
}
