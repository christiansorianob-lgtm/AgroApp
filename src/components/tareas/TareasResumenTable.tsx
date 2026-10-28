import Link from "next/link"
import { ArrowDown, ArrowUp, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, cn } from "@/lib/utils"

const ESTADO: Record<string, string> = {
    PROGRAMADA: "bg-sky-50 text-sky-700 ring-sky-600/20",
    EN_PROCESO: "bg-amber-50 text-amber-800 ring-amber-600/20",
    EJECUTADA: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    CANCELADA: "bg-slate-100 text-slate-600 ring-slate-500/20",
}
const PRIORIDAD: Record<string, string> = {
    ALTA: "bg-red-50 text-red-700 ring-red-600/20",
    MEDIA: "bg-amber-50 text-amber-800 ring-amber-600/20",
    BAJA: "bg-slate-100 text-slate-600 ring-slate-500/20",
}

export function StatusPill({ className, children }: { className?: string; children: React.ReactNode }) {
    return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>{children}</span>
}

/** Tabla compacta de tareas para las fichas de finca y lote. */
export function TareasResumenTable({ tareas, sort, returnTo, emptyText }: {
    tareas: any[]
    sort: "asc" | "desc"
    returnTo: string
    emptyText: string
}) {
    if (tareas.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-40" />
                {emptyText}
            </div>
        )
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="pl-5">
                        <Link href={`?sort=${sort === "desc" ? "asc" : "desc"}`} className="inline-flex items-center gap-1 hover:text-foreground">
                            Fecha {sort === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                        </Link>
                    </TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead className="min-w-[200px]">Observaciones</TableHead>
                    <TableHead className="pr-5 text-right" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {tareas.map(t => (
                    <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap pl-5 font-medium tabular-nums">{formatDate(t.fechaProgramada)}</TableCell>
                        <TableCell>
                            <div className="font-medium">{t.tipo}</div>
                            <div className="text-xs text-muted-foreground">{t.codigo}{t.lote ? ` · ${t.lote.nombre}` : ""}</div>
                        </TableCell>
                        <TableCell>{t.responsable}</TableCell>
                        <TableCell><StatusPill className={ESTADO[t.estado]}>{t.estado.replace("_", " ").toLowerCase().replace(/^./, (c: string) => c.toUpperCase())}</StatusPill></TableCell>
                        <TableCell><StatusPill className={PRIORIDAD[t.prioridad]}>{t.prioridad.charAt(0) + t.prioridad.slice(1).toLowerCase()}</StatusPill></TableCell>
                        <TableCell>
                            {t.observaciones
                                ? <p className="line-clamp-2 max-w-[320px] text-xs text-muted-foreground">{t.observaciones.replace(/\[|\]/g, "").split(" | ").join(" · ")}</p>
                                : <span className="text-xs text-muted-foreground/50">—</span>}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/tareas/${t.id}/execute?returnTo=${returnTo}`}>Gestionar</Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
