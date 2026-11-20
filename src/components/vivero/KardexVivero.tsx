import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, History, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatEntero } from "@/lib/cultivos"
import { conRetorno } from "@/lib/navegacion"
import { formatDate, cn } from "@/lib/utils"
import { TIPOS_MOVIMIENTO, describirRenglon, formatPesos, infoMovimiento, type RenglonVivero, type TipoMovimientoVivero } from "@/lib/vivero"

export interface MovimientoKardex {
    id: string
    codigo: string
    tipo: TipoMovimientoVivero
    fecha: Date
    destino: string | null
    clienteNombre: string | null
    observaciones: string | null
    registradoPor: string | null
    tarea: { id: string; codigo: string } | null
    lineas: (RenglonVivero & { id: string; cantidad: number; delta: number; valor: number | null })[]
}

/**
 * Historial de entradas y salidas del vivero. El saldo inicial se deduce del inventario actual
 * menos todo lo movido, así cuadra aunque el inventario se haya cargado antes de existir este registro.
 */
export function KardexVivero({ loteId, fincaId, inventarioActual, movimientos }: {
    loteId: string
    fincaId: string
    inventarioActual: number
    movimientos: MovimientoKardex[]
}) {
    const entradas = movimientos.flatMap(m => m.lineas).filter(l => l.delta > 0).reduce((s, l) => s + l.delta, 0)
    const salidas = movimientos.flatMap(m => m.lineas).filter(l => l.delta < 0).reduce((s, l) => s - l.delta, 0)
    const saldoInicial = inventarioActual - entradas + salidas
    const ventas = movimientos.filter(m => m.tipo === "VENTA").flatMap(m => m.lineas).reduce((s, l) => s + (l.valor ?? 0), 0)
    const nuevaTarea = (tipo: TipoMovimientoVivero) =>
        conRetorno(`/tareas/new`, `/lotes/${loteId}`, { fincaId, loteId, movimiento: tipo })

    // Saldo después de cada movimiento (la lista va del más reciente al más antiguo)
    let saldo = inventarioActual
    const filas = movimientos.map(m => {
        const neto = m.lineas.reduce((s, l) => s + l.delta, 0)
        const fila = { m, neto, saldo }
        saldo -= neto
        return fila
    })

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" /> Entradas y salidas de plantas</h2>
                <div className="flex flex-wrap gap-1.5">
                    {TIPOS_MOVIMIENTO.map(t => (
                        <Button key={t.valor} variant="outline" size="sm" asChild>
                            <Link href={nuevaTarea(t.valor)}><Plus className="mr-1 h-3.5 w-3.5" />{t.nombre.split(" /")[0]}</Link>
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-5 sm:divide-y-0">
                {([
                    ["Saldo inicial", formatEntero(saldoInicial), ""],
                    ["Entradas", entradas ? `+${formatEntero(entradas)}` : "0", "text-emerald-700"],
                    ["Salidas", salidas ? `−${formatEntero(salidas)}` : "0", "text-red-700"],
                    ["Saldo actual", formatEntero(inventarioActual), ""],
                    ["Ventas", formatPesos(ventas), ""],
                ] as const).map(([k, v, c]) => (
                    <div key={k} className="px-4 py-3">
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className={cn("text-base font-semibold tabular-nums", c)}>{v}</div>
                    </div>
                ))}
            </div>

            {movimientos.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Aún no hay movimientos. Use los botones de arriba para crear la tarea de una venta, siembra, traslado o ingreso.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-5 py-2.5">Fecha</th>
                                <th className="px-3 py-2.5">Movimiento</th>
                                <th className="px-3 py-2.5">Detalle</th>
                                <th className="px-3 py-2.5 text-right">Entra</th>
                                <th className="px-3 py-2.5 text-right">Sale</th>
                                <th className="px-3 py-2.5 text-right">Saldo</th>
                                <th className="px-5 py-2.5 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filas.map(({ m, neto, saldo }) => {
                                const info = infoMovimiento(m.tipo)
                                const entra = m.lineas.filter(l => l.delta > 0).reduce((s, l) => s + l.delta, 0)
                                const sale = m.lineas.filter(l => l.delta < 0).reduce((s, l) => s - l.delta, 0)
                                const valor = m.lineas.reduce((s, l) => s + (l.valor ?? 0), 0)
                                const Icono = neto >= 0 ? ArrowDownToLine : ArrowUpFromLine
                                const detalle = [m.clienteNombre, m.destino && `→ ${m.destino}`, m.observaciones].filter(Boolean).join(" · ")
                                return (
                                    <tr key={m.id} className="align-top">
                                        <td className="whitespace-nowrap px-5 py-2.5 tabular-nums">{formatDate(m.fecha)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Icono className={cn("h-4 w-4", neto >= 0 ? "text-emerald-600" : "text-red-600")} />{info.nombre}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                <span className="font-mono">{m.codigo}</span>
                                                {m.tarea && <> · <Link className="text-primary hover:underline" href={conRetorno(`/tareas/${m.tarea.id}/execute`, `/lotes/${loteId}`)}>{m.tarea.codigo}</Link></>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {detalle && <div className="text-xs">{detalle}</div>}
                                            <ul className="mt-0.5 text-xs text-muted-foreground">
                                                {m.lineas.map(l => <li key={l.id}>{describirRenglon(l)}: <span className="tabular-nums">{l.delta > 0 ? "+" : "−"}{formatEntero(Math.abs(l.delta))}</span></li>)}
                                            </ul>
                                            {m.registradoPor && <div className="mt-0.5 text-[11px] text-muted-foreground">Registró {m.registradoPor}</div>}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{entra ? `+${formatEntero(entra)}` : ""}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{sale ? `−${formatEntero(sale)}` : ""}</td>
                                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatEntero(saldo)}</td>
                                        <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums">{valor ? formatPesos(valor) : ""}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}
