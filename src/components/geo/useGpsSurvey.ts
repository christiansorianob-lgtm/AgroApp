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

// ── Asistentes de precisión ──
/** El punto de inicio se promedia más tiempo: es donde se cierra el polígono. */
export const SEGUNDOS_INICIO = 15
/** Una esquina se sigue promediando hasta lograr esta precisión estimada (m) o hasta 3 veces el tiempo elegido. */
const PRECISION_OBJETIVO_M = 2.5
/** Caminando o en moto despacio no se superan ~5 m/s: un salto mayor es un error del GPS. */
const VELOCIDAD_MAX_MS = 5
/** Ruido de movimiento del filtro de suavizado (m/s): cuánto puede cambiar la posición entre lecturas. */
const RUIDO_MOVIMIENTO = 3
/** Distancia al inicio (m) a partir de la cual se avisa que el recorrido está por cerrarse. */
export const DISTANCIA_CIERRE_M = 8
/** Recorrido mínimo (m) antes de avisar el cierre, para no avisar recién empezado. */
const RECORRIDO_MIN_CIERRE_M = 30

export interface Senal {
    /** Precisión de la última lectura (m) */
    acc: number | null
    /** Las últimas lecturas fueron buenas y parejas: se puede empezar */
    estable: boolean
}

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
    const [muestreo, setMuestreo] = useState<{ restante: number; muestras: number; extra?: boolean; precision?: number } | null>(null)
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
    // Últimas precisiones, para saber si la señal ya se estabilizó
    const recientesRef = useRef<number[]>([])
    const [estable, setEstable] = useState(false)
    // Filtro de suavizado (Kalman simple en metros) y control de saltos del modo continuo
    const filtroRef = useRef<{ lat: number; lng: number; varM2: number; ts: number } | null>(null)
    const [descartados, setDescartados] = useState(0)
    const avisoCierreRef = useRef(false)

    useEffect(() => {
        try {
            if (puntos.length) localStorage.setItem(storageKey, JSON.stringify({ puntos, modo, inicio, cerrado } satisfies Guardado))
        } catch { /* ignore */ }
    }, [puntos, modo, inicio, cerrado, storageKey])

    /**
     * Descarta saltos imposibles y suaviza el trazado continuo: cada lectura se mezcla con la estimación
     * anterior según su precisión (las lecturas buenas pesan más), como un filtro de Kalman sencillo.
     */
    function suavizar(p: GpsPoint): GpsPoint | null {
        const f = filtroRef.current
        const acc = Math.max(p.acc ?? 10, 1)
        const ts = p.ts ?? Date.now()
        if (!f) {
            filtroRef.current = { lat: p.lat, lng: p.lng, varM2: acc * acc, ts }
            return p
        }
        const dt = Math.max((ts - f.ts) / 1000, 0.2)
        const salto = distanceM(f, p)
        // Un salto más rápido de lo que se puede caminar (con margen por la precisión) es un error del GPS
        if (salto - acc > VELOCIDAD_MAX_MS * dt) {
            setDescartados(n => n + 1)
            return null
        }
        const varPrevia = f.varM2 + RUIDO_MOVIMIENTO * RUIDO_MOVIMIENTO * dt
        const k = varPrevia / (varPrevia + acc * acc)
        const n = { lat: f.lat + k * (p.lat - f.lat), lng: f.lng + k * (p.lng - f.lng), varM2: (1 - k) * varPrevia, ts }
        filtroRef.current = n
        return { lat: n.lat, lng: n.lng, acc: +Math.sqrt(n.varM2).toFixed(1), ts }
    }

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

                // Señal estable: las últimas 5 lecturas dentro de la precisión pedida y sin grandes saltos de precisión
                const rec = [...recientesRef.current, acc].slice(-5)
                recientesRef.current = rec
                setEstable(rec.length === 5 && rec.every(a => a <= Math.min(aj.precisionMaxM, 10)) && Math.max(...rec) - Math.min(...rec) <= 6)

                if (muestrasRef.current && acc <= aj.precisionMaxM * 1.5) {
                    muestrasRef.current.push(p)
                    setMuestreo(m => m && { ...m, muestras: muestrasRef.current!.length })
                }
                // Mientras se promedia un punto (p. ej. el de inicio) el modo continuo no agrega puntos
                if (estadoRef.current !== "grabando" || modoRef.current !== "continuo" || muestrasRef.current || acc > aj.precisionMaxM) return

                const suave = suavizar(p)
                if (!suave) return
                setPuntos(prev => {
                    const last = prev[prev.length - 1]
                    if (last && distanceM(last, suave) < aj.distanciaMinM) return prev
                    return [...prev, suave]
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
        filtroRef.current = null
        pedirWakeLock()
    }, [inicio, pedirWakeLock])

    const pausar = useCallback(() => { setEstado("pausado"); soltarWakeLock() }, [soltarWakeLock])

    /**
     * Promedia la señal quieto para fijar un punto con más precisión. Sigue promediando mientras la
     * precisión estimada no llegue al objetivo, hasta 3 veces el tiempo mínimo. El primer punto (el
     * inicio, donde se cierra el polígono) se promedia al menos SEGUNDOS_INICIO.
     */
    const promediarPunto = useCallback((segundosMin: number) => {
        if (muestrasRef.current) return
        muestrasRef.current = actual && (actual.acc ?? Infinity) <= ajustesRef.current.precisionMaxM * 1.5 ? [actual] : []
        setMuestreo({ restante: segundosMin, muestras: muestrasRef.current.length })
        let transcurrido = 0
        const estimar = (muestras: GpsPoint[]) => {
            let sw = 0, lat = 0, lng = 0
            for (const m of muestras) { const w = 1 / Math.max(m.acc ?? 10, 1) ** 2; sw += w; lat += m.lat * w; lng += m.lng * w }
            const centro = { lat: lat / sw, lng: lng / sw }
            // Dispersión: qué tan separadas quedaron las lecturas del promedio
            const dispersion = Math.sqrt(muestras.reduce((s, m) => s + distanceM(centro, m) ** 2, 0) / muestras.length)
            // Los errores del GPS están correlacionados en pocos segundos: promediar mejora la precisión,
            // pero no en proporción a la raíz del número de lecturas. Se estima de forma conservadora.
            const accPromedio = muestras.reduce((s, m) => s + (m.acc ?? 10), 0) / muestras.length
            const precision = Math.max(accPromedio / Math.sqrt(Math.min(muestras.length, 4)), dispersion, 0.5)
            return { centro, precision }
        }
        const timer = setInterval(() => {
            transcurrido += 1
            const muestras = muestrasRef.current || []
            const est = muestras.length ? estimar(muestras) : null
            const listo = transcurrido >= segundosMin && (est ? est.precision <= PRECISION_OBJETIVO_M : false)
            const agotado = transcurrido >= segundosMin * 3
            if (!listo && !agotado) {
                setMuestreo(m => m && { ...m, restante: Math.max(segundosMin - transcurrido, 0), extra: transcurrido >= segundosMin, precision: est?.precision })
                return
            }
            clearInterval(timer)
            muestrasRef.current = null
            setMuestreo(null)
            if (!est) {
                setError("No hubo lecturas GPS con la precisión requerida. Espere a tener mejor señal e intente de nuevo.")
                return
            }
            filtroRef.current = { lat: est.centro.lat, lng: est.centro.lng, varM2: est.precision ** 2, ts: Date.now() }
            setPuntos(prev => [...prev, { ...est.centro, acc: +est.precision.toFixed(1), ts: Date.now() }])
        }, 1000)
    }, [actual])

    const marcarVertice = useCallback(() => {
        const seg = ajustesRef.current.segundosPromedio
        promediarPunto(puntos.length === 0 ? Math.max(seg, SEGUNDOS_INICIO) : seg)
    }, [promediarPunto, puntos.length])

    // Modo continuo: al empezar sin puntos, primero se fija el inicio quieto
    useEffect(() => {
        if (estado === "grabando" && modo === "continuo" && puntos.length === 0 && !muestrasRef.current) promediarPunto(SEGUNDOS_INICIO)
    }, [estado, modo, puntos.length, promediarPunto])

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
        setPuntos([]); setInicio(null); setEstado("inactivo"); setRecuperado(false); setCerrado(false); setDescartados(0)
        filtroRef.current = null
        soltarWakeLock()
        try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    }, [storageKey, soltarWakeLock])

    const distanciaRecorrida = puntos.reduce((d, p, i) => (i ? d + distanceM(puntos[i - 1], p) : 0), 0)
    const precisionPromedio = puntos.length
        ? puntos.reduce((s, p) => s + (p.acc ?? 0), 0) / puntos.length
        : null

    // Cierre asistido: qué tan cerca está la posición actual del punto de inicio
    const distanciaAlInicio = actual && puntos.length >= 3 && distanciaRecorrida >= RECORRIDO_MIN_CIERRE_M ? distanceM(actual, puntos[0]) : null
    const cercaDelInicio = distanciaAlInicio != null && distanciaAlInicio <= Math.max(DISTANCIA_CIERRE_M, (actual?.acc ?? 0) * 0.8)
    useEffect(() => {
        // Vibra una sola vez al entrar en la zona del inicio
        if (cercaDelInicio && estado === "grabando" && !avisoCierreRef.current) {
            avisoCierreRef.current = true
            try { navigator.vibrate?.([200, 100, 200]) } catch { /* ignore */ }
        }
        if (!cercaDelInicio) avisoCierreRef.current = false
    }, [cercaDelInicio, estado])
    /** Distancia entre el último punto y el inicio: lo que se "estira" al cerrar el polígono */
    const errorCierre = puntos.length >= 3 ? distanceM(puntos[puntos.length - 1], puntos[0]) : null

    return {
        estado, modo, setModo, ajustes, setAjustes, puntos, actual, error, muestreo, inicio, recuperado, cerrado,
        distanciaRecorrida, precisionPromedio,
        senal: { acc: actual?.acc ?? null, estable } satisfies Senal, descartados, distanciaAlInicio, cercaDelInicio, errorCierre,
        iniciar, pausar, marcarVertice, deshacer, descartar, marcarCerrado, reabrir,
    }
}
