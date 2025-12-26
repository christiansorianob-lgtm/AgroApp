'use client'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
    fallback?: string
}

export function BackButton({ fallback }: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        if (window.history.length > 2) {
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
