import Link from "next/link"
import { notFound } from "next/navigation"
import { getFincaById } from "@/services/fincas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Ruler, User, Calendar, Plus, Leaf, Pencil, ClipboardList, ExternalLink } from "lucide-react"
import { FincaMapViewer } from "@/components/ui/FincaMapViewer"
import { GoBackButton } from "@/components/ui/GoBackButton"

export default async function FincaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const finca = await getFincaById(id)

    if (!finca) {
        notFound()
    }

    const polygonData = finca.poligono ? JSON.parse(finca.poligono as string) : []

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <GoBackButton fallbackRoute="/fincas" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                            {finca.nombre}
                            <Badge variant={finca.estado === 'ACTIVO' ? 'default' : 'destructive'}>
                                {finca.estado}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {finca.municipio}, {finca.departamento} ({finca.veredaSector})
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/tareas?fincaId=${finca.id}`}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Ver Tareas
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/lotes/new?fincaId=${finca.id}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Lote
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/tareas/new?fincaId=${finca.id}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Tarea
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    Code
                                </span>
                                <span className="font-mono font-bold">{finca.codigo}</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Ruler className="w-4 h-4" /> Área Total
                                </span>
                                <span className="font-medium">{finca.areaTotalHa} Ha</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" /> Responsable
                                </span>
                                <span className="font-medium">{finca.responsable}</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Creado
                                </span>
                                <span className="font-medium">{finca.createdAt.toLocaleDateString()}</span>
                            </div>
                            {finca.observaciones && (
                                <div className="pt-2">
                                    <span className="text-muted-foreground block mb-1">Observaciones:</span>
                                    <p className="text-sm bg-muted p-2 rounded">{finca.observaciones}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Map View */}
                <div className="lg:col-span-2">
                    <Card className="h-[500px] flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Ubicación Geográfica</span>
                                {finca.latitud && finca.longitud && (
                                    <a
                                        href={`https://www.google.com/maps?q=${finca.latitud},${finca.longitud}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100"
                                        title="Ver en Google Maps"
                                    >
                                        <MapPin className="w-3 h-3" />
                                        {finca.latitud.toFixed(6)}, {finca.longitud.toFixed(6)}
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden relative">
                            <FincaMapViewer
                                lat={finca.latitud || 0}
                                lng={finca.longitud || 0}
                                polygon={polygonData}
                                lotes={finca.lotes}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Lotes Section */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Lotes ({finca.lotes?.length || 0})</h2>
                </div>

                {finca.lotes && finca.lotes.length > 0 ? (
                    <Card>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Código</th>
                                        <th className="p-4 font-medium">Nombre</th>
                                        <th className="p-4 font-medium">Cultivo</th>
                                        <th className="p-4 font-medium">Área (Ha)</th>
                                        <th className="p-4 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {finca.lotes.map((lote: any) => (
                                        <tr key={lote.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="p-4 font-medium">{lote.codigo}</td>
                                            <td className="p-4">{lote.nombre}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span>{lote.tipoCultivo}</span>
                                                    <span className="text-xs text-muted-foreground">{lote.variedad}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">{lote.areaHa}</td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/lotes/${lote.id}`}>
                                                        Administrar
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <div className="p-4 bg-muted rounded-full">
                                <Leaf className="w-8 h-8 opacity-50" />
                            </div>
                            <div>
                                <h3 className="tex-lg font-medium">No hay lotes registrados</h3>
                                <p className="text-sm">Comienza agregando lotes a esta finca para gestionarlos.</p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href={`/lotes/new?fincaId=${finca.id}`}>
                                    Registrar Primer Lote
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
