import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getProductos } from "@/app/actions/almacen"
import { Plus, Package } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"

export default async function InsumosPage() {
    const { data: productos, error } = await getProductos()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton fallback="/dashboard" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-primary">Gestión de Almacén</h2>
                        <p className="text-muted-foreground">Inventario y existencias</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/almacen/movimientos">
                            <Package className="mr-2 h-4 w-4" />
                            Ver Movimientos
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/almacen/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Producto
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
                                <TableHead>Finca</TableHead>
                                <TableHead className="text-right">Stock Actual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay productos registrados en almacén.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                productos?.map((producto) => {
                                    return (
                                        <TableRow key={producto.id}>
                                            <TableCell className="font-medium">{producto.codigo}</TableCell>
                                            <TableCell>{producto.nombre}</TableCell>
                                            <TableCell>{producto.categoria}</TableCell>
                                            <TableCell>{producto.unidadMedida}</TableCell>
                                            <TableCell>{producto.finca?.nombre}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">{producto.stockActual}</TableCell>
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
