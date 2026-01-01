
import { getTareaById } from "@/app/actions/tareas"
import { getProductos } from "@/app/actions/almacen"
import { getMaquinaria } from "@/app/actions/maquinaria"
import { ExecutionForm } from "@/components/forms/ExecutionForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, MapPin } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TaskExecutionDetails } from "@/components/tareas/TaskExecutionDetails"

export default async function ExecuteTaskPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    // Fetch task first to get fincaId
    const tareaRes = await getTareaById(id)

    if (tareaRes.error || !tareaRes.data) {
        return <div className="p-8 text-center text-red-500">Error: Tarea no encontrada</div>
    }

    const tarea = tareaRes.data as any
    const fincaId = tarea.fincaId

    // Fetch resources filtered by fincaId
    const [productosRes, maquinariaRes] = await Promise.all([
        getProductos(fincaId),
        getMaquinaria(fincaId)
    ])

    const productos = productosRes.data || []
    const maquinaria = maquinariaRes.data || []

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <BackButton fallback="/tareas" />
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Ejecutar Tarea</h2>
                    <p className="text-muted-foreground">{tarea.codigo}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">{tarea.tipo}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{tarea.descripcion}</p>
                        </div>
                        <Badge variant={tarea.prioridad === 'ALTA' ? 'destructive' : 'secondary'}>
                            {tarea.prioridad}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Prog: {new Date(tarea.fechaProgramada).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>Resp: {tarea.responsable}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{tarea.finca.nombre} {tarea.lote ? `- ${tarea.lote.nombre}` : ''}</span>
                        </div>
                    </div>

                    {tarea.consumos.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-sm mb-2">Consumos Previos:</h4>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                {tarea.consumos.map((c: any) => (
                                    <li key={c.id}>
                                        {c.producto.nombre} - {c.cantidad} {c.producto.unidadMedida}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Separator />



            {(tarea.estado === 'EJECUTADA' || tarea.estado === 'CANCELADA') ? (
                <TaskExecutionDetails tarea={tarea} />
            ) : (
                <ExecutionForm tarea={tarea} productos={productos} maquinaria={maquinaria} />
            )}
        </div>
    )
}
