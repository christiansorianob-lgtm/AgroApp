import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sprout, ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

const configs = [
    {
        name: "Cultivos y Variedades",
        description: "Administre los tipos de cultivos y sus variedades.",
        href: "/configuracion/cultivos",
        icon: Sprout
    },
    {
        name: "Tipos de Actividad",
        description: "Catálogo de actividades para las tareas de campo.",
        href: "/configuracion/actividades",
        icon: ClipboardList
    },
    {
        name: "Responsables",
        description: "Personas asignables a tareas y labores.",
        href: "/configuracion/responsables",
        icon: Users
    },
    {
        name: "Nombres de Producto",
        description: "Catálogo de nombres comerciales de productos.",
        href: "/configuracion/nombres-producto",
        icon: Sprout
    },
    {
        name: "Categorías de Producto",
        description: "Clasificación de productos (Fertilizantes, etc).",
        href: "/configuracion/categorias-producto",
        icon: ClipboardList
    },
    {
        name: "Unidades de Medida",
        description: "Unidades para inventario (kg, l, etc).",
        href: "/configuracion/unidades-medida",
        icon: ClipboardList
    },
    {
        name: "Tipos de Maquinaria",
        description: "Clasificación de equipos (Tractors, Camiones).",
        href: "/configuracion/tipos-maquinaria",
        icon: ClipboardList
    },
    {
        name: "Marcas de Maquinaria",
        description: "Fabricantes de maquinaria.",
        href: "/configuracion/marcas-maquinaria",
        icon: ClipboardList
    },
    {
        name: "Ubicaciones Maquinaria",
        description: "Bodegas y talleres para equipos.",
        href: "/configuracion/ubicaciones-maquinaria",
        icon: ClipboardList
    }
]

export default function ConfiguracionPage() {
    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Configuración</h1>
                    <p className="text-muted-foreground">Administración de catálogos del sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map((config) => {
                    const Icon = config.icon
                    return (
                        <Link key={config.href} href={config.href}>
                            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-primary/50">
                                <CardHeader>
                                    <Icon className="w-8 h-8 text-primary mb-2" />
                                    <CardTitle>{config.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{config.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            <div className="pt-10 border-t flex justify-center">
                <form action={async () => {
                    'use server'
                    const { seedMaquinariaCatalogs } = await import("@/app/actions/maquinaria")
                    await seedMaquinariaCatalogs()
                }}>
                    <Button variant="outline" type="submit" className="text-muted-foreground hover:text-primary">
                        <Sprout className="w-4 h-4 mr-2" />
                        Restaurar Catálogos por Defecto (Maquinaria)
                    </Button>
                </form>
            </div>
        </div>
    )
}
