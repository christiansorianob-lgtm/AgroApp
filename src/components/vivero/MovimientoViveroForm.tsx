'use client'

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Save } from "lucide-react"
import { registrarMovimientoDeTarea } from "@/app/actions/vivero"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/DatePicker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatEntero } from "@/lib/cultivos"
import { describirRenglon, formatPesos, infoMovimiento, variedadDe, type RenglonVivero, type TipoMovimientoVivero } from "@/lib/vivero"
import { cn } from "@/lib/utils"

export interface MaterialDisponible extends RenglonVivero {
    id: string
    cantidad: number
}

const hoyISO = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const soloEntero = (v: string) => v.replace(/\D/g, "")
const aNumero = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", ".")))

/** Registro de un movimiento de plantas al ejecutar la tarea: cantidades por renglón y, en ventas, precio por variedad. */
export function MovimientoViveroForm({ tareaId, tipo, materiales, destinos, representante, volverA }: {
    tareaId: string
    tipo: TipoMovimientoVivero
    materiales: MaterialDisponible[]
    /** Sugerencias para el destino: lotes de la finca */
    destinos: string[]
    representante: string
    volverA: string
}) {
    const router = useRouter()
    const info = infoMovimiento(tipo)
    const salida = info.sentido === "salida"

    const [fecha, setFecha] = useState(hoyISO())
    const [cantidades, setCantidades] = useState<Record<string, string>>({})
    const [precios, setPrecios] = useState<Record<string, string>>({})
    const [destino, setDestino] = useState("")
    const [cliente, setCliente] = useState({ nombre: "", cedula: "", celular: "", placas: "", representante })
    const [observaciones, setObservaciones] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [confirmar, setConfirmar] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const enviandoRef = useRef(false)

    const lineas = materiales
        .map(m => ({ m, cantidad: parseInt(cantidades[m.id] || "0", 10) || 0 }))
        .filter(l => l.cantidad > 0)
    const total = lineas.reduce((s, l) => s + l.cantidad, 0)

    // Ventas: un precio por variedad, aunque la variedad esté en varios renglones (etapas, ubicaciones)
    const porVariedad = useMemo(() => {
        const g = new Map<string, number>()
        for (const l of lineas) g.set(variedadDe(l.m), (g.get(variedadDe(l.m)) ?? 0) + l.cantidad)
        return [...g.entries()].map(([variedad, cantidad]) => {
            const precio = aNumero(precios[variedad] ?? "")
            return { variedad, cantidad, precio, valor: precio != null && Number.isFinite(precio) ? precio * cantidad : null }
        })
    }, [lineas, precios])
    const valorTotal = porVariedad.reduce((s, v) => s + (v.valor ?? 0), 0)

    const excedido = salida ? lineas.find(l => l.cantidad > l.m.cantidad) : undefined

    function validar(): string | null {
        if (total === 0) return `Indique cuántas plantas ${salida ? "salen" : "entran"} de al menos un material.`
        if (excedido) return `De ${describirRenglon(excedido.m)} solo hay ${formatEntero(excedido.m.cantidad)} plantas.`
        if (info.pideCliente && !cliente.nombre.trim()) return "Escriba el nombre del cliente."
        if (tipo === "VENTA" && porVariedad.some(v => v.precio == null || !Number.isFinite(v.precio) || v.precio < 0)) return "Indique el precio por planta de cada variedad."
        if (info.pideDestino && !destino.trim() && tipo !== "VENTA") return "Indique a dónde salen las plantas."
        return null
    }

    async function registrar() {
        if (enviandoRef.current) return
        enviandoRef.current = true
        setEnviando(true)
        const res = await registrarMovimientoDeTarea(tareaId, {
            fecha,
            lineas: lineas.map(l => ({
                materialId: l.m.id, cantidad: l.cantidad,
                precioUnitario: tipo === "VENTA" ? porVariedad.find(v => v.variedad === variedadDe(l.m))?.precio ?? null : null,
            })),
            destino, observaciones,
            ...(info.pideCliente ? {
                clienteNombre: cliente.nombre, clienteCedula: cliente.cedula, clienteCelular: cliente.celular,
                placas: cliente.placas, representante: cliente.representante,
            } : {}),
        })
        if (res.error) {
            setError(res.error)
            setConfirmar(false)
            enviandoRef.current = false
            setEnviando(false)
            return
        }
        router.push(volverA)
        router.refresh()
    }

    const Icono = salida ? ArrowUpFromLine : ArrowDownToLine

    return (
        <div className="space-y-6">
            {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Icono className="h-5 w-5 text-primary" /> {info.nombre}: ¿cuántas plantas {salida ? "salen" : "entran"}?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs space-y-2">
                        <Label>Fecha del movimiento</Label>
                        <DatePicker value={fecha} onChange={setFecha} placeholder="Seleccionar fecha" />
                    </div>

                    <ul className="divide-y divide-border rounded-lg border border-border">
                        {materiales.map(m => {
                            const v = cantidades[m.id] ?? ""
                            const n = parseInt(v || "0", 10) || 0
                            const pasa = salida && n > m.cantidad
                            return (
                                <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{describirRenglon(m)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Disponibles: <b className="tabular-nums">{formatEntero(m.cantidad)}</b>
                                            {n > 0 && !pasa && <> · quedarán <b className="tabular-nums">{formatEntero(salida ? m.cantidad - n : m.cantidad + n)}</b></>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input inputMode="numeric" placeholder="0" value={v}
                                            onChange={e => setCantidades(c => ({ ...c, [m.id]: soloEntero(e.target.value) }))}
                                            className={cn("h-11 w-32 text-right text-base tabular-nums", pasa && "border-destructive text-destructive")} />
                                        {salida && m.cantidad > 0 && (
                                            <button type="button" className="text-xs font-medium text-primary hover:underline"
                                                onClick={() => setCantidades(c => ({ ...c, [m.id]: String(m.cantidad) }))}>Todas</button>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    <div className="flex justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm font-semibold">
                        <span>Total que {salida ? "sale" : "entra"}</span>
                        <span className="tabular-nums">{formatEntero(total)} plantas</span>
                    </div>
                </CardContent>
            </Card>

            {tipo === "VENTA" && porVariedad.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-lg">Valor de la venta</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {porVariedad.map(v => (
                            <div key={v.variedad} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto]">
                                <div>
                                    <p className="text-sm font-medium">{v.variedad}</p>
                                    <p className="text-xs text-muted-foreground tabular-nums">{formatEntero(v.cantidad)} plantas</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">$ por planta</span>
                                    <Input inputMode="decimal" placeholder="0" value={precios[v.variedad] ?? ""}
                                        onChange={e => setPrecios(p => ({ ...p, [v.variedad]: e.target.value.replace(/[^\d.,]/g, "") }))}
                                        className="h-10 w-32 text-right tabular-nums" />
                                </div>
                                <p className="text-right text-sm font-semibold tabular-nums sm:w-36">{v.valor != null ? formatPesos(v.valor) : "—"}</p>
                            </div>
                        ))}
                        <div className="flex justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">
                            <span>Total de la venta</span><span className="tabular-nums">{formatPesos(valorTotal)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="text-lg">{info.pideCliente ? "Cliente y entrega" : "Detalle"}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {info.pideCliente && (<>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Nombre del cliente *</Label>
                            <Input value={cliente.nombre} onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} maxLength={80} />
                        </div>
                        <div className="space-y-2">
                            <Label>Cédula del cliente</Label>
                            <Input inputMode="numeric" value={cliente.cedula} onChange={e => setCliente(c => ({ ...c, cedula: e.target.value }))} maxLength={20} />
                        </div>
                        <div className="space-y-2">
                            <Label>Celular del cliente (WhatsApp)</Label>
                            <Input inputMode="tel" value={cliente.celular} onChange={e => setCliente(c => ({ ...c, celular: e.target.value }))} maxLength={20} />
                        </div>
                        <div className="space-y-2">
                            <Label>Placas del vehículo</Label>
                            <Input value={cliente.placas} onChange={e => setCliente(c => ({ ...c, placas: e.target.value.toUpperCase() }))} placeholder="ABC-123" maxLength={12} />
                        </div>
                        <div className="space-y-2">
                            <Label>Quién entrega por la finca</Label>
                            <Input value={cliente.representante} onChange={e => setCliente(c => ({ ...c, representante: e.target.value }))} maxLength={80} />
                        </div>
                    </>)}
                    {info.pideDestino && (
                        <div className="space-y-2 sm:col-span-2">
                            <Label>{tipo === "VENTA" ? "Destino (municipio, finca del cliente…)" : "¿A dónde salen? *"}</Label>
                            <Input value={destino} onChange={e => setDestino(e.target.value)} list="destinos-vivero" maxLength={120}
                                placeholder={tipo === "SIEMBRA" ? "Lote donde se siembran" : tipo === "TRASLADO" ? "Vivero, finca o lugar de destino" : "Opcional"} />
                            <datalist id="destinos-vivero">{destinos.map(d => <option key={d} value={d} />)}</datalist>
                        </div>
                    )}
                    <div className="space-y-2 sm:col-span-2">
                        <Label>Observaciones</Label>
                        <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
                            placeholder={tipo === "MORTALIDAD" ? "Causa: plaga, enfermedad, daño…" : "Notas adicionales"} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="button" className="h-11" disabled={enviando}
                    onClick={() => { const e = validar(); setError(e); if (!e) setConfirmar(true); else window.scrollTo({ top: 0, behavior: "smooth" }) }}>
                    <Save className="mr-2 h-4 w-4" /> Registrar {info.nombre.toLowerCase()}
                </Button>
            </div>

            <Dialog open={confirmar} onOpenChange={o => !o && !enviando && setConfirmar(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Registrar {info.nombre.toLowerCase()} de {formatEntero(total)} plantas?</DialogTitle>
                        <DialogDescription>
                            {salida ? "Se descontarán del inventario del vivero." : "Se sumarán al inventario del vivero."} La tarea quedará ejecutada.
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="space-y-1 py-2 text-sm">
                        {lineas.map(l => (
                            <li key={l.m.id} className="flex justify-between gap-3">
                                <span className="text-muted-foreground">{describirRenglon(l.m)}</span>
                                <b className="tabular-nums">{formatEntero(l.cantidad)}</b>
                            </li>
                        ))}
                        {tipo === "VENTA" && <li className="flex justify-between gap-3 border-t pt-1 font-semibold"><span>Valor</span><span className="tabular-nums">{formatPesos(valorTotal)}</span></li>}
                    </ul>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="secondary" onClick={() => setConfirmar(false)} disabled={enviando}>No, revisar</Button>
                        <Button onClick={registrar} disabled={enviando}>
                            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Sí, registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
