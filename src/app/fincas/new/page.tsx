import { Suspense } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { FincaForm } from "@/components/forms/FincaForm"
import { nextFincaCode } from "@/app/actions/fincas"

export const dynamic = "force-dynamic"

export default async function NewFincaPage() {
    const siguienteCodigo = await nextFincaCode()
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Nueva finca"
                description="Registre una unidad productiva y georreferencie su lindero."
                breadcrumbs={[{ label: "Fincas", href: "/fincas" }, { label: "Nueva" }]}
            />
            <Suspense fallback={null}>
                <FincaForm siguienteCodigo={siguienteCodigo} />
            </Suspense>
        </div>
    )
}
