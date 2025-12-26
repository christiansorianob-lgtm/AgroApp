import { getUnidadesMedida } from "@/app/actions/configuracion"
import { UnidadesMedidaClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getUnidadesMedida()
    return <UnidadesMedidaClient initialData={data || []} />
}
