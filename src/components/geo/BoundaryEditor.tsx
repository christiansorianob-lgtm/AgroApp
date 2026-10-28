'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GeoJSON, Polyline, CircleMarker, Circle, Tooltip, useMap } from "react-leaflet"
import L from "leaflet"
import "@geoman-io/leaflet-geoman-free"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"
import {
    PenLine, Upload, Footprints, Undo2, Trash2, LocateFixed, Save, X, Pencil, Play, Pause, Flag, Crosshair,
    AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Satellite, Ruler, Spline, Navigation, Info,
} from "lucide-react"
import MapBase, { FitBounds, type LatLngBoundsTuple } from "./MapBase"
import { useGpsSurvey, type ModoRecorrido } from "./useGpsSurvey"
import {
    computeMetrics, validateBoundary, normalizeGeometry, polygonFromPoints, simplifyGeometry, geometryBounds,
    parseBoundaryFile, parseTextInput, toGeoJSONString, toKMLString, formatHa, formatMeters, METODO_LABELS,
    type BoundaryGeometry, type BoundaryValue, type CandidatoImportado, type ContextoValidacion, type GpsPoint,
    type MetodoGeorreferenciacion,
} from "@/lib/geo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BoundaryEditorProps {
    titulo: string
    subtitulo?: string
    valorInicial: BoundaryValue | null
    contexto?: ContextoValidacion & { centro?: { lat: number; lng: number } | null }
    /** Clave para guardar en el navegador un recorrido GPS sin terminar */
    storageKey: string
    onCancel: () => void
    onSave: (valor: BoundaryValue | null) => void
}

type Pestana = "dibujar" | "importar" | "gps"

const ESTILO_LINDERO = { color: "#22d3ee", weight: 3, fillColor: "#22d3ee", fillOpacity: 0.22 }
const ESTILO_PADRE = { color: "#facc15", weight: 3, fill: false, dashArray: "8 6" }
const ESTILO_VECINO = { color: "#ffffff", weight: 1.5, fillColor: "#ffffff", fillOpacity: 0.12, dashArray: "4 4" }
const ESTILO_PREVIA = { color: "#f472b6", weight: 3, fillColor: "#f472b6", fillOpacity: 0.15, dashArray: "6 4" }

// ─────────────────────────────────────────────────────────────────────────────
// Capas del mapa
// ─────────────────────────────────────────────────────────────────────────────

/** Dibujo y edición de vértices con Leaflet-Geoman. */
function EditableBoundary({ geometry, editing, drawing, onChange, onDrawn }: {
    geometry: BoundaryGeometry | null
    editing: boolean
    drawing: boolean
    onChange: (g: BoundaryGeometry | null) => void
    onDrawn: (g: BoundaryGeometry) => void
}) {
    const map = useMap()
    const layerRef = useRef<L.GeoJSON | null>(null)
    const currentKey = useRef<string | null>(null)
    const onChangeRef = useRef(onChange)
    const onDrawnRef = useRef(onDrawn)
    useEffect(() => {
        onChangeRef.current = onChange
        onDrawnRef.current = onDrawn
    })

    useEffect(() => {
        map.pm.setLang("es")
        map.pm.setGlobalOptions({
            allowSelfIntersection: false,
            snappable: true,
            snapDistance: 18,
            templineStyle: { color: "#22d3ee", weight: 3 },
            hintlineStyle: { color: "#22d3ee", dashArray: [6, 6] },
            pathOptions: ESTILO_LINDERO,
        } as any)
        const created = (e: any) => {
            const g = normalizeGeometry(e.layer.toGeoJSON())
            map.removeLayer(e.layer)
            if (g) onDrawnRef.current(g)
        }
        map.on("pm:create", created)
        return () => { map.off("pm:create", created) }
    }, [map])

    useEffect(() => {
        if (drawing) map.pm.enableDraw("Polygon", { finishOn: null } as any)
        else map.pm.disableDraw()
        return () => { map.pm.disableDraw() }
    }, [drawing, map])

    const key = JSON.stringify(geometry ?? null)
    useEffect(() => {
        // Se reconstruye la capa solo si la geometría cambió desde fuera (importación, GPS, deshacer)
        if (key !== currentKey.current || (geometry && !layerRef.current)) {
            layerRef.current?.remove()
            layerRef.current = null
            if (geometry) {
                const lyr = L.geoJSON(geometry as any, { style: () => ESTILO_LINDERO })
                lyr.addTo(map)
                const emit = () => {
                    const g = normalizeGeometry(lyr.toGeoJSON())
                    currentKey.current = JSON.stringify(g ?? null)
                    onChangeRef.current(g)
                }
                lyr.on("pm:edit", emit)
                lyr.on("pm:vertexremoved", emit)
                layerRef.current = lyr
            }
            currentKey.current = key
        }
        const lyr = layerRef.current as any
        if (lyr?.pm) {
            if (editing) lyr.pm.enable({ allowSelfIntersection: false, snappable: true, removeLayerBelowMinVertexCount: false })
            else lyr.pm.disable()
        }
    }, [key, editing, geometry, map])

    // Al desmontar se olvida la capa para que un nuevo montaje (p. ej. StrictMode) la vuelva a crear
    useEffect(() => () => {
        layerRef.current?.remove()
        layerRef.current = null
        currentKey.current = null
    }, [])
    return null
}

