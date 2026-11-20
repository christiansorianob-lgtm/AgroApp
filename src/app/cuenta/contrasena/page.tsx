import { sesionDePagina } from "@/lib/auth"
import { PageHeader } from "@/components/layout/PageHeader"
import { CambiarPasswordForm } from "./CambiarPasswordForm"

export const metadata = { title: "Cambiar contraseña · AgroApp" }

export default async function CambiarPasswordPage() {
    const sesion = await sesionDePagina()
    return (
        <div className="mx-auto max-w-md space-y-6">
            <PageHeader
                title="Cambiar contraseña"
                description={sesion.debeCambiarPassword
                    ? "Es su primer ingreso: cambie la contraseña inicial por una que solo usted conozca."
                    : sesion.nombre}
            />
            <CambiarPasswordForm />
        </div>
    )
}
