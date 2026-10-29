'use client'

import { ArrowLeft, Download } from "lucide-react"

/** Barra superior del informe (no se imprime): volver y descargar en PDF con el diálogo del navegador. */
export function InformeToolbar({ volver }: { volver: string }) {
    return (
        <div className="informe-toolbar">
            <a href={volver} className="tb-btn tb-sec"><ArrowLeft size={16} /> Volver a la finca</a>
            <span className="tb-hint">En el diálogo elija «Guardar como PDF», tamaño A4 y active «Gráficos de fondo».</span>
            <button type="button" className="tb-btn tb-pri" onClick={() => window.print()}>
                <Download size={16} /> Descargar PDF
            </button>
        </div>
    )
}
