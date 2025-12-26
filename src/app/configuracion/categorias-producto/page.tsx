import { getCategoriasInsumo } from "@/app/actions/configuracion"
import { CategoriasInsumoClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getCategoriasInsumo()
    return <CategoriasInsumoClient initialData={data || []} />
}
