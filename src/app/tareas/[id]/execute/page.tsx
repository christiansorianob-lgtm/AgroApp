
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
import { formatDate } from "@/lib/utils"
import { redirect } from "next/navigation"
import { NoAutorizado, sesionDePagina } from "@/lib/auth"
import { esGestor } from "@/lib/sesion"
import { db } from "@/lib/db"
import { MovimientoViveroForm } from "@/components/vivero/MovimientoViveroForm"
import { MovimientoViveroDetalle } from "@/components/vivero/MovimientoViveroDetalle"

export default async function ExecuteTaskPage(props: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await props.params
    const searchParams = await props.searchParams
    const returnTo = searchParams.returnTo as string | undefined

    const sesion = await sesionDePagina()
    const volverA = esGestor(sesion.rol) ? (returnTo || "/tareas") : "/mis-tareas"

    // Fetch task first to get fincaId. Un responsable que abra una tarea ajena vuelve a su lista.
    const tareaRes = await getTareaById(id).catch(e => {
        if (e instanceof NoAutorizado) redirect("/mis-tareas")
        throw e
    })

    if (tareaRes.error || !tareaRes.data) {
        return <div className="p-8 text-center text-red-500">Error: Tarea no encontrada</div>
    }

    const tarea = tareaRes.data as any
    const fincaId = tarea.fincaId

    // Tarea de movimiento de plantas del vivero: formulario propio en lugar del de ejecución general
    const vivero = tarea.movimientoViveroTipo && tarea.loteId ? await db.lote.findUnique({
        where: { id: tarea.loteId },
        select: {
            materialesVivero: { orderBy: [{ etapa: "asc" }, { ubicacion: "asc" }, { variedad: "asc" }] },
            movimientosVivero: { where: { tareaId: tarea.id }, include: { lineas: true } },
            finca: { select: { lotes: { select: { codigo: true, nombre: true }, orderBy: { codigo: "asc" } } } },
        },
    }) : null
    const movimiento = vivero?.movimientosVivero[0] ?? null

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
                <BackButton fallback={volverA} />
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">Ejecutar Tarea</h2>
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
                            <span>Prog: {formatDate(tarea.fechaProgramada)}</span>
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



            {vivero ? (
                movimiento ? <MovimientoViveroDetalle mov={movimiento as any} />
                    : tarea.estado === 'CANCELADA' ? <TaskExecutionDetails tarea={tarea} />
                        : <MovimientoViveroForm tareaId={tarea.id} tipo={tarea.movimientoViveroTipo}
                            materiales={vivero.materialesVivero}
                            destinos={vivero.finca.lotes.map(l => `${l.codigo} ${l.nombre}`)}
                            representante={sesion.nombre} volverA={volverA} />
            ) : (tarea.estado === 'EJECUTADA' || tarea.estado === 'CANCELADA') ? (
                <TaskExecutionDetails tarea={tarea} />
            ) : (
                <ExecutionForm tarea={tarea} productos={productos} maquinaria={maquinaria} returnTo={returnTo} puedeCrearCatalogos={esGestor(sesion.rol)} />
            )}
        </div>
    )
}
