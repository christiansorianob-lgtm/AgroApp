
import { getUbicacionesMaquinaria } from "@/app/actions/maquinaria"
import { UbicacionesMaquinariaClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getUbicacionesMaquinaria()
    return <UbicacionesMaquinariaClient initialData={data || []} />
}
