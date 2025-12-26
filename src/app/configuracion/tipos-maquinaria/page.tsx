
import { getTiposMaquinaria } from "@/app/actions/maquinaria"
import { TiposMaquinariaClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getTiposMaquinaria()
    return <TiposMaquinariaClient initialData={data || []} />
}
