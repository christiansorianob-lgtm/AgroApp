import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { NoAutorizado, exigirAccesoATarea, sesionDePagina } from "@/lib/auth"
import { conRetorno } from "@/lib/navegacion"
import { describirRenglon, variedadDe } from "@/lib/vivero"
import { ContadorPlantas } from "@/components/vivero/ContadorPlantas"

export const metadata = { title: "Contador de plantas · AgroApp" }

/** Contador de plantas a pantalla completa para ejecutar una tarea de movimiento de vivero. */
export default async function ContadorPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
    const { id } = await props.params
    const { returnTo } = await props.searchParams
    const sesion = await sesionDePagina()
    await exigirAccesoATarea(id).catch(e => { if (e instanceof NoAutorizado) redirect("/mis-tareas"); throw e })

    const ejecutar = conRetorno(`/tareas/${id}/execute`, returnTo)
    const tarea = await db.tarea.findUnique({
        where: { id },
        select: {
            codigo: true, movimientoViveroTipo: true, loteId: true, estado: true,
            movimientoVivero: { select: { id: true } },
            lote: { select: { materialesVivero: { orderBy: [{ etapa: "asc" }, { ubicacion: "asc" }, { variedad: "asc" }] } } },
        },
    })
    // Solo para tareas de movimiento que aún no se han registrado
    if (!tarea?.movimientoViveroTipo || !tarea.lote || tarea.movimientoVivero || tarea.estado === "CANCELADA") redirect(ejecutar)

    return (
        <ContadorPlantas
            tareaId={id}
            tareaCodigo={tarea.codigo}
            tipo={tarea.movimientoViveroTipo}
            materiales={tarea.lote.materialesVivero.map(m => ({ id: m.id, descripcion: describirRenglon(m), variedad: variedadDe(m), disponibles: m.cantidad }))}
            representanteInicial={sesion.nombre}
            volverA={ejecutar}
        />
    )
}
