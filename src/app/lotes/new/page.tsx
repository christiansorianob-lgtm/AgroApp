import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoteForm } from "@/components/forms/LoteForm"

export const dynamic = "force-dynamic"

export default async function NewLotePage(props: { searchParams: Promise<{ fincaId?: string }> }) {
    const { fincaId } = await props.searchParams
    const [fincas, tiposCultivo] = await Promise.all([
        db.finca.findMany({
            where: { estado: "ACTIVO" },
            orderBy: { nombre: "asc" },
            select: {
                id: true, nombre: true, codigo: true, geometria: true, latitud: true, longitud: true,
                lotes: { select: { id: true, nombre: true, codigo: true, geometria: true } },
            },
        }),
        db.tipoCultivo.findMany({ orderBy: { nombre: "asc" }, include: { variedades: { orderBy: { nombre: "asc" } } } }),
    ])
    const finca = fincas.find(f => f.id === fincaId)

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Nuevo lote"
                description={finca ? `En la finca ${finca.nombre}` : "Registre un lote productivo y georreferencie su lindero."}
                breadcrumbs={finca
                    ? [{ label: "Fincas", href: "/fincas" }, { label: finca.nombre, href: `/fincas/${finca.id}` }, { label: "Nuevo lote" }]
                    : [{ label: "Lotes", href: "/lotes" }, { label: "Nuevo" }]}
            />
            <LoteForm fincas={fincas} tiposCultivo={tiposCultivo} fincaIdInicial={finca?.id} />
        </div>
    )
}
