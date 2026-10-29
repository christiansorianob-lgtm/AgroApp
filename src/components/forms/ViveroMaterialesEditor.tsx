'use client'

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ETAPAS_VIVERO, formatEntero, type EtapaVivero } from "@/lib/cultivos"
import { cn } from "@/lib/utils"

export interface CatalogoCultivo {
    id: string
    nombre: string
    especies?: { id: string; nombre: string }[]
    variedades: { id: string; nombre: string; especieId?: string | null; casaGenetica?: string | null }[]
}

export interface OpcionGeneticaRef { id: string; codigo: string; nombre: string; casaGenetica: string; descripcion: string | null }

export interface FilaVivero {
    clave: string
    opciones: string[]
    tipoCultivo: string
    especie: string
    variedad: string
    casaGenetica: string
    etapa: EtapaVivero
    ubicacion: string
    cantidad: string
    fechaIngreso: string
}

export const filaVacia = (etapa: EtapaVivero = "VIVERO", tipoCultivo = ""): FilaVivero => ({
    clave: Math.random().toString(36).slice(2),
    tipoCultivo, especie: "", variedad: "", casaGenetica: "", opciones: [], etapa, ubicacion: "", cantidad: "", fechaIngreso: "",
})

const AYUDA_ETAPA: Record<EtapaVivero, string> = {
    PREVIVERO: "Plántulas recién germinadas en bolsa pequeña, por lo general los primeros meses.",
    VIVERO: "Plantas trasplantadas a bolsa grande, en crecimiento.",
    LISTA_SIEMBRA: "Plantas seleccionadas y listas para llevar a campo.",
}

const sel = "h-9 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm shadow-sm"

/**
 * Inventario de un lote de vivero, organizado por etapa (previvero, vivero, lista para siembra).
 * Cada fila es un material (cultivo, especie, variedad) con su ubicación (cama, era…) y cantidad.
 */