function MapRef({ onMap }: { onMap: (m: L.Map) => void }) {
    const map = useMap()
    useEffect(() => { onMap(map) }, [map, onMap])
    return null
}

function GpsLayer({ puntos, actual, seguir, cerrado }: { puntos: GpsPoint[]; actual: GpsPoint | null; seguir: boolean; cerrado: boolean }) {
    const map = useMap()
    useEffect(() => {
        if (seguir && actual) map.panTo([actual.lat, actual.lng], { animate: true })
    }, [seguir, actual, map])
    const line = puntos.map(p => [p.lat, p.lng] as [number, number])
    return (
        <>
            {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#f97316", weight: 4 }} />}
            {line.length > 2 && !cerrado && (
                <Polyline positions={[line[line.length - 1], line[0]]} pathOptions={{ color: "#f97316", weight: 2, dashArray: "6 6" }} />
            )}
            {puntos.map((p, i) => (
                <CircleMarker key={`${p.ts}-${i}`} center={[p.lat, p.lng]} radius={4}
                    pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#f97316", fillOpacity: 1 }}>
                    <Tooltip>Punto {i + 1}{p.acc != null ? ` · ±${p.acc.toFixed(1)} m` : ""}</Tooltip>
                </CircleMarker>
            ))}
            {actual && (
                <>
                    {actual.acc != null && actual.acc < 500 && (
                        <Circle center={[actual.lat, actual.lng]} radius={actual.acc}
                            pathOptions={{ color: "#3b82f6", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.12 }} />
                    )}
                    <CircleMarker center={[actual.lat, actual.lng]} radius={8}
                        pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} />
                </>
            )}
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor
// ─────────────────────────────────────────────────────────────────────────────

export default function BoundaryEditor({ titulo, subtitulo, valorInicial, contexto, storageKey, onCancel, onSave }: BoundaryEditorProps) {
    const [geometry, setGeometry] = useState<BoundaryGeometry | null>(() => normalizeGeometry(valorInicial?.geometria))
    const [metodo, setMetodo] = useState<MetodoGeorreferenciacion>(valorInicial?.metodo || "DIBUJO_MAPA")
    const [precisionM, setPrecisionM] = useState<number | null>(valorInicial?.precisionM ?? null)
    const [puntosCrudos, setPuntosCrudos] = useState<GpsPoint[] | null>(valorInicial?.puntosCrudos ?? null)
    const [archivoOrigen, setArchivoOrigen] = useState<string | null>(valorInicial?.archivoOrigen ?? null)
    const [historial, setHistorial] = useState<(BoundaryGeometry | null)[]>([])

    const [pestana, setPestana] = useState<Pestana>("dibujar")
    const [drawing, setDrawing] = useState(false)
    const [editing, setEditing] = useState(false)
    const [map, setMap] = useState<L.Map | null>(null)
    const [fit, setFit] = useState<LatLngBoundsTuple | null>(null)
    const [miUbicacion, setMiUbicacion] = useState<GpsPoint | null>(null)

    const gps = useGpsSurvey(storageKey, pestana === "gps")
    const [seguir, setSeguir] = useState(true)

    // Vista inicial: el lindero, o el de la finca/vecinos, o el centro conocido
    const boundsIniciales = useMemo(() => geometryBounds([
        normalizeGeometry(valorInicial?.geometria),
        contexto?.padre?.geometria,
        ...(contexto?.vecinos || []).map(v => v.geometria),
    ]), []) // eslint-disable-line react-hooks/exhaustive-deps
    const centro = contexto?.centro ? [contexto.centro.lat, contexto.centro.lng] as [number, number] : undefined

    const geometryRef = useRef(geometry)
    useEffect(() => { geometryRef.current = geometry }, [geometry])
    const cambiarGeometria = useCallback((g: BoundaryGeometry | null, nuevoMetodo?: MetodoGeorreferenciacion) => {
        const prev = geometryRef.current
        setHistorial(h => [...h.slice(-49), prev])
        setGeometry(g)
        if (nuevoMetodo) setMetodo(nuevoMetodo)
    }, [])

    const deshacer = () => {
        if (!historial.length) return
        setGeometry(historial[historial.length - 1])
        setHistorial(historial.slice(0, -1))
    }

    const metricas = useMemo(() => (geometry ? computeMetrics(geometry) : null), [geometry])
    const advertencias = useMemo(() => (geometry ? validateBoundary(geometry, contexto) : []), [geometry, contexto])
    const hayErrores = advertencias.some(a => a.nivel === "error")

    const irA = (lat: number, lng: number, zoom = 18) => map?.flyTo([lat, lng], zoom)

    const ubicarme = () => {
        navigator.geolocation?.getCurrentPosition(
            pos => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }
                setMiUbicacion(p)
                irA(p.lat, p.lng)
            },
            () => alert("No se pudo obtener su ubicación. Revise los permisos del navegador."),
            { enableHighAccuracy: true, timeout: 15000 },
        )
    }

    const guardar = () => {
        if (!geometry) {
            if (valorInicial?.geometria && !confirm("¿Guardar sin lindero? Se eliminará el lindero actual.")) return
            onSave(null)
            return
        }
        onSave({
            geometria: geometry,
            metodo,
            precisionM: metodo === "RECORRIDO_GPS" ? precisionM : null,
            puntosCrudos: metodo === "RECORRIDO_GPS" ? puntosCrudos : null,
            archivoOrigen: metodo === "IMPORTACION_ARCHIVO" ? archivoOrigen : null,
        })
    }

    const descargar = (tipo: "geojson" | "kml") => {
        if (!geometry) return
        const nombre = titulo.replace(/^Lindero (de la |del )?/i, "")
        const contenido = tipo === "geojson" ? toGeoJSONString(geometry, nombre) : toKMLString(geometry, nombre)
        const blob = new Blob([contenido], { type: tipo === "geojson" ? "application/geo+json" : "application/vnd.google-earth.kml+xml" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `${nombre.replace(/[^\w\-]+/g, "_")}.${tipo}`
        a.click()
        URL.revokeObjectURL(a.href)
    }

    // ── Importación ──
    const [candidatos, setCandidatos] = useState<CandidatoImportado[]>([])
    const [previa, setPrevia] = useState<CandidatoImportado | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importando, setImportando] = useState(false)
    const [textoPegado, setTextoPegado] = useState("")
    const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)

    const mostrarCandidatos = (lista: CandidatoImportado[], origen: string) => {
        setNombreArchivo(origen)
        if (lista.length === 0) {
            setCandidatos([]); setPrevia(null)
            setImportError("No se encontró ningún polígono. Revise que el archivo contenga un área cerrada (polígono) o al menos 3 coordenadas.")
            return
        }
        setImportError(null)
        setCandidatos(lista)
        verPrevia(lista[0])
    }
    const verPrevia = (c: CandidatoImportado) => {
        setPrevia(c)
        setFit(geometryBounds([c.geometria]))
    }
    const leerArchivo = async (file: File) => {
        setImportando(true)
        try { mostrarCandidatos(await parseBoundaryFile(file), file.name) }
        catch (e: any) { setImportError(e.message || "No se pudo leer el archivo."); setCandidatos([]) }
        finally { setImportando(false) }
    }
    const usarCandidato = (c: CandidatoImportado) => {
        cambiarGeometria(c.geometria, "IMPORTACION_ARCHIVO")
        setArchivoOrigen(nombreArchivo)
        setPrecisionM(null); setPuntosCrudos(null)
        setPrevia(null); setCandidatos([])
        setFit(geometryBounds([c.geometria]))
        setPestana("dibujar"); setEditing(true)
    }

    // ── GPS ──
    const [ahora, setAhora] = useState(() => Date.now())
    useEffect(() => {
        if (gps.estado !== "grabando") return
        const t = setInterval(() => setAhora(Date.now()), 1000)
        return () => clearInterval(t)
    }, [gps.estado])

    const areaParcial = useMemo(() => {
        if (gps.puntos.length < 3) return null
        const g = polygonFromPoints(gps.puntos)
        return g ? computeMetrics(g).areaHa : null
    }, [gps.puntos])

    const terminarRecorrido = () => {
        let g = polygonFromPoints(gps.puntos)
        if (!g) return
        // En modo continuo se quitan vértices redundantes causados por el ruido del GPS
        if (gps.modo === "continuo") g = simplifyGeometry(g, Math.max(0.5, Math.min(2, (gps.precisionPromedio ?? 2) / 3)))
        cambiarGeometria(g, "RECORRIDO_GPS")
        setPrecisionM(gps.precisionPromedio != null ? +gps.precisionPromedio.toFixed(1) : null)
        setPuntosCrudos(gps.puntos)
        setArchivoOrigen(null)
        gps.descartar()
        setFit(geometryBounds([g]))
        setPestana("dibujar"); setEditing(true)
    }

    const cerrar = () => {
        if (gps.puntos.length > 0 && !confirm("Hay un recorrido GPS sin terminar. Quedará guardado en este dispositivo para continuarlo después. ¿Cerrar el editor?")) return
        onCancel()
    }

    // Bloquea el scroll de la página detrás del editor
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = prev }
    }, [])

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={titulo}>
            {/* Barra superior */}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 md:px-4">
                <Button type="button" variant="ghost" size="icon" onClick={cerrar} aria-label="Cerrar editor">
                    <X className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold md:text-base">{titulo}</h2>
                    {subtitulo && <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={cerrar} className="hidden sm:inline-flex">Cancelar</Button>
                <Button type="button" size="sm" onClick={guardar} disabled={hayErrores}>
                    <Save className="mr-1.5 h-4 w-4" /> Aplicar lindero
                </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
                {/* Panel lateral (abajo en móvil) */}
                <aside className="flex max-h-[48vh] min-h-0 w-full shrink-0 flex-col border-t border-border bg-card md:max-h-none md:w-[380px] md:border-r md:border-t-0">
                    <nav className="grid shrink-0 grid-cols-3 gap-1 border-b border-border p-2" role="tablist">
                        {([
                            ["dibujar", PenLine, "Dibujar"],
                            ["importar", Upload, "Importar"],
                            ["gps", Footprints, "Caminar GPS"],
                        ] as const).map(([id, Icon, label]) => (
                            <button key={id} type="button" role="tab" aria-selected={pestana === id}
                                onClick={() => { setPestana(id); setDrawing(false) }}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                                    pestana === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}>
                                <Icon className="h-4 w-4" /> {label}
                            </button>
                        ))}
                    </nav>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                        {pestana === "dibujar" && (
                            <PanelDibujo
                                hayGeometria={!!geometry}
                                drawing={drawing}
                                editing={editing}
                                puedeDeshacer={historial.length > 0}
                                onDibujar={() => { setEditing(false); setDrawing(d => !d) }}
                                onEditar={() => { setDrawing(false); setEditing(e => !e) }}
                                onDeshacer={deshacer}
                                onBorrar={() => { if (confirm("¿Borrar el lindero dibujado?")) { cambiarGeometria(null); setEditing(false) } }}
                                onUbicarme={ubicarme}
                                onIrA={irA}
                            />
                        )}

                        {pestana === "importar" && (
                            <PanelImportar
                                candidatos={candidatos}
                                previa={previa}
                                error={importError}
                                importando={importando}
                                texto={textoPegado}
                                setTexto={setTextoPegado}
                                onArchivo={leerArchivo}
                                onTexto={() => mostrarCandidatos(parseTextInput(textoPegado), "Texto pegado")}
                                onPrevia={verPrevia}
                                onUsar={usarCandidato}
                            />
                        )}

                        {pestana === "gps" && (
                            <PanelGps
                                gps={gps}
                                ahora={ahora}
                                areaParcial={areaParcial}
                                seguir={seguir}
                                setSeguir={setSeguir}
                                onTerminar={terminarRecorrido}
                            />
                        )}

                        <PanelMetricas
                            metricas={metricas}
                            metodo={geometry ? metodo : null}
                            precisionM={metodo === "RECORRIDO_GPS" ? precisionM : null}
                            archivoOrigen={metodo === "IMPORTACION_ARCHIVO" ? archivoOrigen : null}
                            areaDeclaradaHa={contexto?.areaDeclaradaHa ?? null}
                            advertencias={advertencias}
                            onDescargar={descargar}
                        />
                    </div>
                </aside>

                {/* Mapa */}
                <div className="relative min-h-0 flex-1">
                    <MapBase bounds={boundsIniciales} center={boundsIniciales ? undefined : centro} zoom={centro ? 16 : 6}>
                        <MapRef onMap={setMap} />
                        <FitBounds bounds={fit} padding={60} />
                        {contexto?.padre?.geometria && (
                            <GeoJSON key={`padre-${contexto.padre.nombre}`} data={contexto.padre.geometria as any} style={() => ESTILO_PADRE} interactive={false} />
                        )}
                        {(contexto?.vecinos || []).map((v, i) => (
                            <GeoJSON key={`vecino-${i}-${v.nombre}`} data={v.geometria as any} style={() => ESTILO_VECINO}
                                onEachFeature={(_, layer) => layer.bindTooltip(v.nombre, { permanent: true, direction: "center", className: "map-label" })} />
                        ))}
                        {previa && <GeoJSON key={`previa-${previa.id}-${previa.nombre}`} data={previa.geometria as any} style={() => ESTILO_PREVIA} />}
                        <EditableBoundary
                            geometry={geometry}
                            editing={editing && pestana === "dibujar"}
                            drawing={drawing && pestana === "dibujar"}
                            onChange={g => cambiarGeometria(g)}
                            onDrawn={g => { cambiarGeometria(g, "DIBUJO_MAPA"); setPrecisionM(null); setPuntosCrudos(null); setArchivoOrigen(null); setDrawing(false); setEditing(true) }}
                        />
                        {pestana === "gps" && <GpsLayer puntos={gps.puntos} actual={gps.actual} seguir={seguir} cerrado={false} />}
                        {miUbicacion && pestana !== "gps" && (
                            <CircleMarker center={[miUbicacion.lat, miUbicacion.lng]} radius={7}
                                pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}>
                                <Tooltip>Usted está aquí</Tooltip>
                            </CircleMarker>
                        )}
                    </MapBase>

                    {/* Indicaciones flotantes */}
                    {pestana === "dibujar" && (drawing || editing) && (
                        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] w-[min(92%,520px)] -translate-x-1/2 rounded-lg bg-slate-900/85 px-3 py-2 text-center text-xs text-white shadow-lg backdrop-blur">
                            {drawing
                                ? "Haga clic en cada esquina del lindero. Clic en el primer punto para cerrar el polígono."
                                : "Arrastre los vértices para ajustar. Arrastre un punto intermedio para crear un vértice. Clic derecho sobre un vértice para quitarlo."}
                        </div>
                    )}
                    {metricas && (
                        <div className="absolute bottom-6 right-3 z-[500] rounded-lg bg-slate-900/85 px-3 py-2 text-right text-white shadow-lg backdrop-blur">
                            <div className="text-lg font-semibold leading-tight tabular-nums">{formatHa(metricas.areaHa)}</div>
                            <div className="text-xs text-white/70 tabular-nums">Perímetro {formatMeters(metricas.perimetroM)}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Paneles
// ─────────────────────────────────────────────────────────────────────────────

function Seccion({ titulo, children, icon: Icon }: { titulo: string; children: React.ReactNode; icon?: any }) {
    return (
        <section className="space-y-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {Icon && <Icon className="h-3.5 w-3.5" />} {titulo}
            </h3>
            {children}
        </section>
    )
}

function PanelDibujo({ hayGeometria, drawing, editing, puedeDeshacer, onDibujar, onEditar, onDeshacer, onBorrar, onUbicarme, onIrA }: {
    hayGeometria: boolean; drawing: boolean; editing: boolean; puedeDeshacer: boolean
    onDibujar: () => void; onEditar: () => void; onDeshacer: () => void; onBorrar: () => void
    onUbicarme: () => void; onIrA: (lat: number, lng: number) => void
}) {
    const [coords, setCoords] = useState("")
    const [coordError, setCoordError] = useState(false)
    const buscar = () => {
        const nums = coords.split(/[\s,;]+/).filter(Boolean).map(Number)
        if (nums.length < 2 || nums.some(isNaN) || Math.abs(nums[0]) > 90 || Math.abs(nums[1]) > 180) { setCoordError(true); return }
        setCoordError(false)
        onIrA(nums[0], nums[1])
    }
    return (
        <>
            <Seccion titulo="Lindero" icon={Spline}>
                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={drawing ? "default" : "outline"} onClick={onDibujar} className="col-span-2">
                        <PenLine className="mr-2 h-4 w-4" />
                        {drawing ? "Cancelar dibujo" : hayGeometria ? "Dibujar de nuevo" : "Dibujar lindero"}
                    </Button>
                    <Button type="button" variant={editing ? "default" : "outline"} size="sm" onClick={onEditar} disabled={!hayGeometria}>
                        <Pencil className="mr-1.5 h-4 w-4" /> {editing ? "Terminar edición" : "Editar vértices"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={onDeshacer} disabled={!puedeDeshacer}>
                        <Undo2 className="mr-1.5 h-4 w-4" /> Deshacer
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onBorrar} disabled={!hayGeometria}
                        className="col-span-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-1.5 h-4 w-4" /> Borrar lindero
                    </Button>
                </div>
                {!hayGeometria && !drawing && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Acerque el mapa satelital a la finca y marque cada esquina. Los vértices se pegan a los linderos de la finca y de los lotes vecinos para que los bordes coincidan.
                    </p>
                )}
            </Seccion>
            <Seccion titulo="Navegar" icon={Navigation}>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={onUbicarme}>
                    <LocateFixed className="mr-1.5 h-4 w-4" /> Ir a mi ubicación
                </Button>
                <div className="flex gap-2">
                    <input
                        value={coords}
                        onChange={e => { setCoords(e.target.value); setCoordError(false) }}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscar() } }}
                        placeholder="Lat, Lng  (ej: 4.1420, -73.6266)"
                        className={cn("h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", coordError && "border-destructive")}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={buscar}><Crosshair className="h-4 w-4" /></Button>
                </div>
                {coordError && <p className="text-xs text-destructive">Escriba latitud y longitud separadas por coma.</p>}
            </Seccion>
        </>
    )
}

