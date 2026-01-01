'use client';

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, MapPin, Package, FileImage, Map as MapIcon, X, Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog"

const TrackingMap = dynamic(() => import("./TrackingMap"), {
    loading: () => <div className="h-[400px] w-full bg-muted animate-pulse rounded-lg" />,
    ssr: false
})

interface TaskExecutionDetailsProps {
    tarea: any
}

export function TaskExecutionDetails({ tarea }: TaskExecutionDetailsProps) {
    const evidenciasList = tarea.evidencias ? tarea.evidencias.split('\n') : []
    const points = tarea.trazabilidad || []
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha Inicio</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-sm">
                                            {tarea.fechaInicioReal ? new Date(tarea.fechaInicioReal).toLocaleString('es-CO') : 'No registrada'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha Finalización</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-sm">
                                            {tarea.fechaEjecucion ? new Date(tarea.fechaEjecucion).toLocaleString('es-CO') : 'No registrada'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tiempo Gastado</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">
                                        {(() => {
                                            const durationHours = tarea.duracionRealHoras ??
                                                ((tarea.fechaInicioReal && tarea.fechaEjecucion)
                                                    ? (new Date(tarea.fechaEjecucion).getTime() - new Date(tarea.fechaInicioReal).getTime()) / (1000 * 60 * 60)
                                                    : null);

                                            if (durationHours === null) return 'No registrado';

                                            // Ensure non-negative
                                            const safeHours = Math.max(0, durationHours);
                                            const totalMinutes = Math.round(safeHours * 60);

                                            if (totalMinutes < 60) {
                                                return `${totalMinutes} Minutos`;
                                            } else {
                                                const hours = Math.floor(totalMinutes / 60);
                                                const mins = totalMinutes % 60;
                                                return `${hours} Horas ${mins > 0 ? `${mins} Minutos` : ''}`;
                                            }
                                        })()}
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
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedImage(url)}
                                            className="relative aspect-square rounded-md overflow-hidden border bg-muted group cursor-pointer"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Evidencia ${idx + 1}`}
                                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <FileImage className="w-6 h-6 text-white drop-shadow-md" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapIcon className="w-5 h-5" />
                        Recorrido GPS
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {tarea.requiereTrazabilidad ? (
                        <TrackingMap points={points} />
                    ) : (
                        <div className="flex items-center justify-center h-32 bg-muted/20 rounded-lg border border-dashed">
                            <p className="text-muted-foreground italic flex items-center gap-2">
                                <MapIcon className="w-4 h-4 opacity-50" />
                                Esta actividad no requirió trazabilidad.
                            </p>
                        </div>
                    )}
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

            {/* Lightbox Dialog using standard shadcn/custom components */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-black/90 flex items-center justify-center">
                    <DialogTitle className="sr-only">Detalle de Evidencia</DialogTitle>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50">
                        <X className="h-6 w-6 text-white" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    {selectedImage && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={selectedImage}
                            alt="Evidencia Full"
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
