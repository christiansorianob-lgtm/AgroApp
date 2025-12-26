import { MaquinariaForm } from "@/components/forms/MaquinariaForm"
import { getTiposMaquinaria, getMarcasMaquinaria, getUbicacionesMaquinaria } from "@/app/actions/maquinaria"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewMaquinariaPage() {
    const [tiposRes, marcasRes, ubicacionesRes] = await Promise.all([
        getTiposMaquinaria(),
        getMarcasMaquinaria(),
        getUbicacionesMaquinaria()
    ])

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/maquinaria">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Nueva Máquina</h2>
                    <p className="text-muted-foreground">Registre un nuevo equipo o vehículo</p>
                </div>
            </div>

            <MaquinariaForm
                tipos={tiposRes.data || []}
                marcas={marcasRes.data || []}
                ubicaciones={ubicacionesRes.data || []}
            />
        </div>
    )
}
