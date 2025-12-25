import { getFincas } from "@/app/actions/fincas"
import { getLotes } from "@/app/actions/lotes"
import { TareaForm } from "@/components/forms/TareaForm"

export default async function NewTareaPage() {
    const fincasData = await getFincas()
    const lotesData = await getLotes() // Fetches all lotes, client form filters them

    if (!fincasData.data || fincasData.data.length === 0) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-card border border-border rounded-xl text-center space-y-4 shadow-sm">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600 w-8 h-8"
                    >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-primary">¡Primero lo primero!</h3>
                <p className="text-muted-foreground">
                    Para crear una tarea, primero necesitas registrar al menos una Finca en el sistema.
                </p>
                <div className="pt-2">
                    <a
                        href="/fincas/new"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        Registrar mi primera Finca
                    </a>
                </div>
            </div>
        )
    }

    return (
        <TareaForm
            fincas={fincasData.data || []}
            lotes={lotesData.data || []}
        />
    )
}
