'use client'

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { createAjusteInventario } from "@/app/actions/almacen"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Combobox } from "@/components/ui/combobox"

interface NewAdjustmentDialogProps {
    productos: any[]
    fincas: any[]
}

export function NewAdjustmentDialog({ productos, fincas }: NewAdjustmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form
    const [productoId, setProductoId] = useState("")
    const [fincaId, setFincaId] = useState(fincas.length > 0 ? fincas[0].id : "")
    const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA")
    const [cantidad, setCantidad] = useState("")
    const [observaciones, setObservaciones] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    // Options mapping
    const productoOptions = useMemo(() => productos.map(p => ({
        value: p.id,
        label: `${p.nombre} (${p.stockActual} ${p.unidadMedida})`
    })), [productos])

    const fincaOptions = useMemo(() => fincas.map(f => ({
        value: f.id,
        label: f.nombre
    })), [fincas])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage("")

        try {
            const formData = new FormData()
            formData.append("productoId", productoId)
            formData.append("fincaId", fincaId)
            formData.append("tipoMovimiento", tipo)
            formData.append("cantidad", cantidad)
            formData.append("observaciones", observaciones)

            const res = await createAjusteInventario(formData)

            if (res?.error) {
                setErrorMessage(res.error)
            } else {
                setOpen(false)
                // Reset form
                setCantidad("")
                setObservaciones("")
                setTipo("ENTRADA")
            }
        } catch (error) {
            setErrorMessage("Error inesperado al crear el ajuste")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Ajuste
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Ajuste de Inventario</DialogTitle>
                    <DialogDescription>
                        Ingresa movimientos manuales como compras o pérdidas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {errorMessage && (
                        <div className="bg-red-50 text-red-600 p-2 rounded text-sm border border-red-200">
                            {errorMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Tipo de Movimiento</Label>
                            <RadioGroup value={tipo} onValueChange={(v: any) => setTipo(v)} className="flex gap-4">
                                <div className="flex items-center space-x-2 border p-3 rounded-lg w-full hover:bg-muted cursor-pointer">
                                    <RadioGroupItem value="ENTRADA" id="r1" />
                                    <Label htmlFor="r1" className="cursor-pointer font-medium text-green-700">Entrada (Compra)</Label>
                                </div>
                                <div className="flex items-center space-x-2 border p-3 rounded-lg w-full hover:bg-muted cursor-pointer">
                                    <RadioGroupItem value="SALIDA" id="r2" />
                                    <Label htmlFor="r2" className="cursor-pointer font-medium text-red-700">Salida (Baja)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="producto">Producto</Label>
                            <Combobox
                                options={productoOptions}
                                value={productoId}
                                onSelect={setProductoId}
                                placeholder="Seleccionar producto..."
                                searchPlaceholder="Buscar producto..."
                                emptyText="No encontrado."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cantidad">Cantidad</Label>
                            <Input
                                id="cantidad"
                                type="number"
                                step="0.01"
                                min="0"
                                value={cantidad}
                                onChange={e => setCantidad(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="finca">Finca / Bodega</Label>
                            <Combobox
                                options={fincaOptions}
                                value={fincaId}
                                onSelect={setFincaId}
                                placeholder="Seleccionar ubicación..."
                                searchPlaceholder="Buscar ubicación..."
                                emptyText="No encontrada."
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="obs">Observaciones / Referencia</Label>
                            <Textarea
                                id="obs"
                                placeholder="Ej: Compra Factura #123, Vencimiento lote anterior..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Movimiento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
