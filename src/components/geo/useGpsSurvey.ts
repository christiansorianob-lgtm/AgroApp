'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { distanceM, type GpsPoint } from "@/lib/geo"

export type ModoRecorrido = "continuo" | "vertices"
export type EstadoRecorrido = "inactivo" | "grabando" | "pausado"

export interface AjustesRecorrido {
    /** Se descartan lecturas con precisión peor que esto (metros). */
    precisionMaxM: number
    /** En modo continuo, distancia mínima entre puntos guardados (metros). */
    distanciaMinM: number
    /** En modo vértices, segundos que se promedia la señal en cada esquina. */
    segundosPromedio: number
}

export const AJUSTES_POR_DEFECTO: AjustesRecorrido = { precisionMaxM: 15, distanciaMinM: 3, segundosPromedio: 5 }

/** `cerrado`: el recorrido ya se convirtió en polígono, pero la finca/lote aún no se ha guardado. */
interface Guardado { puntos: GpsPoint[]; modo: ModoRecorrido; inicio: number | null; cerrado?: boolean }

/**
 * Lee el recorrido guardado en este dispositivo. El recorrido se conserva hasta que la finca o el lote
 * se guardan en la base de datos (ver `limpiarRecorrido`), para no perder el trabajo de campo.
 */
export function leerGuardado(storageKey: string): Guardado | null {
    try {
        const raw = localStorage.getItem(storageKey)
        const g: Guardado | null = raw ? JSON.parse(raw) : null
        return g?.puntos?.length ? g : null
    } catch {
        return null // almacenamiento no disponible
    }
}

/** Borra el respaldo local del recorrido. Se llama cuando el lindero ya quedó guardado en el servidor. */
export function limpiarRecorrido(storageKey: string) {
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
}

function errorDeSoporte(): string | null {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "Este dispositivo o navegador no tiene GPS disponible."
    if (typeof window !== "undefined" && !window.isSecureContext) return "El GPS solo funciona con conexión segura (https)."
    return null
}

