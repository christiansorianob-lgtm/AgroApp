import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/layout/PageHeader"
import { LoteForm } from "@/components/forms/LoteForm"

export const dynamic = "force-dynamic"

export default async function EditLotePage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const lote = await db.lote.findUnique({ where: { id }, include: { materialesVivero: { orderBy: { createdAt: "asc" } } } })
    if (!lote) notFound()

    const [finca, tiposCultivo, opciones] = await Promise.all([
        db.finca.findUnique({
            where: { id: lote.fincaId },
            select: {
                id: true, nombre: true, codigo: true, geometria: true, latitud: true, longitud: true,
                lotes: { select: { id: true, nombre: true, codigo: true, geometria: true } },
            },
        }),
        db.tipoCultivo.findMany({ orderBy: { nombre: "asc" }, include: { variedades: { orderBy: { nombre: "asc" } }, especies: { orderBy: { nombre: "asc" } } } }),
        db.opcionGenetica.findMany({ orderBy: [{ casaGenetica: "asc" }, { grupo: "asc" }, { codigo: "asc" }] }),
    ])

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title={`Editar ${lote.nombre}`}
                description={`${lote.codigo} · Finca ${finca?.nombre}`}
                breadcrumbs={[
                    { label: "Fincas", href: "/fincas" },
                    { label: finca?.nombre ?? "Finca", href: `/fincas/${lote.fincaId}` },
                    { label: lote.nombre, href: `/lotes/${id}` },
                    { label: "Editar" },
                ]}
            />
            <LoteForm fincas={finca ? [finca] : []} tiposCultivo={tiposCultivo} opcionesGeneticas={opciones} lote={lote as any} />
        </div>
    )
}
