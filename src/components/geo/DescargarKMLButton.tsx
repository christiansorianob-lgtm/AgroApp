'use client'

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { normalizeGeometry, toKMLDocumento, type KMLItem } from "@/lib/geo"
import { cn } from "@/lib/utils"

interface ItemEntrada extends Omit<KMLItem, "geometria"> { geometria: unknown }

/**
 * Descarga el lindero en KML (Google Earth, GPS, topógrafos). Para una finca se incluyen
 * también sus lotes georreferenciados en una carpeta aparte.
 */
export function DescargarKMLButton({ archivo, documento, items, variante = "boton", className }: {
    /** Nombre del archivo sin extensión */
    archivo: string
    documento: string
    items: ItemEntrada[]
    /** "boton" con texto o "icono" solo */
    variante?: "boton" | "icono"
    className?: string
}) {
    const validos = items
        .map(i => ({ ...i, geometria: normalizeGeometry(i.geometria) }))
        .filter((i): i is KMLItem => !!i.geometria)
    const deshabilitado = validos.length === 0
    const titulo = deshabilitado ? "Sin lindero para descargar" : `Descargar KML (${validos.length === 1 ? "lindero" : `${validos.length} linderos`})`

    const descargar = () => {
        if (deshabilitado) return
        const blob = new Blob([toKMLDocumento(documento, validos)], { type: "application/vnd.google-earth.kml+xml" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `${archivo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\-]+/g, "_")}.kml`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }

    if (variante === "icono") {
        return (
            <Button type="button" variant="ghost" size="icon" onClick={descargar} disabled={deshabilitado}
                title={titulo} aria-label={titulo} className={cn("h-8 w-8 text-muted-foreground hover:text-primary", className)}>
                <Download className="h-4 w-4" />
            </Button>
        )
    }
    return (
        <Button type="button" variant="outline" size="sm" onClick={descargar} disabled={deshabilitado} title={titulo} className={cn("h-8", className)}>
            <Download className="mr-1.5 h-4 w-4" /> KML
        </Button>
    )
}