export function useGpsSurvey(storageKey: string, activo: boolean) {
    // El editor solo se carga en el navegador, así que se puede leer localStorage al inicializar
    // para recuperar un recorrido sin terminar.
    const [guardado] = useState(() => leerGuardado(storageKey))
    const [estado, setEstado] = useState<EstadoRecorrido>(guardado ? "pausado" : "inactivo")
    const [modo, setModo] = useState<ModoRecorrido>(guardado?.modo ?? "vertices")
    const [ajustes, setAjustes] = useState<AjustesRecorrido>(AJUSTES_POR_DEFECTO)
    const [puntos, setPuntos] = useState<GpsPoint[]>(guardado?.puntos ?? [])
    const [actual, setActual] = useState<GpsPoint | null>(null)
    const [errorGps, setError] = useState<string | null>(null)
    const [muestreo, setMuestreo] = useState<{ restante: number; muestras: number } | null>(null)
    const [inicio, setInicio] = useState<number | null>(guardado?.inicio ?? null)
    const [recuperado, setRecuperado] = useState(!!guardado)
    const [cerrado, setCerrado] = useState(!!guardado?.cerrado)
    const [soporte] = useState(errorDeSoporte)
    const error = soporte ?? errorGps

    // Refs para leer el estado más reciente dentro del callback del GPS
    const estadoRef = useRef(estado)
    const modoRef = useRef(modo)
    const ajustesRef = useRef(ajustes)
    useEffect(() => {
        estadoRef.current = estado
        modoRef.current = modo
        ajustesRef.current = ajustes
    }, [estado, modo, ajustes])
    const muestrasRef = useRef<GpsPoint[] | null>(null)
    const wakeLockRef = useRef<any>(null)

    useEffect(() => {
        try {
            if (puntos.length) localStorage.setItem(storageKey, JSON.stringify({ puntos, modo, inicio, cerrado } satisfies Guardado))
        } catch { /* ignore */ }
    }, [puntos, modo, inicio, cerrado, storageKey])

    // Escucha del GPS mientras el panel está abierto
    useEffect(() => {
        if (!activo || soporte) return
        const id = navigator.geolocation.watchPosition(
            pos => {
                setError(null)
                const p: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, ts: pos.timestamp }
                setActual(p)
                const aj = ajustesRef.current
                const acc = p.acc ?? Infinity

                if (muestrasRef.current && acc <= aj.precisionMaxM * 1.5) {
                    muestrasRef.current.push(p)
                    setMuestreo(m => m && { ...m, muestras: muestrasRef.current!.length })
                }
                if (estadoRef.current !== "grabando" || modoRef.current !== "continuo" || acc > aj.precisionMaxM) return
                setPuntos(prev => {
                    const last = prev[prev.length - 1]
                    if (last && distanceM(last, p) < aj.distanciaMinM) return prev
                    return [...prev, p]
                })
            },
            err => {
                setError(err.code === err.PERMISSION_DENIED
                    ? "Permiso de ubicación denegado. Actívelo en la configuración del navegador."
                    : err.code === err.TIMEOUT ? "El GPS está tardando en responder. Busque cielo abierto." : "No se pudo obtener la ubicación.")
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
        )
        return () => navigator.geolocation.clearWatch(id)
    }, [activo, soporte])

    const pedirWakeLock = useCallback(async () => {
        try { wakeLockRef.current = await (navigator as any).wakeLock?.request("screen") } catch { /* no soportado */ }
    }, [])
    const soltarWakeLock = useCallback(() => {
        try { wakeLockRef.current?.release() } catch { /* ignore */ }
        wakeLockRef.current = null
    }, [])

    useEffect(() => soltarWakeLock, [soltarWakeLock])

    const iniciar = useCallback(() => {
        if (!inicio) setInicio(Date.now())
        setEstado("grabando"); setRecuperado(false)
        pedirWakeLock()
    }, [inicio, pedirWakeLock])

    const pausar = useCallback(() => { setEstado("pausado"); soltarWakeLock() }, [soltarWakeLock])

    /** Promedia la señal durante unos segundos para fijar una esquina con más precisión. */
    const marcarVertice = useCallback(() => {
        if (muestrasRef.current) return
        const seg = ajustesRef.current.segundosPromedio
        muestrasRef.current = actual && (actual.acc ?? Infinity) <= ajustesRef.current.precisionMaxM * 1.5 ? [actual] : []
        setMuestreo({ restante: seg, muestras: muestrasRef.current.length })
        let restante = seg
        const timer = setInterval(() => {
            restante -= 1
            if (restante > 0) { setMuestreo(m => m && { ...m, restante }); return }
            clearInterval(timer)
            const muestras = muestrasRef.current || []
            muestrasRef.current = null
            setMuestreo(null)
            if (muestras.length === 0) {
                setError("No hubo lecturas GPS con la precisión requerida. Espere a tener mejor señal e intente de nuevo.")
                return
            }
            // Promedio ponderado por 1/precisión²: las lecturas más precisas pesan más
            let sw = 0, lat = 0, lng = 0
            for (const m of muestras) { const w = 1 / Math.max(m.acc ?? 10, 1) ** 2; sw += w; lat += m.lat * w; lng += m.lng * w }
            // Los errores del GPS están correlacionados en pocos segundos: promediar mejora la precisión,
            // pero no en proporción a la raíz del número de lecturas. Se estima de forma conservadora.
            const accPromedio = muestras.reduce((s, m) => s + (m.acc ?? 10), 0) / muestras.length
            const precision = Math.max(accPromedio / Math.sqrt(Math.min(muestras.length, 4)), 0.5)
            setPuntos(prev => [...prev, { lat: lat / sw, lng: lng / sw, acc: +precision.toFixed(1), ts: Date.now() }])
        }, 1000)
    }, [actual])

    const deshacer = useCallback(() => setPuntos(prev => prev.slice(0, -1)), [])

    /** El recorrido pasó a ser el lindero: deja de grabar pero se conserva el respaldo hasta guardar. */
    const marcarCerrado = useCallback(() => {
        setCerrado(true); setEstado("pausado")
        soltarWakeLock()
        // Se escribe ya: el editor puede cerrarse en este mismo instante y el efecto no alcanzaría a correr
        try {
            const g = leerGuardado(storageKey)
            if (g) localStorage.setItem(storageKey, JSON.stringify({ ...g, cerrado: true } satisfies Guardado))
        } catch { /* ignore */ }
    }, [soltarWakeLock, storageKey])

    /** Permite seguir agregando puntos a un recorrido ya cerrado. */
    const reabrir = useCallback(() => { setCerrado(false); setRecuperado(false) }, [])

    const descartar = useCallback(() => {
        setPuntos([]); setInicio(null); setEstado("inactivo"); setRecuperado(false); setCerrado(false)
        soltarWakeLock()
        try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    }, [storageKey, soltarWakeLock])

    const distanciaRecorrida = puntos.reduce((d, p, i) => (i ? d + distanceM(puntos[i - 1], p) : 0), 0)
    const precisionPromedio = puntos.length
        ? puntos.reduce((s, p) => s + (p.acc ?? 0), 0) / puntos.length
        : null

    return {
        estado, modo, setModo, ajustes, setAjustes, puntos, actual, error, muestreo, inicio, recuperado, cerrado,
        distanciaRecorrida, precisionPromedio,
        iniciar, pausar, marcarVertice, deshacer, descartar, marcarCerrado, reabrir,
    }
}
