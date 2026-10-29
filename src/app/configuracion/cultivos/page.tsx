'use client'

import { useState, useEffect } from "react"
import { getTiposCultivo, createTipoCultivo, deleteTipoCultivo, createVariedad, deleteVariedad, createEspecie, deleteEspecie } from "@/app/actions/cultivos"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/layout/PageHeader"
import { Trash2, Plus, Loader2, Sprout, Dna } from "lucide-react"

interface Variedad { id: string; nombre: string; especieId: string | null; casaGenetica: string | null }
interface Especie { id: string; nombre: string; nombreComun: string | null }
interface Tipo { id: string; nombre: string; especies: Especie[]; variedades: Variedad[] }

const selCls = "h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm"

export default function CultivosConfigPage() {
    const [tipos, setTipos] = useState<Tipo[]>([])
    const [loading, setLoading] = useState(true)
    const [newTipo, setNewTipo] = useState("")
    const [ocupado, setOcupado] = useState<string | null>(null)
    // Formularios por cultivo
    const [nuevaEspecie, setNuevaEspecie] = useState<Record<string, { nombre: string; comun: string }>>({})
    const [nuevaVariedad, setNuevaVariedad] = useState<Record<string, { nombre: string; especieId: string; casa: string }>>({})

    useEffect(() => { loadData() }, [])

    async function loadData() {
        const res = await getTiposCultivo()
        if (res.data) setTipos(res.data as Tipo[])
        setLoading(false)
    }

    async function correr(clave: string, fn: () => Promise<{ success?: boolean; error?: string }>, despues?: () => void) {
        setOcupado(clave)
        const res = await fn()
        setOcupado(null)
        if (res.success) { despues?.(); loadData() } else alert(res.error || "No se pudo completar la operación")
    }

    // Casas genéticas ya usadas, como sugerencias
    const casas = Array.from(new Set(tipos.flatMap(t => t.variedades.map(v => v.casaGenetica).filter(Boolean)))) as string[]

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Cultivos, especies y variedades"
                description="Catálogo para clasificar los lotes: cultivo → especie → variedad o cruce → casa genética."
                breadcrumbs={[{ label: "Configuración", href: "/configuracion" }, { label: "Cultivos" }]}
            />

            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Input placeholder="Nuevo cultivo, ej: Cacao" value={newTipo} onChange={e => setNewTipo(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newTipo.trim()) correr("tipo", () => createTipoCultivo(newTipo), () => setNewTipo("")) }} />
                <Button onClick={() => correr("tipo", () => createTipoCultivo(newTipo), () => setNewTipo(""))} disabled={ocupado === "tipo" || !newTipo.trim()}>
                    {ocupado === "tipo" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Agregar cultivo
                </Button>
            </Card>

            <datalist id="casas-geneticas">{casas.map(c => <option key={c} value={c} />)}</datalist>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-6">
                    {tipos.map(tipo => {
                        const ne = nuevaEspecie[tipo.id] ?? { nombre: "", comun: "" }
                        const nv = nuevaVariedad[tipo.id] ?? { nombre: "", especieId: "", casa: "" }
                        const grupos = [
                            ...tipo.especies.map(e => ({ especie: e as Especie | null, variedades: tipo.variedades.filter(v => v.especieId === e.id) })),
                            { especie: null, variedades: tipo.variedades.filter(v => !v.especieId) },
                        ].filter(g => g.especie || g.variedades.length)

                        return (
                            <Card key={tipo.id} className="overflow-hidden">
                                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                                    <h2 className="flex items-center gap-2 font-semibold"><Sprout className="h-4 w-4 text-primary" /> {tipo.nombre}</h2>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        title="Eliminar cultivo"
                                        onClick={() => confirm(`¿Eliminar el cultivo ${tipo.nombre} con sus especies y variedades?`) && correr(tipo.id, () => deleteTipoCultivo(tipo.id))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs text-muted-foreground">
                                            <tr className="border-b border-border">
                                                <th className="px-5 py-2 font-medium">Especie</th>
                                                <th className="px-3 py-2 font-medium">Variedad / cruce</th>
                                                <th className="px-3 py-2 font-medium">Casa genética</th>
                                                <th className="w-10 px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {grupos.length === 0 && (
                                                <tr><td colSpan={4} className="px-5 py-4 text-xs italic text-muted-foreground">Sin especies ni variedades registradas.</td></tr>
                                            )}
                                            {grupos.map(g => (g.variedades.length ? g.variedades : [null]).map((v, i) => (
                                                <tr key={`${g.especie?.id ?? "sin"}-${v?.id ?? "vacia"}`} className="group hover:bg-muted/30">
                                                    {i === 0 && (
                                                        <td rowSpan={Math.max(g.variedades.length, 1)} className="border-r border-border px-5 py-2 align-top">
                                                            {g.especie ? (
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <div className="font-medium italic">{g.especie.nombre}</div>
                                                                        {g.especie.nombreComun && <div className="text-xs text-muted-foreground">{g.especie.nombreComun}</div>}
                                                                    </div>
                                                                    <button className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                                                        title="Eliminar especie (sus variedades quedan sin especie)"
                                                                        onClick={() => confirm(`¿Eliminar la especie ${g.especie!.nombre}?`) && correr(g.especie!.id, () => deleteEspecie(g.especie!.id))}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : <span className="text-xs text-muted-foreground">Sin especie</span>}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2">{v ? v.nombre : <span className="text-xs italic text-muted-foreground">Sin variedades</span>}</td>
                                                    <td className="px-3 py-2 text-muted-foreground">{v?.casaGenetica ?? (v ? "—" : "")}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        {v && (
                                                            <button className="text-muted-foreground hover:text-destructive" title="Eliminar variedad"
                                                                onClick={() => confirm(`¿Eliminar la variedad ${v.nombre}?`) && correr(v.id, () => deleteVariedad(v.id))}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid gap-4 border-t border-border bg-muted/20 p-4 lg:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Dna className="h-3.5 w-3.5" /> Agregar especie</div>
                                        <div className="flex flex-wrap gap-2">
                                            <Input className="h-9 min-w-[150px] flex-1" placeholder="Especie (nombre científico)" value={ne.nombre}
                                                onChange={e => setNuevaEspecie({ ...nuevaEspecie, [tipo.id]: { ...ne, nombre: e.target.value } })} />
                                            <Input className="h-9 min-w-[150px] flex-1" placeholder="Nombre común (opcional)" value={ne.comun}
                                                onChange={e => setNuevaEspecie({ ...nuevaEspecie, [tipo.id]: { ...ne, comun: e.target.value } })} />
                                            <Button size="sm" variant="secondary" disabled={!ne.nombre.trim() || ocupado === `e${tipo.id}`}
                                                onClick={() => correr(`e${tipo.id}`, () => createEspecie(tipo.id, ne.nombre, ne.comun), () => setNuevaEspecie({ ...nuevaEspecie, [tipo.id]: { nombre: "", comun: "" } }))}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sprout className="h-3.5 w-3.5" /> Agregar variedad o cruce</div>
                                        <div className="flex flex-wrap gap-2">
                                            <Input className="h-9 min-w-[130px] flex-1" placeholder="Variedad o cruce" value={nv.nombre}
                                                onChange={e => setNuevaVariedad({ ...nuevaVariedad, [tipo.id]: { ...nv, nombre: e.target.value } })} />
                                            {tipo.especies.length > 0 && (
                                                <select className={selCls} value={nv.especieId}
                                                    onChange={e => setNuevaVariedad({ ...nuevaVariedad, [tipo.id]: { ...nv, especieId: e.target.value } })}>
                                                    <option value="">Especie…</option>
                                                    {tipo.especies.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                                </select>
                                            )}
                                            <Input className="h-9 min-w-[130px] flex-1" placeholder="Casa genética" list="casas-geneticas" value={nv.casa}
                                                onChange={e => setNuevaVariedad({ ...nuevaVariedad, [tipo.id]: { ...nv, casa: e.target.value } })} />
                                            <Button size="sm" variant="secondary" disabled={!nv.nombre.trim() || ocupado === `v${tipo.id}`}
                                                onClick={() => correr(`v${tipo.id}`, () => createVariedad(tipo.id, nv.nombre, nv.especieId, nv.casa), () => setNuevaVariedad({ ...nuevaVariedad, [tipo.id]: { nombre: "", especieId: nv.especieId, casa: "" } }))}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
