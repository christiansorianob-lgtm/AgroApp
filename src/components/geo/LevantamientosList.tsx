import { Footprints, PenLine, Upload } from "lucide-react"
import { formatHa, formatMeters, METODO_LABELS, type MetodoGeorreferenciacion } from "@/lib/geo"
import { formatDate } from "@/lib/utils"

const ICONO = { DIBUJO_MAPA: PenLine, IMPORTACION_ARCHIVO: Upload, RECORRIDO_GPS: Footprints }

/** Historial de mediciones del lindero. */
export function LevantamientosList({ items }: {
    items: { id: string; metodo: MetodoGeorreferenciacion; areaHa: number; perimetroM: number; precisionM: number | null; archivoOrigen: string | null; realizadoPor: string | null; createdAt: Date }[]
}) {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin mediciones registradas.</p>
    return (
        <ol className="relative space-y-4 border-l border-border pl-5">
            {items.map((l, i) => {
                const Icon = ICONO[l.metodo]
                return (
                    <li key={l.id} className="relative">
                        <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-3 w-3" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-sm font-medium">{METODO_LABELS[l.metodo]}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {formatHa(l.areaHa)} · {formatMeters(l.perimetroM)}
                            {l.precisionM != null && ` · ±${l.precisionM.toFixed(1)} m`}
                            {l.archivoOrigen && ` · ${l.archivoOrigen}`}
                            {i === 0 && " · vigente"}
                        </p>
                    </li>
                )
            })}
        </ol>
    )
}
