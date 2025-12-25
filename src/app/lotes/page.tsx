import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLotes } from "@/app/actions/lotes"
import { Plus } from "lucide-react"

export default async function LotesPage() {
    const { data: lotes, error } = await getLotes()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Lotes</h2>
                    <p className="text-muted-foreground">Gestión de lotes y cultivos</p>
                </div>
                <Button asChild>
                    <Link href="/lotes/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Lote
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Inventario de Lotes</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Finca</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre Lote</TableHead>
                                <TableHead>Cultivo</TableHead>
                                <TableHead>Área (Ha)</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lotes?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay lotes registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lotes?.map((lote) => (
                                    <TableRow key={lote.id}>
                                        <TableCell className="font-medium">{lote.finca.nombre}</TableCell>
                                        <TableCell>{lote.codigo}</TableCell>
                                        <TableCell>{lote.nombre}</TableCell>
                                        <TableCell>{lote.tipoCultivo} {lote.variedad ? `(${lote.variedad})` : ''}</TableCell>
                                        <TableCell>{lote.areaHa}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lote.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                                                    lote.estado === 'INACTIVO' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {lote.estado}
                                            </span>
                                        </TableCell>
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
