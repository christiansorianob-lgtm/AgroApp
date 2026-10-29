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
import { describirMaterial, describirUso, formatEntero, ETAPAS_VIVERO, NOMBRE_FINALIDAD } from "@/lib/cultivos"
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
    const siembra = lote.finalidad === "SIEMBRA"
    const uso = describirUso(lote)
    const totalVivero = lote.materialesVivero.reduce((s, m) => s + m.cantidad, 0)
    const porEtapa = ETAPAS_VIVERO
        .map(e => ({ ...e, items: lote.materialesVivero.filter(m => m.etapa === e.valor) }))
        .map(e => ({ ...e, total: e.items.reduce((s, m) => s + m.cantidad, 0) }))
        .filter(e => e.items.length)
    const area = lote.areaMedidaHa ?? lote.areaHa
    const densidad = lote.numeroPlantas && area ? lote.numeroPlantas / area : null
    // Las dos últimas tarjetas cambian según la finalidad del lote
    const tarjetasUso: [string, string, string][] = siembra
        ? [
            ["Cultivo", lote.tipoCultivo || "—", [lote.especie, describirMaterial(lote, { conCasa: false })].filter(Boolean).join(" · ")],
            ["Plantas", formatEntero(lote.numeroPlantas), [densidad ? `${Math.round(densidad).toLocaleString("es-CO")} pl/ha` : "", edad(lote.fechaSiembra) ? `Edad ${edad(lote.fechaSiembra)}` : ""].filter(Boolean).join(" · ")],
        ]
        : lote.finalidad === "VIVERO"
            ? [
                ["Finalidad", "Vivero", `${lote.materialesVivero.length} material(es)`],
                ["Plantas en vivero", formatEntero(totalVivero), porEtapa.map(e => `${e.nombre}: ${formatEntero(e.total)}`).join(" · ")],
            ]
            : [
                ["Finalidad", NOMBRE_FINALIDAD[lote.finalidad], ""],
                ["Uso", uso.detalle || "—", ""],
            ]

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
                    ...tarjetasUso,
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
                                    datos: { Código: lote.codigo, Finca: finca.nombre, Finalidad: NOMBRE_FINALIDAD[lote.finalidad], Uso: siembra ? null : uso.detalle, Cultivo: lote.tipoCultivo, Plantas: lote.numeroPlantas ?? (lote.finalidad === "VIVERO" ? totalVivero : null), Especie: lote.especie, Variedad: lote.variedad, "Opciones genéticas": lote.opcionesGeneticas.join(" "), "Nombre comercial": lote.nombreComercial, "Casa genética": lote.casaGenetica, "Área registrada (ha)": lote.areaHa },
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
                            <StatItem icon={Layers} label="Finalidad" value={NOMBRE_FINALIDAD[lote.finalidad]} hint={!siembra && lote.usoDetalle ? lote.usoDetalle : undefined} />
                            {siembra && <>
                                <StatItem icon={Sprout} label="Cultivo" value={lote.tipoCultivo || "—"} hint={lote.especie ? <i>{lote.especie}</i> : undefined} />
                                <StatItem icon={Leaf} label="Variedad / cruce" value={lote.variedad ? describirMaterial(lote, { conCasa: false }) : "Por definir"} hint={lote.casaGenetica ? `Casa genética: ${lote.casaGenetica}` : undefined} />
                                <StatItem icon={Calendar} label="Fecha de siembra" value={lote.fechaSiembra ? formatDate(lote.fechaSiembra) : "—"} />
                            </>}
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

            {lote.finalidad === "VIVERO" && (
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h2 className="text-sm font-semibold">Inventario del vivero <span className="text-muted-foreground">({formatEntero(totalVivero)} plantas)</span></h2>
                        <Button variant="ghost" size="sm" asChild><Link href={conRetorno(`/lotes/${id}/edit`, `/lotes/${id}`)}><Pencil className="mr-1.5 h-4 w-4" />Actualizar</Link></Button>
                    </div>
                    {lote.materialesVivero.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin materiales registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                                    <tr>
                                        <th className="px-5 py-2.5">Cultivo / especie</th>
                                        <th className="px-3 py-2.5">Variedad / cruce</th>
                                        <th className="px-3 py-2.5">Casa genética</th>
                                        <th className="px-3 py-2.5">Ubicación</th>
                                        <th className="px-3 py-2.5">Ingreso</th>
                                        <th className="px-5 py-2.5 text-right">Plantas</th>
                                    </tr>
                                </thead>
                                {porEtapa.map(e => (
                                    <tbody key={e.valor} className="divide-y divide-border border-t border-border">
                                        <tr className="bg-primary/5">
                                            <td colSpan={5} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-primary">{e.nombre}</td>
                                            <td className="px-5 py-2 text-right text-xs font-semibold tabular-nums text-primary">{formatEntero(e.total)}</td>
                                        </tr>
                                        {e.items.map(m => (
                                            <tr key={m.id}>
                                                <td className="px-5 py-2.5">{m.tipoCultivo}{m.especie && <div className="text-xs italic text-muted-foreground">{m.especie}</div>}</td>
                                                <td className="px-3 py-2.5">{m.variedad || "—"}</td>
                                                <td className="px-3 py-2.5 text-muted-foreground">{m.casaGenetica || "—"}</td>
                                                <td className="px-3 py-2.5">{m.ubicacion || "—"}</td>
                                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{m.fechaIngreso ? formatDate(m.fechaIngreso) : "—"}</td>
                                                <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatEntero(m.cantidad)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ))}
                                <tfoot>
                                    <tr className="border-t border-border bg-muted/30 font-semibold">
                                        <td className="px-5 py-2.5" colSpan={5}>Total</td>
                                        <td className="px-5 py-2.5 text-right tabular-nums">{formatEntero(totalVivero)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </Card>
            )}

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
