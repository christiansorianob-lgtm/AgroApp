'use client'

import { useEffect, useState } from "react"
import { getOpcionesGeneticas, createOpcionGenetica, deleteOpcionGenetica } from "@/app/actions/cultivos"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GRUPOS_OPCION } from "@/lib/cultivos"
import { Plus, Trash2, Loader2, Tags } from "lucide-react"

interface Opcion { id: string; codigo: string; nombre: string; grupo: string; casaGenetica: string; descripcion: string | null }

const VACIA = { codigo: "", nombre: "", grupo: "Sanidad", casaGenetica: "", descripcion: "" }

/** Catálogo de opciones genéticas (#S, #PC…) que las casas genéticas agregan sobre un cruce. */
export function OpcionesGeneticasManager({ casasSugeridas = [] }: { casasSugeridas?: string[] }) {
    const [opciones, setOpciones] = useState<Opcion[]>([])
    const [cargando, setCargando] = useState(true)
    const [nueva, setNueva] = useState(VACIA)
    const [guardando, setGuardando] = useState(false)

    const cargar = async () => {
        const r = await getOpcionesGeneticas()
        if (r.data) setOpciones(r.data)
        setCargando(false)
    }
    useEffect(() => { cargar() }, [])

    const agregar = async () => {
        setGuardando(true)
        const r = await createOpcionGenetica(nueva)
        setGuardando(false)
        if (r.error) return alert(r.error)
        setNueva({ ...VACIA, casaGenetica: nueva.casaGenetica, grupo: nueva.grupo })
        cargar()
    }

    const casas = Array.from(new Set([...opciones.map(o => o.casaGenetica), ...casasSugeridas]))
    const porCasa = casas.map(c => ({ casa: c, items: opciones.filter(o => o.casaGenetica === c) })).filter(g => g.items.length)

    return (
        <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-5 py-3">
                <h2 className="flex items-center gap-2 font-semibold"><Tags className="h-4 w-4 text-primary" /> Opciones genéticas</h2>
                <p className="text-xs text-muted-foreground">Características que la casa genética agrega sobre un cruce, p. ej. PalmElit #S (crecimiento lento) o #PC (resistencia a Pudrición del Cogollo). Un lote puede tener varias.</p>
            </div>
            {cargando ? (
                <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                            <tr className="border-b border-border">
                                <th className="px-5 py-2 font-medium">Casa genética</th>
                                <th className="px-3 py-2 font-medium">Código</th>
                                <th className="px-3 py-2 font-medium">Nombre</th>
                                <th className="px-3 py-2 font-medium">Grupo</th>
                                <th className="w-10 px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {porCasa.length === 0 && <tr><td colSpan={5} className="px-5 py-4 text-xs italic text-muted-foreground">Sin opciones registradas.</td></tr>}
                            {porCasa.map(g => g.items.map((o, i) => (
                                <tr key={o.id} className="hover:bg-muted/30">
                                    {i === 0 && <td rowSpan={g.items.length} className="border-r border-border px-5 py-2 align-top font-medium">{g.casa}</td>}
                                    <td className="px-3 py-2 font-mono font-semibold">{o.codigo}</td>
                                    <td className="px-3 py-2">{o.nombre}{o.descripcion && <div className="text-xs text-muted-foreground">{o.descripcion}</div>}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{o.grupo}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button className="text-muted-foreground hover:text-destructive" title="Eliminar opción"
                                            onClick={async () => { if (confirm(`¿Eliminar ${o.codigo} de ${o.casaGenetica}?`)) { await deleteOpcionGenetica(o.id); cargar() } }}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="space-y-2 border-t border-border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agregar opción</div>
                <div className="grid gap-2 sm:grid-cols-[110px_1fr_160px_170px_auto]">
                    <Input className="h-9 font-mono" placeholder="#S" value={nueva.codigo} onChange={e => setNueva({ ...nueva, codigo: e.target.value })} />
                    <Input className="h-9" placeholder="Nombre, ej: Short – crecimiento lento" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} />
                    <select className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm" value={nueva.grupo} onChange={e => setNueva({ ...nueva, grupo: e.target.value })}>
                        {GRUPOS_OPCION.map(g => <option key={g}>{g}</option>)}
                    </select>
                    <Input className="h-9" placeholder="Casa genética" list="casas-geneticas" value={nueva.casaGenetica} onChange={e => setNueva({ ...nueva, casaGenetica: e.target.value })} />
                    <Button size="sm" variant="secondary" className="h-9" onClick={agregar}
                        disabled={guardando || !nueva.codigo.trim() || !nueva.nombre.trim() || !nueva.casaGenetica.trim()}>
                        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
                <Input className="h-9" placeholder="Descripción (opcional)" value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} />
            </div>
        </Card>
    )
}
