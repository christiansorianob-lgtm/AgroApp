'use server'
import { getTiposActividad } from "@/app/actions/configuracion"
import { ActividadesClient } from "./client"

export default async function ActividadesPage() {
    // We fetch initial data on server to pass to client
    const { data } = await getTiposActividad()

    return <ActividadesClient initialData={data || []} />
}
