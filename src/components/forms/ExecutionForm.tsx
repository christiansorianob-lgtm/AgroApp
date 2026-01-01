'use client'

import Link from "next/link"

import { useState, useMemo } from "react"
import { executeTarea } from "@/app/actions/tareas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Plus, Trash2, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { Combobox } from "@/components/ui/combobox"
import { ProductCreationDialog } from "./ProductCreationDialog"
import { MachineryCreationDialog } from "./MachineryCreationDialog"

interface ExecutionFormProps {
    tarea: any
    productos: any[]
    maquinaria: any[]
}

export function ExecutionForm({ tarea, productos, maquinaria }: ExecutionFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [estado, setEstado] = useState(tarea.estado)
    const [observaciones, setObservaciones] = useState(tarea.observaciones || "")
    const [evidencias, setEvidencias] = useState(tarea.evidencias || "")
    const [consumos, setConsumos] = useState<{ id: string, productoId: string, cantidad: number }[]>([])
    const [usosMaquinaria, setUsosMaquinaria] = useState<{ id: string, maquinaId: string, horas: number }[]>([])
    const [executionDate, setExecutionDate] = useState(new Date().toISOString().split('T')[0])

    const [files, setFiles] = useState<FileList | null>(null)

    // Options for Comboboxes
    const productoOptions = useMemo(() => productos.map(p => ({
        value: p.id,
        label: `${p.nombre} (Stock: ${p.stockActual} ${p.unidadMedida})`
    })), [productos])

    const maquinariaOptions = useMemo(() => maquinaria.map(m => ({
        value: m.id,
        label: `${m.codigo} - ${m.tipo?.nombre} - ${m.marca?.nombre}`
    })), [maquinaria])

    // Consumption helpers
    const addConsumo = () => {
        setConsumos([...consumos, { id: Math.random().toString(), productoId: "", cantidad: 0 }])
    }

    const removeConsumo = (id: string) => {
        setConsumos(consumos.filter(c => c.id !== id))
    }

    const updateConsumo = (id: string, field: 'productoId' | 'cantidad', value: any) => {
        setConsumos(consumos.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    // Machinery helpers
    const addUsoMaquinaria = () => {
        setUsosMaquinaria([...usosMaquinaria, { id: Math.random().toString(), maquinaId: "", horas: 0 }])
    }

    const removeUsoMaquinaria = (id: string) => {
        setUsosMaquinaria(usosMaquinaria.filter(u => u.id !== id))
    }

    const updateUsoMaquinaria = (id: string, field: 'maquinaId' | 'horas', value: any) => {
        setUsosMaquinaria(usosMaquinaria.map(u => u.id === id ? { ...u, [field]: value } : u))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        // Filter valid consumos
        const validConsumos = consumos.filter(c => c.productoId && c.cantidad > 0)
        const validMaquinaria = usosMaquinaria.filter(u => u.maquinaId && u.horas > 0)

        const formData = new FormData()
        formData.append("fincaId", tarea.fincaId)
        formData.append("estado", estado)
        formData.append("observaciones", observaciones)
        formData.append("fechaEjecucion", new Date(executionDate).toISOString())
        formData.append("consumos", JSON.stringify(validConsumos))
        formData.append("maquinaria", JSON.stringify(validMaquinaria))

        if (files) {
            for (let i = 0; i < files.length; i++) {
                formData.append("evidencias", files[i])
            }
        }

        const result = await executeTarea(tarea.id, formData)

        if (result?.error) {
            alert(result.error)
            setIsSubmitting(false)
        } else {
            // Success handled by redirect in action
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Detalles de Ejecución</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Estado Actual</Label>
                            <Select value={estado} onValueChange={(val: any) => setEstado(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PROGRAMADA">Programada</SelectItem>
                                    <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                                    <SelectItem value="EJECUTADA">Ejecutada (Finalizada)</SelectItem>
                                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de Ejecución</Label>
                            <Input
                                type="date"
                                value={executionDate}
                                onChange={(e) => setExecutionDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Desarrollo de la Actividad / Observaciones</Label>
                        <Textarea
                            placeholder="Describa los detalles del trabajo realizado..."
                            className="min-h-[100px]"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Registro Fotográfico (Subir Fotos)</Label>
                        <Input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => setFiles(e.target.files)}
                            className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">Puede seleccionar varias imágenes.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CardTitle>Insumos Utilizados</CardTitle>
                        <div className="ml-2">
                            <ProductCreationDialog defaultFincaId={tarea.fincaId} />
                        </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addConsumo}>
                        <Plus className="w-4 h-4 mr-2" /> Agregar Insumo
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {consumos.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">
                            No se han registrado consumos para esta tarea.
                        </p>
                    ) : (
                        consumos.map((consumo, index) => (
                            <div key={consumo.id} className="flex gap-4 items-end bg-muted/30 p-3 rounded-md">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs">Producto</Label>
                                    <Combobox
                                        options={productoOptions}
                                        value={consumo.productoId}
                                        onSelect={(val) => updateConsumo(consumo.id, 'productoId', val)}
                                        placeholder="Seleccione..."
                                        searchPlaceholder="Buscar producto..."
                                        emptyText="No encontrado."
                                    />
                                </div>
                                <div className="w-32 space-y-2">
                                    <Label className="text-xs">Cantidad</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        value={consumo.cantidad}
                                        onChange={(e) => updateConsumo(consumo.id, 'cantidad', parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mb-0.5 text-destructive hover:text-destructive/90"
                                    onClick={() => removeConsumo(consumo.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CardTitle>Maquinaria Utilizada</CardTitle>
                        <div className="ml-2">
                            <MachineryCreationDialog defaultFincaId={tarea.fincaId} />
                        </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addUsoMaquinaria}>
                        <Plus className="w-4 h-4 mr-2" /> Agregar Maquinaria
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {usosMaquinaria.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">
                            No se ha registrado uso de maquinaria.
                        </p>
                    ) : (
                        usosMaquinaria.map((uso, index) => (
                            <div key={uso.id} className="flex gap-4 items-end bg-muted/30 p-3 rounded-md">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs">Máquina</Label>
                                    <Combobox
                                        options={maquinariaOptions}
                                        value={uso.maquinaId}
                                        onSelect={(val) => updateUsoMaquinaria(uso.id, 'maquinaId', val)}
                                        placeholder="Seleccione..."
                                        searchPlaceholder="Buscar máquina..."
                                        emptyText="No encontrada."
                                    />
                                </div>
                                <div className="w-32 space-y-2">
                                    <Label className="text-xs">Horas / Cantidad</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        placeholder="0.0"
                                        value={uso.horas}
                                        onChange={(e) => updateUsoMaquinaria(uso.id, 'horas', parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mb-0.5 text-destructive hover:text-destructive/90"
                                    onClick={() => removeUsoMaquinaria(uso.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pb-10">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Guardar Ejecución
                </Button>
            </div>
        </form>
    )
}
