'use client'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { rutaSegura } from "@/lib/navegacion"

interface BackButtonProps {
    fallback?: string
}

export function BackButton({ fallback }: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        // Memoria de navegación: si la pantalla se abrió con ?returnTo=, se vuelve ahí
        const retorno = rutaSegura(new URLSearchParams(window.location.search).get("returnTo"))
        if (retorno) {
            router.push(retorno)
        } else if (window.history.length > 2) {
            router.back()
        } else if (fallback) {
            router.push(fallback)
        } else {
            router.back()
        }
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleBack} title="Regresar">
            <ArrowLeft className="w-5 h-5" />
        </Button>
    )
}