export function ViveroMaterialesEditor({ filas, onChange, catalogo, opcionesGeneticas = [] }: {
    filas: FilaVivero[]
    onChange: (filas: FilaVivero[]) => void
    catalogo: CatalogoCultivo[]
    /** Catálogo de opciones genéticas (#S, #PC…); se muestran las de la casa del material */
    opcionesGeneticas?: OpcionGeneticaRef[]
}) {
    const actualizar = (clave: string, cambios: Partial<FilaVivero>) => onChange(filas.map(f => (f.clave === clave ? { ...f, ...cambios } : f)))
    const quitar = (clave: string) => onChange(filas.filter(f => f.clave !== clave))
    const cantidad = (f: FilaVivero) => parseInt(f.cantidad, 10) || 0
    const total = filas.reduce((s, f) => s + cantidad(f), 0)
    const ultimoCultivo = filas[filas.length - 1]?.tipoCultivo

    return (
        <div className="space-y-5">
            {ETAPAS_VIVERO.map(etapa => {
                const delaEtapa = filas.filter(f => f.etapa === etapa.valor)
                const subtotal = delaEtapa.reduce((s, f) => s + cantidad(f), 0)
                // "Lista para siembra" solo se muestra si ya tiene material, para no recargar el formulario
                if (etapa.valor === "LISTA_SIEMBRA" && delaEtapa.length === 0) return null
                return (
                    <section key={etapa.valor} className="rounded-xl border border-border">
                        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                            <div>
                                <h3 className="text-sm font-semibold">{etapa.nombre}</h3>
                                <p className="text-xs text-muted-foreground">{AYUDA_ETAPA[etapa.valor]}</p>
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold tabular-nums">{formatEntero(subtotal)}</span> <span className="text-muted-foreground">plantas</span>
                            </div>
                        </header>
                        <div className="space-y-2 p-3">
                            {delaEtapa.length === 0 && (
                                <p className="text-xs italic text-muted-foreground">Sin material en {etapa.nombre.toLowerCase()}.</p>
                            )}
                            {delaEtapa.map((f, i) => {
                                const tipo = catalogo.find(t => t.nombre === f.tipoCultivo)
                                const especies = tipo?.especies ?? []
                                const especie = especies.find(e => e.nombre === f.especie)
                                const variedades = (tipo?.variedades ?? []).filter(v => !especie || !v.especieId || v.especieId === especie.id)
                                return (
                                    <div key={f.clave} className="rounded-lg border border-border bg-card p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">{etapa.nombre} · material {i + 1}</span>
                                            <button type="button" onClick={() => quitar(f.clave)}
                                                className="text-muted-foreground hover:text-destructive" title="Quitar material" aria-label={`Quitar material ${i + 1} de ${etapa.nombre}`}>
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                            <label className="space-y-1 text-xs">
                                                <span className="text-muted-foreground">Cultivo *</span>
                                                <select className={sel} value={f.tipoCultivo}
                                                    onChange={e => actualizar(f.clave, { tipoCultivo: e.target.value, especie: "", variedad: "", casaGenetica: "", opciones: [] })}>
                                                    <option value="">Seleccione…</option>
                                                    {catalogo.map(t => <option key={t.id}>{t.nombre}</option>)}
                                                </select>
                                            </label>
                                            {especies.length > 0 && (
                                                <label className="space-y-1 text-xs">
                                                    <span className="text-muted-foreground">Especie</span>
                                                    <select className={sel} value={f.especie}
                                                        onChange={e => actualizar(f.clave, { especie: e.target.value, variedad: "", casaGenetica: "", opciones: [] })}>
                                                        <option value="">—</option>
                                                        {especies.map(e => <option key={e.id}>{e.nombre}</option>)}
                                                    </select>
                                                </label>
                                            )}
                                            <label className={cn("space-y-1 text-xs", especies.length === 0 && "lg:col-span-2")}>
                                                <span className="text-muted-foreground">Variedad / cruce</span>
                                                <select className={sel} value={f.variedad} disabled={!variedades.length}
                                                    onChange={e => {
                                                        const v = tipo?.variedades.find(x => x.nombre === e.target.value)
                                                        const esp = v?.especieId ? especies.find(x => x.id === v.especieId)?.nombre : undefined
                                                        const casa = v?.casaGenetica ?? ""
                                                        actualizar(f.clave, {
                                                            variedad: e.target.value, casaGenetica: casa, especie: esp ?? f.especie,
                                                            // Conserva solo las opciones que existen en la nueva casa genética
                                                            opciones: f.opciones.filter(c => opcionesGeneticas.some(o => o.codigo === c && o.casaGenetica === casa)),
                                                        })
                                                    }}>
                                                    <option value="">{variedades.length ? "—" : "Sin variedades"}</option>
                                                    {variedades.map(v => <option key={v.id} value={v.nombre}>{v.casaGenetica ? `${v.nombre} · ${v.casaGenetica}` : v.nombre}</option>)}
                                                </select>
                                            </label>
                                            <label className="space-y-1 text-xs">
                                                <span className="text-muted-foreground">Cantidad de plantas *</span>
                                                <Input className="h-9" inputMode="numeric" value={f.cantidad} placeholder="0"
                                                    onChange={e => actualizar(f.clave, { cantidad: e.target.value.replace(/\D/g, "") })} />
                                            </label>
                                            <label className="space-y-1 text-xs">
                                                <span className="text-muted-foreground">Ubicación (cama, era, bloque)</span>
                                                <Input className="h-9" value={f.ubicacion} placeholder="Ej: Cama 3"
                                                    onChange={e => actualizar(f.clave, { ubicacion: e.target.value })} />
                                            </label>
                                            <label className="space-y-1 text-xs">
                                                <span className="text-muted-foreground">Fecha de ingreso</span>
                                                <Input className="h-9" type="date" value={f.fechaIngreso} onChange={e => actualizar(f.clave, { fechaIngreso: e.target.value })} />
                                            </label>
                                            <label className="space-y-1 text-xs">
                                                <span className="text-muted-foreground">Mover a etapa</span>
                                                <select className={sel} value={f.etapa} onChange={e => actualizar(f.clave, { etapa: e.target.value as EtapaVivero })}>
                                                    {ETAPAS_VIVERO.map(e => <option key={e.valor} value={e.valor}>{e.nombre}</option>)}
                                                </select>
                                            </label>
                                        </div>
                                        {f.casaGenetica && <p className="mt-1.5 text-xs text-muted-foreground">Casa genética: {f.casaGenetica}</p>}
                                        {(() => {
                                            const disponibles = f.casaGenetica ? opcionesGeneticas.filter(o => o.casaGenetica === f.casaGenetica) : []
                                            if (!disponibles.length) return null
                                            return (
                                                <div className="mt-2 space-y-1">
                                                    <span className="text-xs text-muted-foreground">Opciones genéticas</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {disponibles.map(o => {
                                                            const activa = f.opciones.includes(o.codigo)
                                                            return (
                                                                <button key={o.id} type="button" aria-pressed={activa} title={o.descripcion ?? o.nombre}
                                                                    onClick={() => actualizar(f.clave, { opciones: activa ? f.opciones.filter(c => c !== o.codigo) : [...f.opciones, o.codigo] })}
                                                                    className={cn("rounded-md border px-2 py-1 text-xs transition-colors",
                                                                        activa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50")}>
                                                                    <span className="font-mono font-semibold">{o.codigo}</span> {o.nombre}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )
                            })}
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange([...filas, filaVacia(etapa.valor, ultimoCultivo)])}>
                                <Plus className="mr-1.5 h-4 w-4" /> Agregar a {etapa.nombre.toLowerCase()}
                            </Button>
                        </div>
                    </section>
                )
            })}
            <div className="flex justify-end text-sm">
                Total en vivero: <span className="ml-1 font-semibold tabular-nums">{formatEntero(total)}</span>&nbsp;plantas
            </div>
        </div>
    )
}
