import Link from "next/link"
import { getFincas } from "@/app/actions/fincas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
import { GeoViewer } from "@/components/geo/GeoViewer"
import { StatusPill } from "@/components/tareas/TareasResumenTable"
import { formatHa } from "@/lib/geo"
import { Plus, MapPin, Sprout, ChevronRight, Spline } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function FincasPage() {
    const { data: fincas = [], error } = await getFincas()

    const totalHa = fincas.reduce((s, f) => s + (f.areaTotalHa || 0), 0)
    const totalLotes = fincas.reduce((s, f) => s + f.lotes.length, 0)
    const capas = fincas.flatMap(f => [
        ...(f.geometria ? [{ id: f.id, nombre: f.nombre, geometria: f.geometria, estilo: "lote" as const, areaHa: f.areaMedidaHa ?? f.areaTotalHa, subtitulo: `${f.municipio}, ${f.departamento}`, href: `/fincas/${f.id}` }] : []),
    ])
    const puntos = fincas
        .filter(f => !f.geometria && f.latitud != null && f.longitud != null)
        .map(f => ({ id: f.id, nombre: f.nombre, lat: f.latitud!, lng: f.longitud!, href: `/fincas/${f.id}` }))

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader
                title="Fincas"
                description={fincas.length ? `${fincas.length} ${fincas.length === 1 ? "finca" : "fincas"} · ${formatHa(totalHa, 1)} · ${totalLotes} ${totalLotes === 1 ? "lote" : "lotes"}` : "Unidades productivas de la empresa"}
                actions={<Button asChild><Link href="/fincas/new"><Plus className="mr-2 h-4 w-4" />Nueva finca</Link></Button>}
            />

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            {fincas.length === 0 ? (
                <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Sprout className="h-7 w-7" /></div>
                    <div>
                        <h2 className="text-lg font-semibold">Registre su primera finca</h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                            Defina sus linderos dibujándolos sobre la imagen satelital, importando el levantamiento del topógrafo o caminándolos con el GPS.
                        </p>
                    </div>
                    <Button asChild><Link href="/fincas/new"><Plus className="mr-2 h-4 w-4" />Nueva finca</Link></Button>
                </Card>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    <Card className="h-[420px] overflow-hidden lg:h-auto lg:min-h-[520px]">
                        <GeoViewer layers={capas} points={puntos} emptyText="Ninguna finca tiene lindero o ubicación todavía." />
                    </Card>
                    <div className="space-y-3">
                        {fincas.map(f => (
                            <Link key={f.id} href={`/fincas/${f.id}`}
                                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
                                {f.logo
                                    ? <img src={f.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-contain" />
                                    : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">{f.nombre.charAt(0)}</div>}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate font-medium group-hover:text-primary">{f.nombre}</span>
                                        {f.estado !== "ACTIVO" && <StatusPill className="bg-slate-100 text-slate-600 ring-slate-500/20">Inactiva</StatusPill>}
                                    </div>
                                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3 shrink-0" />{f.municipio}, {f.departamento}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                                        <span className="font-medium text-foreground">{formatHa(f.areaTotalHa)}</span>
                                        <span>{f.lotes.length} {f.lotes.length === 1 ? "lote" : "lotes"}</span>
                                        <span className={`inline-flex items-center gap-1 ${f.geometria ? "text-emerald-700" : "text-amber-700"}`}>
                                            <Spline className="h-3 w-3" />{f.geometria ? "Con lindero" : "Sin lindero"}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
