import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMaquinaria } from "@/app/actions/maquinaria"
import { Plus, Wrench } from "lucide-react"

export default async function MaquinariaPage() {
    const { data: maquinas, error } = await getMaquinaria()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Maquinaria</h2>
                    <p className="text-muted-foreground">Flota de vehículos y equipos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/maquinaria/uso">
                            <Wrench className="mr-2 h-4 w-4" />
                            Historial de Uso
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/maquinaria/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Máquina
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Catálogo de Equipos</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Marca / Modelo</TableHead>
                                <TableHead>Serial / Placa</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Ubicación (Finca)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maquinas?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay maquinaria registrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                maquinas?.map((maq) => (
                                    <TableRow key={maq.id}>
                                        <TableCell className="font-medium">{maq.codigo}</TableCell>
                                        <TableCell>{maq.tipo}</TableCell>
                                        <TableCell>{maq.marca} {maq.modelo}</TableCell>
                                        <TableCell>{maq.serialPlaca}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${maq.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                                                    maq.estado === 'EN_USO' ? 'bg-blue-100 text-blue-800' :
                                                        maq.estado === 'EN_MANTENIMIENTO' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {maq.estado.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>{maq.fincaId}</TableCell>
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
