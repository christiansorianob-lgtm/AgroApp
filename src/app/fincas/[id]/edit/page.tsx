import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { FincaForm } from "@/components/forms/FincaForm"

export const dynamic = "force-dynamic"

export default async function EditFincaPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const finca = await db.finca.findUnique({
        where: { id },
        include: { lotes: { select: { id: true, nombre: true, geometria: true } } },
    })
    if (!finca) notFound()

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title={`Editar ${finca.nombre}`}
                description={finca.codigo}
                breadcrumbs={[{ label: "Fincas", href: "/fincas" }, { label: finca.nombre, href: `/fincas/${id}` }, { label: "Editar" }]}
            />
            <FincaForm finca={finca as any} />
        </div>
    )
}
