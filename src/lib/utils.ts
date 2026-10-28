import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined) {
    if (!date) return "N/A"
    try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return "N/A"
        
        const day = d.getDate().toString().padStart(2, '0')
        // Using 'short' for month and ensuring first letter is caps
        let month = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '')
        if (month.length > 3) month = month.slice(0, 3) // Ensure 3 chars like 'Abr'
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
        const year = d.getFullYear()
        
        return `${day}/${capitalizedMonth}/${year}`
    } catch (e) {
        return "N/A"
    }
}

/**
 * Convierte "AAAA-MM-DD" de un selector de fecha en Date a mediodía UTC, para que la fecha no
 * se corra un día al mostrarse en Colombia (UTC-5) ni en el servidor (UTC).
 */
export function parseFechaCalendario(value: string | null | undefined): Date | null {
    if (!value) return null
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value)
    return isNaN(d.getTime()) ? null : d
}
