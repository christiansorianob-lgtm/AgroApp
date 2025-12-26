import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BarChart3, ClipboardList, Tractor } from "lucide-react"

// Placeholder for future charts
export default function ReportesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Reportes y Análisis</h2>
                <p className="text-muted-foreground">Consolidado de operación agrícola</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/tareas" className="block group">
                    <Card className="h-full transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cumplimiento de Labores</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Tareas</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Ver detalle de ejecución por fecha y estado.
                            </p>
                            <div className="mt-4 text-primary text-sm flex items-center font-medium">
                                Ir al reporte <ArrowRight className="ml-1 w-4 h-4" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/almacen/movimientos" className="block group">
                    <Card className="h-full transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Consumo de Almacén</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Inventario</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Análisis de costos y movimientos de bodega.
                            </p>
                            <div className="mt-4 text-primary text-sm flex items-center font-medium">
                                Ir al reporte <ArrowRight className="ml-1 w-4 h-4" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/maquinaria/uso" className="block group">
                    <Card className="h-full transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Horas Maquinaria</CardTitle>
                            <Tractor className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Flota</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Registro de horas y mantenimiento preventivo.
                            </p>
                            <div className="mt-4 text-primary text-sm flex items-center font-medium">
                                Ir al reporte <ArrowRight className="ml-1 w-4 h-4" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Exportar Datos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Descargue la información operativa en formato CSV compatible con Excel.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" disabled>Exportar Tareas</Button>
                        <Button variant="outline" disabled>Exportar Inventario</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
