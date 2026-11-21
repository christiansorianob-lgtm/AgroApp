import Link from "next/link"
import { ChevronRight, Spline } from "lucide-react"
import { paginaDeGestor } from "@/lib/auth"
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata = { title: "Herramientas · AgroApp" }

const HERRAMIENTAS = [
    {
        href: "/herramientas/medir-lindero",
        icono: Spline,
        titulo: "Medir lindero",
        descripcion: "Mida un área caminando con el GPS del celular, dibujándola sobre el mapa satelital o importando un archivo. Asistentes de precisión y descarga en KML o GeoJSON. No se guarda en la plataforma.",
    },
]

/** Herramientas de campo independientes de fincas, lotes y tareas. */
export default async function HerramientasPage() {
    await paginaDeGestor()
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader title="Herramientas" description="Utilidades de campo para usar en el momento" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {HERRAMIENTAS.map(h => (
                    <Link key={h.href} href={h.href}
                        className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <h.icono className="h-6 w-6" />
                        </div>
                        <h2 className="mt-3 text-base font-semibold">{h.titulo}</h2>
                        <p className="mt-1 flex-1 text-sm text-muted-foreground">{h.descripcion}</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
