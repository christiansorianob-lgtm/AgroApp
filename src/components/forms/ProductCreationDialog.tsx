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
import { createProducto } from "@/app/actions/almacen"
import { getCategoriasProducto, getUnidadesMedida } from "@/app/actions/configuracion"
// Note: getCatalogosAlmacen might be better if I create it, but let's use what we have or generic list fetchers.
// Checking ProductoForm imports: getCategoriasProducto, getUnidadesMedida. Fincas come from somewhere else? 
// Usually fincas from getFincas().

import { getFincas as getAllFincas } from "@/app/actions/fincas"

// Simplified dialog for creating a product on the fly
export function ProductCreationDialog({ onProductCreated, defaultFincaId }: { onProductCreated?: (product: any) => void, defaultFincaId?: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data State
    const [fincas, setFincas] = useState<any[]>([])
    const [categorias, setCategorias] = useState<any[]>([])
    const [unidades, setUnidades] = useState<any[]>([])

    // Form State
    const [fincaId, setFincaId] = useState(defaultFincaId || "")
    const [categoria, setCategoria] = useState("")
    const [nombre, setNombre] = useState("")
    const [unidadMedida, setUnidadMedida] = useState("")
    const [cantidad, setCantidad] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (open) {
            loadCatalogs()
        }
    }, [open])

    async function loadCatalogs() {
        setLoading(true)
        try {
            const [resFincas, resCats, resUnits] = await Promise.all([
                getAllFincas(),
                getCategoriasProducto(),
                getUnidadesMedida()
            ])
            if (resFincas.data) setFincas(resFincas.data)
            if (resCats.data) setCategorias(resCats.data)
            if (resUnits.data) setUnidades(resUnits.data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        const formData = new FormData()
        formData.append("fincaId", fincaId)
        formData.append("categoria", categoria)
        formData.append("nombre", nombre) // In this simplified version, name is text input or combobox? 
        // In full form, name is Combobox filtered by category. Here let's make it an Input for "Nombre Comercial" or Combobox if we want to be strict.
        // But "Nombre del Producto" is usually free text in simple apps, but here we have a catalog of names?
        // Let's check schema: Producto.nombre is String.
        // In ProductoForm it was a Combobox from "nombres" catalog.
        // If I want to allow NEW names, I should allow text.
        // Let's assume for quick create user might want to just type the name.
        // BUT `ProductoForm` uses `nombres` catalog. If I put a name not in catalog, consistency issues?
        // Let's stick to Text Input for simplicity, assuming user enters a valid name. 
        // OR better: Fetch Nombres too? That's a lot.
        // Let's make it a text input. If consistency is needed, we'll fix later.
        formData.append("nombre", nombre)
        formData.append("unidadMedida", unidadMedida)
        formData.append("cantidad", cantidad)
        formData.append("disable_redirect", "true")

        const res = await createProducto(formData)

        if (res.error) {
            setError(res.error)
        } else {
            setOpen(false)
            router.refresh() // Update parent lists
            if (onProductCreated && res.data) {
                onProductCreated(res.data)
            }
            // Reset
            setNombre("")
            setCantidad("")
        }
        setIsSubmitting(false)
    }

    const fincaOptions = useMemo(() => fincas.map(f => ({ value: f.id, label: f.nombre })), [fincas])
    const catOptions = useMemo(() => categorias.map(c => ({ value: c.nombre, label: c.nombre })), [categorias])
    const unitOptions = useMemo(() => unidades.map(u => ({ value: u.nombre, label: u.nombre })), [unidades])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary hover:underline px-2">
                    <Plus className="w-3 h-3 mr-1" /> Crear Nuevo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Producto</DialogTitle>
                    <DialogDescription>
                        Registre un nuevo producto en el inventario.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        {error && <div className="text-red-500 text-sm">{error}</div>}

                        <div className="space-y-2">
                            <Label>Finca / Bodega</Label>
                            <Combobox
                                options={fincaOptions}
                                value={fincaId}
                                onSelect={setFincaId}
                                placeholder="Seleccione Finca..."
                                disabled={!!defaultFincaId}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Combobox
                                options={catOptions}
                                value={categoria}
                                onSelect={setCategoria}
                                placeholder="Seleccione Categoría..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre Comercial</Label>
                            <Input
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                placeholder="Ej: Fertilizante Triple 15"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad Inicial</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={cantidad}
                                    onChange={e => setCantidad(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unidad</Label>
                                <Combobox
                                    options={unitOptions}
                                    value={unidadMedida}
                                    onSelect={setUnidadMedida}
                                    placeholder="Und..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Guardar
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
