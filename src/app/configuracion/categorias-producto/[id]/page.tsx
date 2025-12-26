import { getCategoryDetails } from "@/app/actions/configuracion"
import { notFound } from "next/navigation"
import { CategoryDetailsClient } from "./client"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CategoryDetailsPage({ params }: PageProps) {
    const { id } = await params
    const { data, error } = await getCategoryDetails(id)

    if (error || !data) {
        notFound()
    }

    return <CategoryDetailsClient category={data} />
}
