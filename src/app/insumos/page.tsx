import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getInsumos } from "@/app/actions/insumos"
import { Plus, Package } from "lucide-react"

export default async function InsumosPage() {
    const { data: insumos, error } = await getInsumos()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Insumos</h2>
                    <p className="text-muted-foreground">Catálogo y existencias</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/insumos/movimientos">
                            <Package className="mr-2 h-4 w-4" />
                            Ver Movimientos
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/insumos/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Insumo
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Catálogo de Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">Stock Global (Est.)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {insumos?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No hay insumos registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                insumos?.map((insumo) => {
                                    // Rough calculation of stock from movements for UI demo
                                    const entrada = insumo.movimientos.filter(m => m.tipoMovimiento === 'ENTRADA' || m.tipoMovimiento === 'AJUSTE').reduce((acc, m) => acc + m.cantidad, 0)
                                    const salida = insumo.movimientos.filter(m => m.tipoMovimiento === 'SALIDA').reduce((acc, m) => acc + m.cantidad, 0)
                                    const stock = entrada - salida

                                    return (
                                        <TableRow key={insumo.id}>
                                            <TableCell className="font-medium">{insumo.codigo}</TableCell>
                                            <TableCell>{insumo.nombre}</TableCell>
                                            <TableCell>{insumo.categoria}</TableCell>
                                            <TableCell>{insumo.unidadMedida}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">{stock}</TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
