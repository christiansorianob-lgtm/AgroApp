'use client'

import { useRouter } from 'next/navigation'
import { Button, ButtonProps } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { rutaSegura } from '@/lib/navegacion'

interface GoBackButtonProps extends ButtonProps {
    fallbackRoute?: string
}

export function GoBackButton({ className, variant = "ghost", size = "icon", children, fallbackRoute = "/", ...props }: GoBackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        // Memoria de navegación: si la pantalla se abrió con ?returnTo=, se vuelve ahí
        const retorno = rutaSegura(new URLSearchParams(window.location.search).get("returnTo"))
        if (retorno) {
            router.push(retorno)
        } else if (window.history.length > 2) {
            router.back()
        } else {
            router.push(fallbackRoute)
        }
    }

    if (children) {
        return (
            <Button variant={variant} size={size} className={className} onClick={handleBack} {...props}>
                {children}
            </Button>
        )
    }

    return (
        <Button variant={variant} size={size} className={className} onClick={handleBack} {...props}>
            <ArrowLeft className="w-5 h-5" />
        </Button>
    )
}