function PanelImportar({ candidatos, previa, error, importando, texto, setTexto, onArchivo, onTexto, onPrevia, onUsar }: {
    candidatos: CandidatoImportado[]; previa: CandidatoImportado | null; error: string | null; importando: boolean
    texto: string; setTexto: (t: string) => void
    onArchivo: (f: File) => void; onTexto: () => void; onPrevia: (c: CandidatoImportado) => void; onUsar: (c: CandidatoImportado) => void
}) {
    const [arrastrando, setArrastrando] = useState(false)
    return (
        <>
            <Seccion titulo="Archivo" icon={FileUp}>
                <label
                    onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={e => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files[0]; if (f) onArchivo(f) }}
                    className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
                        arrastrando ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}>
                    {importando ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
                    <span className="text-sm font-medium">Seleccione o arrastre un archivo</span>
                    <span className="text-xs text-muted-foreground">GeoJSON, KML (Google Earth), GPX o lista de coordenadas</span>
                    <input type="file" className="sr-only" accept=".geojson,.json,.kml,.gpx,.txt,.csv"
                        onChange={e => { const f = e.target.files?.[0]; if (f) onArchivo(f); e.target.value = "" }} />
                </label>
            </Seccion>

            <Seccion titulo="O pegue el contenido">
                <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    placeholder={'{"type":"Polygon","coordinates":[…]}\n\no una coordenada por línea:\n4.14201, -73.62660\n4.14310, -73.62512\n…'}
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onTexto} disabled={!texto.trim()}>
                    Interpretar texto
                </Button>
            </Seccion>

            {error && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            {candidatos.length > 0 && (
                <Seccion titulo={`Polígonos encontrados (${candidatos.length})`}>
                    <ul className="space-y-1.5">
                        {candidatos.map(c => (
                            <li key={c.id}>
                                <div className={cn(
                                    "flex items-center gap-2 rounded-md border p-2 transition-colors",
                                    previa?.id === c.id ? "border-pink-400 bg-pink-50" : "border-border",
                                )}>
                                    <button type="button" onClick={() => onPrevia(c)} className="min-w-0 flex-1 text-left">
                                        <div className="truncate text-sm font-medium">{c.nombre}</div>
                                        <div className="text-xs text-muted-foreground tabular-nums">{formatHa(c.areaHa)}</div>
                                    </button>
                                    <Button type="button" size="sm" onClick={() => onUsar(c)}>Usar</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">La vista previa aparece en rosado. Al usarlo podrá ajustar sus vértices.</p>
                </Seccion>
            )}

            <div className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> Formatos de coordenadas</p>
                Las listas de puntos se leen como <strong>latitud, longitud</strong> (como las copia Google Maps). Si el primer número es mayor que 90 se asume el orden GeoJSON <strong>longitud, latitud</strong>. Coordenadas en grados decimales, sistema WGS84.
            </div>
        </>
    )
}

function calidadSenal(acc: number | null | undefined) {
    if (acc == null) return { texto: "Sin señal", color: "bg-slate-400", barras: 0 }
    if (acc <= 5) return { texto: "Excelente", color: "bg-emerald-500", barras: 4 }
    if (acc <= 10) return { texto: "Buena", color: "bg-lime-500", barras: 3 }
    if (acc <= 20) return { texto: "Regular", color: "bg-amber-500", barras: 2 }
    return { texto: "Débil", color: "bg-red-500", barras: 1 }
}

function formatDuracion(ms: number) {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`
}

function PanelGps({ gps, ahora, areaParcial, seguir, setSeguir, onTerminar }: {
    gps: ReturnType<typeof useGpsSurvey>; ahora: number; areaParcial: number | null
    seguir: boolean; setSeguir: (v: boolean) => void; onTerminar: () => void
}) {
    const senal = calidadSenal(gps.actual?.acc)
    const aceptable = gps.actual?.acc != null && gps.actual.acc <= gps.ajustes.precisionMaxM
    const grabando = gps.estado === "grabando"
    const sel = "h-8 rounded-md border border-input bg-background px-2 text-xs"

    return (
        <>
            {/* Señal */}
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-6 items-end gap-0.5" aria-hidden>
                    {[1, 2, 3, 4].map(b => (
                        <span key={b} className={cn("w-1.5 rounded-sm", b <= senal.barras ? senal.color : "bg-muted")} style={{ height: `${b * 25}%` }} />
                    ))}
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium">Señal GPS: {senal.texto}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                        {gps.actual?.acc != null ? `Precisión ±${gps.actual.acc.toFixed(1)} m` : "Esperando ubicación…"}
                    </div>
                </div>
                <Satellite className={cn("h-5 w-5", aceptable ? "text-emerald-600" : "text-muted-foreground")} />
            </div>

            {gps.error && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {gps.error}
                </div>
            )}
            {gps.recuperado && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    Se recuperó un recorrido sin terminar con {gps.puntos.length} puntos. Continúe o descártelo.
                </div>
            )}

            {gps.estado === "inactivo" && gps.puntos.length === 0 && (
                <Seccion titulo="Modo de levantamiento">
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            ["vertices", "Por esquinas", "Se detiene en cada vértice y se promedia la señal. Más preciso."],
                            ["continuo", "Continuo", "Registra puntos mientras camina el borde. Para linderos curvos."],
                        ] as [ModoRecorrido, string, string][]).map(([id, label, desc]) => (
                            <button key={id} type="button" onClick={() => gps.setModo(id)}
                                className={cn("rounded-lg border p-2.5 text-left transition-colors",
                                    gps.modo === id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50")}>
                                <div className="text-sm font-medium">{label}</div>
                                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{desc}</div>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="space-y-1">
                            <span className="text-muted-foreground">Precisión máxima</span>
                            <select className={cn(sel, "w-full")} value={gps.ajustes.precisionMaxM}
                                onChange={e => gps.setAjustes({ ...gps.ajustes, precisionMaxM: +e.target.value })}>
                                {[5, 10, 15, 25].map(v => <option key={v} value={v}>±{v} m</option>)}
                            </select>
                        </label>
                        {gps.modo === "continuo" ? (
                            <label className="space-y-1">
                                <span className="text-muted-foreground">Un punto cada</span>
                                <select className={cn(sel, "w-full")} value={gps.ajustes.distanciaMinM}
                                    onChange={e => gps.setAjustes({ ...gps.ajustes, distanciaMinM: +e.target.value })}>
                                    {[2, 3, 5, 10].map(v => <option key={v} value={v}>{v} m</option>)}
                                </select>
                            </label>
                        ) : (
                            <label className="space-y-1">
                                <span className="text-muted-foreground">Promediar</span>
                                <select className={cn(sel, "w-full")} value={gps.ajustes.segundosPromedio}
                                    onChange={e => gps.setAjustes({ ...gps.ajustes, segundosPromedio: +e.target.value })}>
                                    {[3, 5, 10, 20].map(v => <option key={v} value={v}>{v} s por esquina</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                </Seccion>
            )}

            {/* Controles */}
            <div className="space-y-2">
                {gps.estado !== "grabando" ? (
                    <Button type="button" className="h-11 w-full" onClick={gps.iniciar}>
                        <Play className="mr-2 h-4 w-4" /> {gps.puntos.length ? "Continuar recorrido" : "Iniciar recorrido"}
                    </Button>
                ) : (
                    <>
                        {gps.modo === "vertices" && (
                            <Button type="button" className="h-14 w-full bg-orange-600 text-base text-white hover:bg-orange-700"
                                onClick={gps.marcarVertice} disabled={!!gps.muestreo}>
                                {gps.muestreo
                                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Quieto… {gps.muestreo.restante} s ({gps.muestreo.muestras} lecturas)</>
                                    : <><Flag className="mr-2 h-5 w-5" /> Marcar esquina {gps.puntos.length + 1}</>}
                            </Button>
                        )}
                        <Button type="button" variant="outline" className="w-full" onClick={gps.pausar}>
                            <Pause className="mr-2 h-4 w-4" /> Pausar
                        </Button>
                    </>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={gps.deshacer} disabled={!gps.puntos.length}>
                        <Undo2 className="mr-1.5 h-4 w-4" /> Quitar último
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!gps.puntos.length && gps.estado === "inactivo"}
                        onClick={() => { if (confirm("¿Descartar el recorrido actual?")) gps.descartar() }}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Descartar
                    </Button>
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={onTerminar} disabled={gps.puntos.length < 3 || grabando && !!gps.muestreo}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Terminar y cerrar lindero
                </Button>
            </div>

            {/* Estadísticas */}
            <dl className="grid grid-cols-2 gap-2 text-center">
                {[
                    ["Puntos", String(gps.puntos.length)],
                    ["Recorrido", formatMeters(gps.distanciaRecorrida)],
                    ["Tiempo", gps.inicio ? formatDuracion(Math.max(0, ahora - gps.inicio)) : "0:00"],
                    ["Área parcial", areaParcial != null ? formatHa(areaParcial) : "—"],
                ].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-muted/60 px-2 py-2">
                        <dt className="text-[11px] text-muted-foreground">{k}</dt>
                        <dd className="text-sm font-semibold tabular-nums">{v}</dd>
                    </div>
                ))}
            </dl>

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={seguir} onChange={e => setSeguir(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Centrar el mapa en mi posición
            </label>

            <div className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Recomendaciones en campo</p>
                <ul className="list-disc space-y-0.5 pl-4">
                    <li>Camine el lindero en un solo sentido y vuelva al punto de inicio.</li>
                    <li>Mantenga la pantalla encendida y la app abierta mientras graba.</li>
                    <li>Bajo palma adulta la señal se degrada: en esquinas espere a que la precisión mejore.</li>
                    <li>El recorrido se guarda en el teléfono; si se cierra, puede continuarlo.</li>
                </ul>
            </div>
        </>
    )
}

function PanelMetricas({ metricas, metodo, precisionM, archivoOrigen, areaDeclaradaHa, advertencias, onDescargar }: {
    metricas: ReturnType<typeof computeMetrics> | null
    metodo: MetodoGeorreferenciacion | null
    precisionM: number | null
    archivoOrigen: string | null
    areaDeclaradaHa: number | null
    advertencias: ReturnType<typeof validateBoundary>
    onDescargar: (t: "geojson" | "kml") => void
}) {
    if (!metricas) {
        return (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Sin lindero definido todavía.
            </div>
        )
    }
    return (
        <Seccion titulo="Medición" icon={Ruler}>
            <div className="rounded-lg border border-border">
                <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3">
                        <div className="text-[11px] text-muted-foreground">Área medida</div>
                        <div className="text-lg font-semibold tabular-nums">{formatHa(metricas.areaHa)}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{Math.round(metricas.areaM2).toLocaleString("es-CO")} m²</div>
                    </div>
                    <div className="p-3">
                        <div className="text-[11px] text-muted-foreground">Perímetro</div>
                        <div className="text-lg font-semibold tabular-nums">{formatMeters(metricas.perimetroM)}</div>
                        <div className="text-[11px] text-muted-foreground">{metricas.vertices} vértices</div>
                    </div>
                </div>
                <dl className="space-y-1 border-t border-border p-3 text-xs">
                    {metodo && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Método</dt><dd className="text-right font-medium">{METODO_LABELS[metodo]}</dd></div>}
                    {precisionM != null && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Precisión GPS promedio</dt><dd className="font-medium tabular-nums">±{precisionM.toFixed(1)} m</dd></div>}
                    {archivoOrigen && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Origen</dt><dd className="truncate text-right font-medium">{archivoOrigen}</dd></div>}
                    {areaDeclaradaHa ? <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Área registrada</dt><dd className="font-medium tabular-nums">{formatHa(areaDeclaradaHa)}</dd></div> : null}
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Centroide</dt><dd className="font-mono tabular-nums">{metricas.centroide.lat.toFixed(6)}, {metricas.centroide.lng.toFixed(6)}</dd></div>
                </dl>
            </div>

            {advertencias.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Lindero válido.</p>
            ) : (
                <ul className="space-y-1.5">
                    {advertencias.map((a, i) => (
                        <li key={i} className={cn("flex gap-2 rounded-md border p-2 text-xs",
                            a.nivel === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-amber-300 bg-amber-50 text-amber-900")}>
                            <AlertTriangle className="h-4 w-4 shrink-0" /> {a.mensaje}
                        </li>
                    ))}
                </ul>
            )}

            <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onDescargar("kml")}><Download className="mr-1.5 h-4 w-4" /> KML</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onDescargar("geojson")}><Download className="mr-1.5 h-4 w-4" /> GeoJSON</Button>
            </div>
        </Seccion>
    )
}
