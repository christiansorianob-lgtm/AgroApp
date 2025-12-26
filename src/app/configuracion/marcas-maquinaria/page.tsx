
import { getMarcasMaquinaria } from "@/app/actions/maquinaria"
import { MarcasMaquinariaClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const { data } = await getMarcasMaquinaria()
    return <MarcasMaquinariaClient initialData={data || []} />
}
