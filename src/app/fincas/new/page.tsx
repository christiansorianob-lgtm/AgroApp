import { Suspense } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { FincaForm } from "@/components/forms/FincaForm"

export default function NewFincaPage() {
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Nueva finca"
                description="Registre una unidad productiva y georreferencie su lindero."
                breadcrumbs={[{ label: "Fincas", href: "/fincas" }, { label: "Nueva" }]}
            />
            <Suspense fallback={null}>
                <FincaForm />
            </Suspense>
        </div>
    )
}
