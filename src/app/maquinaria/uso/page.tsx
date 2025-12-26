import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getUsoMaquinaria } from "@/app/actions/maquinaria"
import { Plus, ArrowLeft } from "lucide-react"

export default async function UsoMaquinariaPage() {
    const { data: usos, error } = await getUsoMaquinaria()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/maquinaria">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Historial de Uso</h2>
                    <p className="text-muted-foreground">Registro operativo de maquinaria</p>
                </div>
                <Button asChild>
                    <Link href="/maquinaria/uso/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Uso
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Logs de Actividad</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Máquina</TableHead>
                                <TableHead>Tarea Asociada</TableHead>
                                <TableHead>Operador</TableHead>
                                <TableHead className="text-right">Horas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {usos?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No hay registros de uso.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                usos?.map((uso) => (
                                    <TableRow key={uso.id}>
                                        <TableCell className="font-medium">{new Date(uso.fechaInicio).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div>{uso.maquina.tipo.nombre}</div>
                                            <div className="text-xs text-muted-foreground">{uso.maquina.codigo}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{uso.tarea.tipo}</div>
                                            <div className="text-xs text-muted-foreground">{uso.tarea.codigo}</div>
                                        </TableCell>
                                        <TableCell>{uso.operador}</TableCell>
                                        <TableCell className="text-right font-bold">{uso.horasUso}</TableCell>
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
