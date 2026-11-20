import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ChevronRight, ClipboardCheck, MapPin } from "lucide-react"
import { db } from "@/lib/db"
import { sesionDePagina } from "@/lib/auth"
import { esGestor } from "@/lib/sesion"
import { formatDate } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"

export const metadata = { title: "Mis tareas · AgroApp" }

const ESTADOS: Record<string, { label: string; cls: string }> = {
    PROGRAMADA: { label: "Programada", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    EN_PROCESO: { label: "En proceso", cls: "bg-blue-50 text-blue-800 border-blue-200" },
    EJECUTADA: { label: "Ejecutada", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    CANCELADA: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
}
const PRIORIDAD: Record<string, string> = { ALTA: "Prioridad alta", MEDIA: "Prioridad media", BAJA: "Prioridad baja" }

export default async function MisTareasPage() {
    const sesion = await sesionDePagina()
    if (esGestor(sesion.rol)) redirect("/tareas")

    if (!sesion.responsableId) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <PageHeader title="Mis tareas" />
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Su usuario no está ligado a un responsable. Pídale al administrador que lo revise.
                </p>
            </div>
        )
    }

    const tareas = await db.tarea.findMany({
        where: { responsableId: sesion.responsableId },
        include: { finca: { select: { nombre: true } }, lote: { select: { codigo: true, nombre: true } } },
        orderBy: { fechaProgramada: "asc" },
    })
    const pendientes = tareas.filter(t => t.estado === "PROGRAMADA" || t.estado === "EN_PROCESO")
    const terminadas = tareas.filter(t => !pendientes.includes(t)).reverse().slice(0, 20)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <PageHeader
                title="Mis tareas"
                description={`Hola, ${sesion.nombre.split(" ")[0]}. ${pendientes.length === 0 ? "No tiene tareas pendientes." : pendientes.length === 1 ? "Tiene 1 tarea pendiente." : `Tiene ${pendientes.length} tareas pendientes.`}`}
            />

            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes</h2>
                {pendientes.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Todo al día.</p>
                ) : pendientes.map(t => <TarjetaTarea key={t.id} t={t} atrasada={t.fechaProgramada < hoy} />)}
            </section>

            {terminadas.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terminadas</h2>
                    {terminadas.map(t => <TarjetaTarea key={t.id} t={t} />)}
                </section>
            )}
        </div>
    )
}

type TareaLista = Awaited<ReturnType<typeof db.tarea.findMany<{ include: { finca: { select: { nombre: true } }; lote: { select: { codigo: true; nombre: true } } } }>>>[number]

function TarjetaTarea({ t, atrasada = false }: { t: TareaLista; atrasada?: boolean }) {
    const estado = ESTADOS[t.estado] ?? ESTADOS.PROGRAMADA
    const pendiente = t.estado === "PROGRAMADA" || t.estado === "EN_PROCESO"
    return (
        <Link href={`/tareas/${t.id}/execute`}
            className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{t.codigo}</p>
                    <p className="text-base font-semibold leading-tight">{t.tipo}</p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", estado.cls)}>{estado.label}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" />
                    {t.finca.nombre}{t.lote ? ` · ${t.lote.codigo} ${t.lote.nombre}` : " · Toda la finca"}</p>
                <p className={cn("flex items-center gap-1.5", atrasada && "font-medium text-destructive")}><CalendarDays className="h-4 w-4 shrink-0" />
                    {formatDate(t.fechaProgramada)}{atrasada ? " · atrasada" : ""} · {PRIORIDAD[t.prioridad] ?? t.prioridad}</p>
            </div>
            {t.observaciones && <p className="mt-2 line-clamp-3 rounded-md bg-muted/50 p-2 text-sm">{t.observaciones}</p>}
            <div className="mt-3 flex items-center justify-end gap-1 text-sm font-medium text-primary">
                {pendiente ? <><ClipboardCheck className="h-4 w-4" /> Responder</> : "Ver detalle"} <ChevronRight className="h-4 w-4" />
            </div>
        </Link>
    )
}
