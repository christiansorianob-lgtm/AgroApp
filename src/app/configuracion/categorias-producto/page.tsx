import { getCategoriasProducto } from "@/app/actions/configuracion"
import { CategoriasProductoClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getCategoriasProducto()
    return <CategoriasProductoClient initialData={data || []} />
}
