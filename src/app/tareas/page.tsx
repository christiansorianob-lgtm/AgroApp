import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getTareas } from "@/app/actions/tareas"
import { Plus } from "lucide-react"
import { BackButton } from "@/components/common/BackButton"

export default async function TareasPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams
    const fincaId = searchParams.fincaId as string | undefined
    const loteId = searchParams.loteId as string | undefined
    const filterNivel = searchParams.filter as string | undefined // 'finca_only'
    const statusParam = searchParams.status as string | undefined
    const delayedParam = searchParams.delayed as string | undefined

    // Determine filters for Server Action
    const filters: any = {}
    if (loteId) filters.loteId = loteId
    if (fincaId) filters.fincaId = fincaId
    if (filterNivel === 'finca_only') filters.nivel = 'FINCA'

    if (statusParam) {
        filters.estado = statusParam.split(',')
    }

    if (delayedParam === 'true') {
        filters.delayed = true
    }

    const { data: tareas, error } = await getTareas(filters)

    // Construct query string for new task
    const newParams = new URLSearchParams()
    if (fincaId) newParams.set('fincaId', fincaId)
    if (loteId) newParams.set('loteId', loteId)
    const newHref = `/tareas/new?${newParams.toString()}`

    // Construct toggle filter link for Finca context
    const toggleFilterParams = new URLSearchParams(newParams)
    if (filterNivel === 'finca_only') {
        toggleFilterParams.delete('filter') // Remove filter to show all
    } else {
        toggleFilterParams.set('filter', 'finca_only') // Add filter
    }
    const toggleFilterHref = `/tareas?${toggleFilterParams.toString()}`

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton fallback="/" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-primary">Tareas</h2>
                        <div className="text-muted-foreground flex items-center gap-2">
                            <p>Programación y ejecución de actividades</p>
                            {loteId && <span className="text-xs bg-muted px-2 py-1 rounded">Filtrado por Lote</span>}
                            {fincaId && !loteId && <span className="text-xs bg-muted px-2 py-1 rounded">Contexto Finca</span>}
                            {statusParam && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Estado: {statusParam.replace(',', ', ')}</span>}
                            {delayedParam === 'true' && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Atrasadas</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Toggle Button for Finca Context */}
                    {fincaId && !loteId && (
                        <Button variant={filterNivel === 'finca_only' ? "secondary" : "outline"} asChild>
                            <Link href={toggleFilterHref}>
                                {filterNivel === 'finca_only' ? "Ver Todas" : "Solo Nivel Finca"}
                            </Link>
                        </Button>
                    )}

                    <Button asChild>
                        <Link href={newHref}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Tarea
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {loteId ? "Tareas del Lote" :
                            fincaId ? (filterNivel === 'finca_only' ? "Tareas Generales de la Finca" : "Todas las Tareas de la Finca") :
                                "Listado General de Tareas"}
                    </CardTitle>
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
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tareas?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No hay tareas registradas para este filtro.
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
                                                {tarea.estado.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tarea.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
                                                tarea.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {tarea.prioridad}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/tareas/${tarea.id}/execute?fincaId=${fincaId || ''}&loteId=${loteId || ''}`}>
                                                    Gestionar
                                                </Link>
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
