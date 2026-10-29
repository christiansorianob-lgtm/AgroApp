import Link from "next/link"
import { conRetorno } from "@/lib/navegacion"
import { notFound } from "next/navigation"
import { getFincaById } from "@/services/fincas"
import { getTareas } from "@/app/actions/tareas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, StatItem } from "@/components/layout/PageHeader"
import { GeoViewer } from "@/components/geo/GeoViewer"
import { DescargarKMLButton } from "@/components/geo/DescargarKMLButton"
import { LevantamientosList } from "@/components/geo/LevantamientosList"
import { TareasResumenTable, StatusPill } from "@/components/tareas/TareasResumenTable"
import { formatHa, formatMeters, METODO_LABELS } from "@/lib/geo"
import { formatDate } from "@/lib/utils"
import { MapPin, Ruler, User, Calendar, Plus, Leaf, Pencil, ClipboardList, ExternalLink, Spline, Layers, Hash } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function FincaDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
    const { id } = await props.params
    const sort = (await props.searchParams).sort === "asc" ? "asc" : "desc"
    const finca = await getFincaById(id)
    if (!finca) notFound()

    const { data: tareas = [] } = await getTareas({ fincaId: id, sort })
    const areaLotes = finca.lotes.reduce((s, l) => s + (l.areaHa || 0), 0)
    const lotesGeorref = finca.lotes.filter(l => l.geometria).length
    let fotos: string[] = []
    try { fotos = finca.fotos ? JSON.parse(finca.fotos) : [] } catch { /* formato antiguo */ }

    const capas = [
        ...(finca.geometria ? [{ id: finca.id, nombre: finca.nombre, geometria: finca.geometria, estilo: "finca" as const }] : []),
        ...finca.lotes.filter(l => l.geometria).map(l => ({
            id: l.id, nombre: `${l.codigo} ${l.nombre}`, geometria: l.geometria, estilo: "lote" as const,
            subtitulo: [l.tipoCultivo, l.variedad].filter(Boolean).join(" · "), areaHa: l.areaMedidaHa ?? l.areaHa, href: `/lotes/${l.id}`,
        })),
    ]
    const kmlLote = (l: (typeof finca.lotes)[number]) => ({
        nombre: `${l.codigo} ${l.nombre}`, geometria: l.geometria, tipo: "lote" as const,
        datos: { Código: l.codigo, Finca: finca.nombre, Cultivo: l.tipoCultivo, Especie: l.especie, Variedad: l.variedad, "Casa genética": l.casaGenetica, "Área registrada (ha)": l.areaHa },
    })
    const kmlFinca = [
        { nombre: finca.nombre, geometria: finca.geometria, tipo: "finca" as const,
          datos: { Código: finca.codigo, Municipio: `${finca.municipio}, ${finca.departamento}`, Vereda: finca.veredaSector, "Área registrada (ha)": finca.areaTotalHa } },
        ...finca.lotes.map(kmlLote),
    ]
    const puntos = !finca.geometria && finca.latitud != null && finca.longitud != null
        ? [{ id: finca.id, nombre: finca.nombre, lat: finca.latitud, lng: finca.longitud }] : []

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader
                breadcrumbs={[{ label: "Fincas", href: "/fincas" }, { label: finca.nombre }]}
                title={
                    <span className="flex items-center gap-3">
                        {finca.logo && <img src={finca.logo} alt="" className="h-10 w-10 rounded-lg border border-border bg-card object-contain" />}
                        {finca.nombre}
                    </span>
                }
                badge={<StatusPill className={finca.estado === "ACTIVO" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}>{finca.estado === "ACTIVO" ? "Activa" : "Inactiva"}</StatusPill>}
                description={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{finca.veredaSector} · {finca.municipio}, {finca.departamento}</span>}
                actions={<>
                    <Button variant="outline" asChild><Link href={conRetorno(`/fincas/${id}/edit`, `/fincas/${id}`)}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
                    <Button variant="outline" asChild><Link href={conRetorno(`/tareas/new`, `/fincas/${id}`, { fincaId: id })}><ClipboardList className="mr-2 h-4 w-4" />Nueva tarea</Link></Button>
                    <Button asChild><Link href={conRetorno(`/lotes/new`, `/fincas/${id}`, { fincaId: id })}><Plus className="mr-2 h-4 w-4" />Nuevo lote</Link></Button>
                </>}
            />

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ["Área registrada", formatHa(finca.areaTotalHa), "Según escritura"],
                    ["Área medida", finca.areaMedidaHa != null ? formatHa(finca.areaMedidaHa) : "—", finca.perimetroM ? `Perímetro ${formatMeters(finca.perimetroM)}` : "Sin lindero"],
                    ["Lotes", String(finca.lotes.length), `${lotesGeorref} georreferenciados`],
                    ["Área en lotes", formatHa(areaLotes), finca.areaTotalHa ? `${((areaLotes / finca.areaTotalHa) * 100).toFixed(0)} % de la finca` : ""],
                ].map(([k, v, h]) => (
                    <Card key={k} className="p-4">
                        <div className="text-xs font-medium text-muted-foreground">{k}</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{h}</div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-primary" /> Mapa de la finca</h2>
                        <div className="flex items-center gap-3">
                            {finca.latitud != null && finca.longitud != null && (
                                <a href={`https://www.google.com/maps?q=${finca.latitud},${finca.longitud}`} target="_blank" rel="noopener noreferrer"
                                    className="hidden items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary sm:inline-flex">
                                    {finca.latitud.toFixed(5)}, {finca.longitud.toFixed(5)} <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                            <DescargarKMLButton archivo={`${finca.codigo}_${finca.nombre}`} documento={`Finca ${finca.nombre}`} items={kmlFinca} />
                        </div>
                    </div>
                    <div className="h-[460px]">
                        <GeoViewer layers={capas} points={puntos} emptyText="Esta finca aún no tiene lindero ni ubicación. Edítela para georreferenciarla." />
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Ficha</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <StatItem icon={Hash} label="Código" value={<span className="font-mono">{finca.codigo}</span>} />
                            <StatItem icon={User} label="Responsable" value={finca.responsable} />
                            <StatItem icon={Calendar} label="Registrada" value={formatDate(finca.createdAt)} />
                            <StatItem icon={Spline} label="Georreferenciación"
                                value={finca.metodoGeorreferenciacion ? METODO_LABELS[finca.metodoGeorreferenciacion] : "Pendiente"}
                                hint={finca.precisionM != null ? `Precisión ±${finca.precisionM.toFixed(1)} m` : finca.georreferenciadoEn ? formatDate(finca.georreferenciadoEn) : undefined} />
                            {finca.observaciones && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">{finca.observaciones}</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Ruler className="h-4 w-4 text-primary" /> Historial del lindero</CardTitle></CardHeader>
                        <CardContent><LevantamientosList items={finca.levantamientos} /></CardContent>
                    </Card>
                </div>
            </div>

            {/* Lotes */}
            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 className="text-sm font-semibold">Lotes <span className="text-muted-foreground">({finca.lotes.length})</span></h2>
                    <Button variant="ghost" size="sm" asChild><Link href={conRetorno(`/lotes/new`, `/fincas/${id}`, { fincaId: id })}><Plus className="mr-1.5 h-4 w-4" />Agregar</Link></Button>
                </div>
                {finca.lotes.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Leaf className="h-6 w-6" /></div>
                        <div>
                            <p className="font-medium">Aún no hay lotes</p>
                            <p className="text-sm text-muted-foreground">Divida la finca en lotes para programar labores y medir su producción.</p>
                        </div>
                        <Button asChild><Link href={conRetorno(`/lotes/new`, `/fincas/${id}`, { fincaId: id })}>Registrar primer lote</Link></Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-2.5">Lote</th>
                                    <th className="px-3 py-2.5">Cultivo</th>
                                    <th className="px-3 py-2.5 text-right">Área registrada</th>
                                    <th className="px-3 py-2.5 text-right">Área medida</th>
                                    <th className="px-3 py-2.5">Siembra</th>
                                    <th className="px-3 py-2.5">Lindero</th>
                                    <th className="px-5 py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {finca.lotes.map(l => (
                                    <tr key={l.id} className="hover:bg-muted/40">
                                        <td className="px-5 py-3">
                                            <Link href={`/lotes/${l.id}`} className="font-medium hover:text-primary">{l.nombre}</Link>
                                            <div className="font-mono text-xs text-muted-foreground">{l.codigo}</div>
                                        </td>
                                        <td className="px-3 py-3">{l.tipoCultivo}<div className="text-xs text-muted-foreground">{[l.especie, l.variedad].filter(Boolean).join(" · ")}</div></td>
                                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{formatHa(l.areaHa)}</td>
                                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{l.areaMedidaHa != null ? formatHa(l.areaMedidaHa) : "—"}</td>
                                        <td className="px-3 py-3 tabular-nums whitespace-nowrap">{l.fechaSiembra ? formatDate(l.fechaSiembra) : "—"}</td>
                                        <td className="px-3 py-3">
                                            {l.geometria
                                                ? <StatusPill className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">{l.metodoGeorreferenciacion === "RECORRIDO_GPS" ? "GPS" : l.metodoGeorreferenciacion === "IMPORTACION_ARCHIVO" ? "Importado" : "Dibujado"}</StatusPill>
                                                : <StatusPill className="bg-amber-50 text-amber-800 ring-amber-600/20">Pendiente</StatusPill>}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <DescargarKMLButton variante="icono" archivo={`${finca.codigo}_${l.codigo}_${l.nombre}`} documento={`${finca.nombre} - ${l.nombre}`} items={[kmlLote(l)]} />
                                                <Button variant="ghost" size="sm" asChild><Link href={`/lotes/${l.id}`}>Ver</Link></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {fotos.length > 0 && (
                <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Fotografías</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                            {fotos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-border hover:opacity-90">
                                    <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 className="text-sm font-semibold">Tareas <span className="text-muted-foreground">({tareas.length})</span></h2>
                    <Button variant="ghost" size="sm" asChild><Link href={`/tareas?fincaId=${id}`}>Ver todas</Link></Button>
                </div>
                <TareasResumenTable tareas={tareas} sort={sort} returnTo={`/fincas/${id}`} emptyText="No hay tareas registradas para esta finca." />
            </Card>
        </div>
    )
}
