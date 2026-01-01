import Link from "next/link"
import { notFound } from "next/navigation"
import { getLoteById } from "@/app/actions/lotes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Ruler, Calendar, Leaf, ClipboardList, Plus } from "lucide-react"
import { FincaMapViewer } from "@/components/ui/FincaMapViewer" // Reuse map viewer
import { EditLoteButton } from "./EditLoteButton" // Client component for dialog
import { GoBackButton } from "@/components/ui/GoBackButton"

export default async function LoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const res = await getLoteById(id)

    if (res.error || !res.data) {
        notFound()
    }

    const lote = res.data
    const finca = lote.finca

    // Prepare polygon data
    const polygonData = lote.poligono ? (typeof lote.poligono === 'string' ? JSON.parse(lote.poligono) : lote.poligono) : []
    const fincaPolygon = finca.poligono ? (typeof finca.poligono === 'string' ? JSON.parse(finca.poligono) : finca.poligono) : []

    // Pass lote as "lotes" array to map viewer to visualize it
    const loteAsArrayItem = {
        ...lote,
        poligono: polygonData
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <GoBackButton fallbackRoute={`/fincas/${finca.id}`} />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                            {lote.nombre}
                            <Badge variant={lote.estado === 'ACTIVO' ? 'default' : 'secondary'}>
                                {lote.estado}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            {lote.codigo} • {finca.nombre}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <EditLoteButton lote={lote} />

                    <Button variant="outline" asChild>
                        <Link href={`/tareas?loteId=${lote.id}`}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Tareas
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/tareas/new?fincaId=${finca.id}&loteId=${lote.id}`}>
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
                            <CardTitle>Información del Lote</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Leaf className="w-4 h-4" /> Cultivo
                                </span>
                                <div className="text-right">
                                    <span className="font-medium block">{lote.tipoCultivo || "No definido"}</span>
                                    {lote.variedad && <span className="text-xs text-muted-foreground">{lote.variedad}</span>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Ruler className="w-4 h-4" /> Área
                                </span>
                                <span className="font-medium">{lote.areaHa} Ha</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Siembra
                                </span>
                                <span className="font-medium">
                                    {lote.fechaSiembra ? new Date(lote.fechaSiembra).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Coordenadas
                                </span>
                                <span className="font-mono text-xs">
                                    {lote.latitud?.toFixed(5) || '?'}, {lote.longitud?.toFixed(5) || '?'}
                                </span>
                            </div>
                            {lote.observaciones && (
                                <div className="pt-2">
                                    <span className="text-muted-foreground block mb-1 text-sm">Observaciones:</span>
                                    <p className="text-sm bg-muted p-2 rounded">{lote.observaciones}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Map View */}
                <div className="lg:col-span-2">
                    <Card className="h-[500px] flex flex-col">
                        <CardHeader>
                            <CardTitle>Geolocalización</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden relative">
                            {/* Reusing FincaMapViewer but focusing on this Lote */}
                            <FincaMapViewer
                                lat={lote.latitud || finca.latitud || 0}
                                lng={lote.longitud || finca.longitud || 0}
                                polygon={fincaPolygon} // Show finca boundary for context
                                lotes={[loteAsArrayItem]} // Show this lote
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
