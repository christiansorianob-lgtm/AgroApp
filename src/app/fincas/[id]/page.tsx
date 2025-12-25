import Link from "next/link"
import { notFound } from "next/navigation"
import { getFincaById } from "@/services/fincas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Ruler, User, Calendar, Plus } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic import for Map to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
    ssr: false,
    loading: () => <div className="h-64 bg-muted animate-pulse rounded-md" />
})

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
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/fincas">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
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
                    <Button asChild>
                        <Link href={`/lotes/new?fincaId=${finca.id}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Lote
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
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {finca.latitud.toFixed(6)}, {finca.longitud.toFixed(6)}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden relative">
                            <MapPicker
                                lat={finca.latitud || 0}
                                lng={finca.longitud || 0}
                                onLocationSelect={() => { }} // Read-only
                                initialPolygon={polygonData}
                                readOnly={true}
                                initialZoom={14}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Lotes Section Placeholder */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Lotes ({finca.lotes?.length || 0})</h2>
                </div>
                {/* TODO: List Lotes here */}
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No hay lotes registrados aún.
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
