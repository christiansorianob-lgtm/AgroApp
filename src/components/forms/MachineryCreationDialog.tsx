'use client'

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Loader2, Plus } from "lucide-react"
import { createMaquinaria, getTiposMaquinaria, getMarcasMaquinaria, getUbicacionesMaquinaria } from "@/app/actions/maquinaria"
import { getFincas } from "@/app/actions/fincas"

export function MachineryCreationDialog({ onMachineCreated, defaultFincaId }: { onMachineCreated?: (machine: any) => void, defaultFincaId?: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data
    const [fincas, setFincas] = useState<any[]>([])
    const [tipos, setTipos] = useState<any[]>([])
    const [marcas, setMarcas] = useState<any[]>([])
    const [ubicaciones, setUbicaciones] = useState<any[]>([])

    // Form
    const [fincaId, setFincaId] = useState(defaultFincaId || "")
    const [tipoId, setTipoId] = useState("")
    const [marcaId, setMarcaId] = useState("")
    const [ubicacionId, setUbicacionId] = useState("")
    const [modelo, setModelo] = useState("")
    const [serial, setSerial] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (open) loadCatalogs()
    }, [open])

    async function loadCatalogs() {
        setLoading(true)
        try {
            const [resF, resT, resM, resU] = await Promise.all([
                getFincas(),
                getTiposMaquinaria(),
                getMarcasMaquinaria(),
                getUbicacionesMaquinaria()
            ])
            if (resF.data) setFincas(resF.data)
            if (resT.data) setTipos(resT.data)
            if (resM.data) setMarcas(resM.data)
            if (resU.data) setUbicaciones(resU.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        const formData = new FormData()
        formData.append("fincaId", fincaId)
        formData.append("tipoId", tipoId)
        formData.append("marcaId", marcaId)
        formData.append("ubicacionId", ubicacionId)
        formData.append("modelo", modelo)
        formData.append("serialPlaca", serial)
        formData.append("disable_redirect", "true")

        const res = await createMaquinaria(formData)

        if (res.error) {
            setError(res.error)
        } else {
            setOpen(false)
            router.refresh()
            if (onMachineCreated && res.data) onMachineCreated(res.data)

            // Reset
            setModelo("")
            setSerial("")
        }
        setIsSubmitting(false)
    }

    const fincaOpts = useMemo(() => fincas.map(f => ({ value: f.id, label: f.nombre })), [fincas])
    const tipoOpts = useMemo(() => tipos.map(t => ({ value: t.id, label: t.nombre })), [tipos])
    const marcaOpts = useMemo(() => marcas.map(m => ({ value: m.id, label: m.nombre })), [marcas])
    const ubiOpts = useMemo(() => ubicaciones.map(u => ({ value: u.id, label: u.nombre })), [ubicaciones])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary hover:underline px-2">
                    <Plus className="w-3 h-3 mr-1" /> Crear Nueva
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva Máquina</DialogTitle>
                    <DialogDescription>Registrar nueva maquinaria o equipo.</DialogDescription>
                </DialogHeader>

                {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        {error && <div className="text-red-500 text-sm">{error}</div>}

                        <div className="space-y-2">
                            <Label>Finca Propietaria</Label>
                            <Combobox options={fincaOpts} value={fincaId} onSelect={setFincaId} placeholder="Seleccione Finca..." disabled={!!defaultFincaId} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Combobox options={tipoOpts} value={tipoId} onSelect={setTipoId} placeholder="Tractor..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Marca</Label>
                                <Combobox options={marcaOpts} value={marcaId} onSelect={setMarcaId} placeholder="John Deere..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Modelo</Label>
                                <Input value={modelo} onChange={e => setModelo(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Serial / Placa</Label>
                                <Input value={serial} onChange={e => setSerial(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Ubicación Actual</Label>
                            <Combobox options={ubiOpts} value={ubicacionId} onSelect={setUbicacionId} placeholder="Bodega..." />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Registrar
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
