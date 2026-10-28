import { computeMetrics, normalizeGeometry, type BoundaryValue, type BoundaryGeometry } from "@/lib/geo"

/**
 * Prepara los campos de georreferenciación que se guardan en Finca o Lote a partir de lo que
 * envía el editor. El área, el perímetro y el centroide siempre se recalculan en el servidor.
 *
 * - `undefined`: no se tocó el lindero.
 * - `null`: el usuario lo borró.
 */
export function buildLinderoData(value: BoundaryValue | null | undefined) {
    if (value === undefined) return { data: {}, levantamiento: null }
    if (value === null) {
        return {
            data: {
                geometria: null as any,
                areaMedidaHa: null,
                perimetroM: null,
                metodoGeorreferenciacion: null,
                precisionM: null,
                georreferenciadoEn: null,
            },
            levantamiento: null,
        }
    }

    const geometria = normalizeGeometry(value.geometria)
    if (!geometria) throw new Error("El lindero no es un polígono válido.")
    const m = computeMetrics(geometria)
    if (m.autointersecciones > 0) throw new Error("El lindero se cruza consigo mismo. Corrija los vértices antes de guardar.")

    const precisionM = value.precisionM != null && Number.isFinite(value.precisionM) ? value.precisionM : null

    return {
        data: {
            geometria: geometria as any,
            areaMedidaHa: round(m.areaHa, 4),
            perimetroM: round(m.perimetroM, 1),
            latitud: m.centroide.lat,
            longitud: m.centroide.lng,
            metodoGeorreferenciacion: value.metodo,
            precisionM,
            georreferenciadoEn: new Date(),
        },
        levantamiento: {
            metodo: value.metodo,
            geometria: geometria as any,
            areaHa: round(m.areaHa, 4),
            perimetroM: round(m.perimetroM, 1),
            precisionM,
            puntosCrudos: (value.puntosCrudos?.length ? value.puntosCrudos : undefined) as any,
            archivoOrigen: value.archivoOrigen || null,
        },
    }
}

export function sameGeometry(a: unknown, b: BoundaryGeometry | null | undefined): boolean {
    return JSON.stringify(normalizeGeometry(a)) === JSON.stringify(b ?? null)
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
