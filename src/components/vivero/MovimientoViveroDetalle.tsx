import { ArrowDownToLine, ArrowUpFromLine, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEntero } from "@/lib/cultivos"
import { formatDate } from "@/lib/utils"
import { describirRenglon, formatPesos, infoMovimiento, variedadDe, type RenglonVivero, type TipoMovimientoVivero } from "@/lib/vivero"

export interface MovimientoConLineas {
    codigo: string
    tipo: TipoMovimientoVivero
    fecha: Date
    destino: string | null
    clienteNombre: string | null
    clienteCedula: string | null
    clienteCelular: string | null
    placas: string | null
    representante: string | null
    observaciones: string | null
    registradoPor: string | null
    pdfUrl: string | null
    lineas: (RenglonVivero & { id: string; cantidad: number; delta: number; precioUnitario: number | null; valor: number | null })[]
}

/** Resumen de un movimiento ya registrado (en la tarea que lo originó). */
export function MovimientoViveroDetalle({ mov }: { mov: MovimientoConLineas }) {
    const info = infoMovimiento(mov.tipo)
    const total = mov.lineas.reduce((s, l) => s + l.cantidad, 0)
    const valor = mov.lineas.reduce((s, l) => s + (l.valor ?? 0), 0)
    const entra = mov.lineas.every(l => l.delta >= 0)
    const Icono = entra ? ArrowDownToLine : ArrowUpFromLine

    // En ventas se agrupa por variedad, que es como se fija el precio
    const grupos = mov.tipo === "VENTA"
        ? [...new Set(mov.lineas.map(l => variedadDe(l)))].map(v => ({ variedad: v, lineas: mov.lineas.filter(l => variedadDe(l) === v) }))
        : [{ variedad: null as string | null, lineas: mov.lineas }]

    const datos: [string, string | null][] = [
        ["Fecha", formatDate(mov.fecha)],
        ["Cliente", mov.clienteNombre],
        ["Cédula", mov.clienteCedula],
        ["Celular", mov.clienteCelular],
        ["Placas", mov.placas],
        ["Entregó", mov.representante],
        ["Destino", mov.destino],
        ["Registró", mov.registradoPor],
    ]

    return (
        <Card className="border-emerald-200">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Icono className="h-5 w-5 text-emerald-700" /> {info.nombre} registrada · <span className="font-mono text-base">{mov.codigo}</span>
                    </CardTitle>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 tabular-nums">
                        {entra ? "+" : "−"}{formatEntero(total)} plantas
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {datos.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex gap-2"><dt className="text-muted-foreground">{k}:</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                </dl>

                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Material</th>
                                <th className="px-3 py-2 text-right font-medium">Plantas</th>
                                {mov.tipo === "VENTA" && <><th className="px-3 py-2 text-right font-medium">$ por planta</th><th className="px-3 py-2 text-right font-medium">Valor</th></>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {grupos.map(g => g.lineas.map(l => (
                                <tr key={l.id}>
                                    <td className="px-3 py-2">{describirRenglon(l)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatEntero(l.cantidad)}</td>
                                    {mov.tipo === "VENTA" && <>
                                        <td className="px-3 py-2 text-right tabular-nums">{l.precioUnitario != null ? formatPesos(l.precioUnitario) : "—"}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{l.valor != null ? formatPesos(l.valor) : "—"}</td>
                                    </>}
                                </tr>
                            )))}
                        </tbody>
                        <tfoot className="border-t border-border bg-muted/30 font-semibold">
                            <tr>
                                <td className="px-3 py-2">Total</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatEntero(total)}</td>
                                {mov.tipo === "VENTA" && <><td /><td className="px-3 py-2 text-right tabular-nums">{formatPesos(valor)}</td></>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {mov.observaciones && <p className="rounded-md bg-muted/50 p-3 text-sm">{mov.observaciones}</p>}
                {mov.pdfUrl && (
                    <a href={mov.pdfUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                        <FileText className="h-4 w-4" /> Constancia de entrega (PDF)
                    </a>
                )}
            </CardContent>
        </Card>
    )
}
