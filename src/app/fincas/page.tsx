import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getFincas } from "@/app/actions/fincas"
import { Plus } from "lucide-react"

export default async function FincasPage() {
    const { data: fincas, error } = await getFincas()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Fincas</h2>
                    <p className="text-muted-foreground">Gestión de unidades productivas</p>
                </div>
                <Button asChild>
                    <Link href="/fincas/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Finca
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Fincas</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Área (Ha)</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fincas?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No hay fincas registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fincas?.map((finca) => (
                                    <TableRow key={finca.id}>
                                        <TableCell className="font-medium">{finca.codigo}</TableCell>
                                        <TableCell>{finca.nombre}</TableCell>
                                        <TableCell>{finca.municipio}, {finca.departamento}</TableCell>
                                        <TableCell>{finca.areaTotalHa}</TableCell>
                                        <TableCell>{finca.responsable}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${finca.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {finca.estado}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/fincas/${finca.id}`}>Ver</Link>
                                            </Button>
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
