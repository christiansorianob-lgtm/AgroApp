
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, MapPin, Package, FileImage } from "lucide-react"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface TaskExecutionDetailsProps {
    tarea: any
}

export function TaskExecutionDetails({ tarea }: TaskExecutionDetailsProps) {
    const evidenciasList = tarea.evidencias ? tarea.evidencias.split('\n') : []

    return (
        <div className="space-y-6">
            <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl text-green-700 dark:text-green-400">Tarea Finalizada</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                            {tarea.estado}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha Ejecución</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">
                                        {tarea.fechaEjecucion ? new Date(tarea.fechaEjecucion).toLocaleDateString() : 'No registrada'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Desarrollo de la Actividad</Label>
                                <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">
                                    {tarea.observaciones || "Sin observaciones."}
                                </p>
                            </div>
                        </div>

                        {evidenciasList.length > 0 && (
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Registro Fotográfico</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {evidenciasList.map((url: string, idx: number) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-md overflow-hidden border bg-muted group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Evidencia ${idx + 1}`}
                                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <FileImage className="w-6 h-6 text-white drop-shadow-md" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Recursos Utilizados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold mb-3">
                            <Package className="w-4 h-4" />
                            Consumo de Productos
                        </h4>
                        {tarea.consumos.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No se registraron consumos.</p>
                        ) : (
                            <div className="bg-background rounded-lg border divide-y">
                                {tarea.consumos.map((c: any) => (
                                    <div key={c.id} className="flex justify-between items-center p-3 text-sm">
                                        <span className="font-medium">{c.producto.nombre}</span>
                                        <Badge variant="secondary">
                                            {c.cantidad} {c.producto.unidadMedida}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="flex items-center gap-2 font-semibold mb-3">
                            <i className="lucide-tractor w-4 h-4" /> {/* Use generic icon if Tractor not available */}
                            Uso de Maquinaria
                        </h4>
                        {!tarea.usosMaquinaria || tarea.usosMaquinaria.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No se registró uso de maquinaria.</p>
                        ) : (
                            <div className="bg-background rounded-lg border divide-y">
                                {tarea.usosMaquinaria.map((u: any) => (
                                    <div key={u.id} className="flex justify-between items-center p-3 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{u.maquina.tipo?.nombre} - {u.maquina.marca?.nombre}</span>
                                            <span className="text-xs text-muted-foreground">Código: {u.maquina.codigo}</span>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="mb-0.5">
                                                {u.horasUso} Horas
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
