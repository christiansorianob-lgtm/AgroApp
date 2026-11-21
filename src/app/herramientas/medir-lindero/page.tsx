import { db } from "@/lib/db"
import { paginaDeGestor } from "@/lib/auth"
import { normalizeGeometry, type BoundaryGeometry } from "@/lib/geo"
import { MedirLindero } from "./MedirLindero"

export const metadata = { title: "Medir lindero · AgroApp" }

/** Herramienta para medir un área sin guardarla: las fincas y lotes se muestran solo como referencia. */
export default async function MedirLinderoPage() {
    await paginaDeGestor()
    const fincas = await db.finca.findMany({
        select: { nombre: true, geometria: true, latitud: true, longitud: true, lotes: { select: { codigo: true, nombre: true, geometria: true } } },
    })
    const referencias: { nombre: string; geometria: BoundaryGeometry }[] = []
    for (const f of fincas) {
        const g = normalizeGeometry(f.geometria)
        if (g) referencias.push({ nombre: `Finca ${f.nombre}`, geometria: g })
        for (const l of f.lotes) {
            const gl = normalizeGeometry(l.geometria)
            if (gl) referencias.push({ nombre: `${l.codigo} ${l.nombre}`, geometria: gl })
        }
    }
    const conUbicacion = fincas.find(f => f.latitud != null && f.longitud != null)
    return <MedirLindero referencias={referencias} centro={conUbicacion ? { lat: conUbicacion.latitud!, lng: conUbicacion.longitud! } : null} />
}
