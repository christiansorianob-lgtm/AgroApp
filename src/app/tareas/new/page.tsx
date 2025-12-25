import { getFincas } from "@/app/actions/fincas"
import { getLotes } from "@/app/actions/lotes"
import { TareaForm } from "@/components/forms/TareaForm"

export default async function NewTareaPage() {
    const fincasData = await getFincas()
    const lotesData = await getLotes() // Fetches all lotes, client form filters them

    return (
        <TareaForm
            fincas={fincasData.data || []}
            lotes={lotesData.data || []}
        />
    )
}
