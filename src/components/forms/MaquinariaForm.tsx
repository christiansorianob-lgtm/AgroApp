'use client'

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createMaquinaria, createTipoMaquinaria, createMarcaMaquinaria, createUbicacionMaquinaria } from "@/app/actions/maquinaria"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Loader2 } from "lucide-react"

interface MaquinariaFormProps {
    tipos: { id: string, nombre: string }[]
    marcas: { id: string, nombre: string }[]
    ubicaciones: { id: string, nombre: string }[]
}

export function MaquinariaForm({ tipos, marcas, ubicaciones }: MaquinariaFormProps) {
    const [loading, setLoading] = useState(false)

    return (
        <form action={createMaquinaria as any} onSubmit={() => setLoading(true)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="codigo">Código Interno</Label>
                    <Input
                        id="codigo"
                        name="codigo"
                        value="Autogenerado"
                        readOnly
                        className="bg-muted text-muted-foreground"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="tipoId">Tipo de Máquina</Label>
                        <Link href="/configuracion/tipos-maquinaria" className="text-xs text-primary hover:underline">
                            + Administrar
                        </Link>
                    </div>
                    <select
                        id="tipoId"
                        name="tipoId"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Seleccione tipo...</option>
                        {tipos.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="marcaId">Marca</Label>
                        <Link href="/configuracion/marcas-maquinaria" className="text-xs text-primary hover:underline">
                            + Administrar
                        </Link>
                    </div>
                    <select
                        id="marcaId"
                        name="marcaId"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Seleccione marca...</option>
                        {marcas.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" name="modelo" placeholder="Ej: 5090E" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="serialPlaca">Serial / Placa</Label>
                    <Input id="serialPlaca" name="serialPlaca" placeholder="Ej: XYZ-123" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="estado">Estado Inicial</Label>
                    <select
                        id="estado"
                        name="estado"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="DISPONIBLE">Disponible</option>
                        <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                        <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="ubicacionId">Ubicación</Label>
                    <Link href="/configuracion/ubicaciones-maquinaria" className="text-xs text-primary hover:underline">
                        + Administrar
                    </Link>
                </div>
                <select
                    id="ubicacionId"
                    name="ubicacionId"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">Seleccione ubicación...</option>
                    {ubicaciones.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Input id="observaciones" name="observaciones" placeholder="Notas..." />
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" asChild>
                    <Link href="/maquinaria">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                    Guardar Máquina
                </Button>
            </div>
        </form>
    )
}
