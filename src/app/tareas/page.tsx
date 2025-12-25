import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getTareas } from "@/app/actions/tareas"
import { Plus } from "lucide-react"

export default async function TareasPage() {
    const { data: tareas, error } = await getTareas()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Tareas</h2>
                    <p className="text-muted-foreground">Programación y ejecución de actividades</p>
                </div>
                <Button asChild>
                    <Link href="/tareas/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Tarea
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Tareas</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive mb-4">{error}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tarea</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Nivel</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Prioridad</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tareas?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No hay tareas registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tareas?.map((tarea) => (
                                    <TableRow key={tarea.id}>
                                        <TableCell className="font-medium">
                                            {new Date(tarea.fechaProgramada).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tarea.tipo}</div>
                                            <div className="text-xs text-muted-foreground">{tarea.codigo}</div>
                                        </TableCell>
                                        <TableCell>
                                            {tarea.finca.nombre}
                                            {tarea.lote && <span className="text-muted-foreground"> / {tarea.lote.nombre}</span>}
                                        </TableCell>
                                        <TableCell>{tarea.nivel}</TableCell>
                                        <TableCell>{tarea.responsable}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tarea.estado === 'PROGRAMADA' ? 'bg-blue-100 text-blue-800' :
                                                    tarea.estado === 'EN_PROCESO' ? 'bg-yellow-100 text-yellow-800' :
                                                        tarea.estado === 'EJECUTADA' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {tarea.estado}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-bold ${tarea.prioridad === 'ALTA' ? 'text-red-600' :
                                                    tarea.prioridad === 'MEDIA' ? 'text-yellow-600' :
                                                        'text-green-600'
                                                }`}>
                                                {tarea.prioridad}
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
