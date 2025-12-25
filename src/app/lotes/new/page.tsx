import Link from "next/link"
import { createLote } from "@/app/actions/lotes"
import { getFincas } from "@/app/actions/fincas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default async function NewLotePage() {
    const { data: fincas } = await getFincas()

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/lotes">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nuevo Lote</h2>
                    <p className="text-muted-foreground">Registre un lote dentro de una finca</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información del Lote</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createLote} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fincaId">Finca (Obligatorio)</Label>
                            <select
                                id="fincaId"
                                name="fincaId"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Seleccione una Finca...</option>
                                {fincas?.map((finca) => (
                                    <option key={finca.id} value={finca.id}>
                                        {finca.nombre} ({finca.codigo})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código Lote</Label>
                                <Input id="codigo" name="codigo" placeholder="Ej: L-01" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Lote</Label>
                                <Input id="nombre" name="nombre" placeholder="Ej: Lote Norte" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="areaHa">Área (Ha)</Label>
                                <Input id="areaHa" name="areaHa" type="number" step="0.01" placeholder="0.00" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipoCultivo">Tipo Cultivo</Label>
                                <Input id="tipoCultivo" name="tipoCultivo" placeholder="Ej: Palma de Aceite" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="variedad">Variedad</Label>
                                <Input id="variedad" name="variedad" placeholder="Ej: Guineensis" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fechaSiembra">Fecha Siembra</Label>
                                <Input id="fechaSiembra" name="fechaSiembra" type="date" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Input id="observaciones" name="observaciones" placeholder="Notas..." />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="outline" type="button" asChild>
                                <Link href="/lotes">Cancelar</Link>
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 w-4 h-4" />
                                Guardar Lote
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
