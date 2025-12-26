import { getNombresProducto } from "@/app/actions/configuracion"
import { NombresProductoClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getNombresProducto()
    return <NombresProductoClient initialData={data || []} />
}
