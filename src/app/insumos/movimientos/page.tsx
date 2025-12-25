import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Plus } from "lucide-react"

// Stub for movement action (fetching)
// In a real app we'd fetch db.movimientoInventario.findMany
// We reuse the pattern from previous pages.
import { db } from "@/lib/db"

async function getMovimientos() {
    'use server'
    try {
        const movs = await db.movimientoInventario.findMany({
            include: {
                insumo: true,
                finca: true
            },
            orderBy: { fecha: 'desc' }
        })
        return { data: movs }
    } catch (e) {
        return { error: "Error al cargar movimientos" }
    }
}

export default async function MovimientosPage() {
    const { data: movimientos, error } = await getMovimientos()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/insumos">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Movimientos de Inventario</h2>
                    <p className="text-muted-foreground">Entradas, Salidas y Ajustes</p>
                </div>
                {/* We generally add movements via specific forms (Purchase, Consumption in Task)
            But a generic "Adjustment" form is useful. */}
                <Button variant="outline" disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Ajuste (Próximamente)
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Transacciones</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Insumo</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Finca / Destino</TableHead>
                                <TableHead>Referencia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movimientos?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay movimientos registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movimientos?.map((mov) => (
                                    <TableRow key={mov.id}>
                                        <TableCell className="font-medium">{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mov.tipoMovimiento === 'ENTRADA' ? 'bg-green-100 text-green-800' :
                                                    mov.tipoMovimiento === 'SALIDA' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {mov.tipoMovimiento}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div>{mov.insumo.nombre}</div>
                                            <div className="text-xs text-muted-foreground">{mov.insumo.codigo}</div>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {mov.tipoMovimiento === 'SALIDA' ? '-' : '+'}{mov.cantidad} {mov.insumo.unidadMedida}
                                        </TableCell>
                                        <TableCell>{mov.finca.nombre}</TableCell>
                                        <TableCell>{mov.referencia}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
