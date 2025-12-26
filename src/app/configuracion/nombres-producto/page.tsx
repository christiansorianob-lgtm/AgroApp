import { getNombresInsumo } from "@/app/actions/configuracion"
import { NombresInsumoClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getNombresInsumo()
    return <NombresInsumoClient initialData={data || []} />
}
