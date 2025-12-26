'use server'
import { getResponsables } from "@/app/actions/configuracion"
import { ResponsablesClient } from "./client"

export default async function ResponsablesPage() {
    const { data } = await getResponsables()
    return <ResponsablesClient initialData={data || []} />
}
