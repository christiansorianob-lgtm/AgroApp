import Link from "next/link"
import { getLotes } from "@/app/actions/lotes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusPill } from "@/components/tareas/TareasResumenTable"
import { formatHa } from "@/lib/geo"
import { formatDate } from "@/lib/utils"
import { describirUso, formatEntero } from "@/lib/cultivos"
import { Plus, Leaf } from "lucide-react"

export const dynamic = "force-dynamic"

const ESTADO: Record<string, [string, string]> = {
    ACTIVO: ["Activo", "bg-emerald-50 text-emerald-700 ring-emerald-600/20"],
    EN_RENOVACION: ["En renovación", "bg-amber-50 text-amber-800 ring-amber-600/20"],
    INACTIVO: ["Inactivo", "bg-slate-100 text-slate-600 ring-slate-500/20"],
}

export default async function LotesPage() {
    const { data: lotes = [], error } = await getLotes()
    const totalHa = lotes.reduce((s, l) => s + (l.areaHa || 0), 0)

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader
                title="Lotes"
                description={lotes.length ? `${lotes.length} ${lotes.length === 1 ? "lote" : "lotes"} · ${formatHa(totalHa, 1)}` : "Lotes productivos de todas las fincas"}
                actions={<Button asChild><Link href="/lotes/new?returnTo=/lotes"><Plus className="mr-2 h-4 w-4" />Nuevo lote</Link></Button>}
            />
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            <Card className="overflow-hidden">
                {lotes.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Leaf className="h-6 w-6" /></div>
                        <p className="font-medium">No hay lotes registrados</p>
                        <p className="text-sm text-muted-foreground">Registre primero una finca y luego divídala en lotes.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-2.5">Lote</th>
                                    <th className="px-3 py-2.5">Finca</th>
                                    <th className="px-3 py-2.5">Uso / cultivo</th>
                                    <th className="px-3 py-2.5 text-right">Plantas</th>
                                    <th className="px-3 py-2.5 text-right">Área</th>
                                    <th className="px-3 py-2.5">Siembra</th>
                                    <th className="px-3 py-2.5">Estado</th>
                                    <th className="px-3 py-2.5">Lindero</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {lotes.map(l => {
                                    const [label, cls] = ESTADO[l.estado] ?? ESTADO.ACTIVO
                                    return (
                                        <tr key={l.id} className="hover:bg-muted/40">
                                            <td className="px-5 py-3">
                                                <Link href={`/lotes/${l.id}`} className="font-medium hover:text-primary">{l.nombre}</Link>
                                                <div className="font-mono text-xs text-muted-foreground">{l.codigo}</div>
                                            </td>
                                            <td className="px-3 py-3"><Link href={`/fincas/${l.finca.id}`} className="hover:text-primary">{l.finca.nombre}</Link></td>
                                            <td className="px-3 py-3">{describirUso(l).titulo}<div className="text-xs text-muted-foreground">{l.finalidad === "VIVERO" ? "Vivero" : describirUso(l).detalle}</div></td>
                                            <td className="px-3 py-3 text-right tabular-nums">{formatEntero(l.finalidad === "VIVERO" ? l.materialesVivero.reduce((s, m) => s + m.cantidad, 0) : l.numeroPlantas)}</td>
                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{formatHa(l.areaHa)}</td>
                                            <td className="px-3 py-3 tabular-nums whitespace-nowrap">{l.fechaSiembra ? formatDate(l.fechaSiembra) : "—"}</td>
                                            <td className="px-3 py-3"><StatusPill className={cls}>{label}</StatusPill></td>
                                            <td className="px-3 py-3">
                                                {l.geometria
                                                    ? <StatusPill className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Definido</StatusPill>
                                                    : <StatusPill className="bg-amber-50 text-amber-800 ring-amber-600/20">Pendiente</StatusPill>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
