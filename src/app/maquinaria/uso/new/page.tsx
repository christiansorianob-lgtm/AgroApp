import { getMaquinaria } from "@/app/actions/maquinaria"
import { getTareas } from "@/app/actions/tareas"
import { UsoMaquinariaForm } from "@/components/forms/UsoMaquinariaForm"

export default async function NewUsoPage() {
    const maquinasData = await getMaquinaria()
    const tareasData = await getTareas()

    return (
        <UsoMaquinariaForm
            maquinas={maquinasData.data || []}
            tareas={tareasData.data || []}
        />
    )
}
