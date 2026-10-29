import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { computeMetrics, normalizeGeometry, formatHa, formatMeters, METODO_LABELS, type BoundaryGeometry } from "@/lib/geo"
import { mapaEstatico, pathSVG } from "@/lib/informe"
import { describirMaterial, describirUso, formatEntero, ETAPAS_VIVERO, NOMBRE_FINALIDAD, type Finalidad } from "@/lib/cultivos"
import { formatDate } from "@/lib/utils"
import { InformeToolbar } from "./InformeToolbar"
import "./informe.css"

export const dynamic = "force-dynamic"

const COLOR_FINALIDAD: Record<Finalidad, string> = {
    SIEMBRA: "#22a05a",
    VIVERO: "#e0a526",
    INFRAESTRUCTURA: "#d9534f",
    CONSERVACION: "#1b8a8f",
    OTRO: "#8a94a6",
}

const ESTADO_LOTE: Record<string, string> = { ACTIVO: "Activo", EN_RENOVACION: "En renovación", INACTIVO: "Inactivo" }

async function cargar(id: string) {
    return db.finca.findUnique({
        where: { id },
        include: {
            lotes: {
                orderBy: { codigo: "asc" },
                include: { materialesVivero: { orderBy: [{ etapa: "asc" }, { ubicacion: "asc" }] } },
            },
            tareas: { orderBy: { fechaProgramada: "asc" }, include: { lote: { select: { codigo: true, nombre: true } } } },
        },
    })
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params
    const f = await db.finca.findUnique({ where: { id }, select: { nombre: true } })
    // El título es el nombre que propone el navegador al guardar el PDF
    return { title: f ? `Informe finca ${f.nombre} - ${new Date().toISOString().slice(0, 10)}` : "Informe de finca" }
}

function edadMeses(fecha: Date | null) {
    if (!fecha) return null
    const m = Math.floor((Date.now() - fecha.getTime()) / (30.44 * 24 * 3600 * 1000))
    return m >= 0 ? m : null
}
function textoEdad(m: number | null) {
    if (m == null) return "—"
    if (m < 12) return m === 1 ? "1 mes" : `${m} meses`
    const a = Math.floor(m / 12), r = m % 12
    return `${a} ${a === 1 ? "año" : "años"}${r ? ` ${r} m` : ""}`
}

export default async function InformeFincaPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const finca = await cargar(id)
    if (!finca) notFound()

    const hoy = new Date()
    const fincaGeom = normalizeGeometry(finca.geometria)
    const lotes = finca.lotes.map(l => {
        const geom = normalizeGeometry(l.geometria)
        const area = l.areaMedidaHa ?? l.areaHa
        const plantasVivero = l.materialesVivero.reduce((s, m) => s + m.cantidad, 0)
        return {
            ...l,
            geom,
            area,
            plantasVivero,
            densidad: l.finalidad === "SIEMBRA" && l.numeroPlantas && area ? l.numeroPlantas / area : null,
            edad: edadMeses(l.fechaSiembra),
            centro: geom ? computeMetrics(geom).centroide : null,
        }
    })

    // ── Indicadores ──
    const areaFinca = finca.areaMedidaHa ?? finca.areaTotalHa
    const areaLotes = lotes.reduce((s, l) => s + l.area, 0)
    const sembrados = lotes.filter(l => l.finalidad === "SIEMBRA")
    const plantasSembradas = sembrados.reduce((s, l) => s + (l.numeroPlantas ?? 0), 0)
    const areaSembrada = sembrados.reduce((s, l) => s + l.area, 0)
    const plantasVivero = lotes.reduce((s, l) => s + l.plantasVivero, 0)
    const densidadMedia = plantasSembradas && areaSembrada ? plantasSembradas / sembrados.filter(l => l.numeroPlantas).reduce((s, l) => s + l.area, 0) : null

    // ── Composición del área por finalidad ──
    const porFinalidad = (Object.keys(COLOR_FINALIDAD) as Finalidad[])
        .map(f => ({ f, ha: lotes.filter(l => l.finalidad === f).reduce((s, l) => s + l.area, 0), n: lotes.filter(l => l.finalidad === f).length }))
        .filter(x => x.n)
    const sinAsignar = Math.max(areaFinca - areaLotes, 0)
    const baseComp = Math.max(areaFinca, areaLotes) || 1

    // ── Inventario por material (siembra + vivero) ──
    type Inv = { cultivo: string; especie: string | null; material: string; casa: string | null; campo: number; previvero: number; vivero: number; lista: number }
    const inv = new Map<string, Inv>()
    const acumular = (cultivo: string, especie: string | null, material: string, casa: string | null, campo: keyof Pick<Inv, "campo" | "previvero" | "vivero" | "lista">, n: number) => {
        const k = [cultivo, especie, material, casa].join("|")
        const e = inv.get(k) ?? { cultivo, especie, material, casa, campo: 0, previvero: 0, vivero: 0, lista: 0 }
        e[campo] += n
        inv.set(k, e)
    }
    for (const l of sembrados) {
        if (l.numeroPlantas) acumular(l.tipoCultivo ?? "—", l.especie, l.variedad ? describirMaterial(l, { conCasa: false }) : "Sin variedad", l.casaGenetica, "campo", l.numeroPlantas)
    }
    for (const l of lotes) for (const m of l.materialesVivero) {
        acumular(m.tipoCultivo, m.especie, m.variedad ? describirMaterial({ variedad: m.variedad, opcionesGeneticas: m.opcionesGeneticas }, { conCasa: false }) : "Sin variedad", m.casaGenetica,
            m.etapa === "PREVIVERO" ? "previvero" : m.etapa === "VIVERO" ? "vivero" : "lista", m.cantidad)
    }
    const inventario = [...inv.values()].sort((a, b) => (b.campo + b.previvero + b.vivero + b.lista) - (a.campo + a.previvero + a.vivero + a.lista))

    // ── Tareas ──
    const activas = finca.tareas.filter(t => t.estado === "PROGRAMADA" || t.estado === "EN_PROCESO")
    const atrasadas = activas.filter(t => t.fechaProgramada < hoy)
    const conteo = {
        PROGRAMADA: finca.tareas.filter(t => t.estado === "PROGRAMADA").length,
        EN_PROCESO: finca.tareas.filter(t => t.estado === "EN_PROCESO").length,
        EJECUTADA: finca.tareas.filter(t => t.estado === "EJECUTADA").length,
        CANCELADA: finca.tareas.filter(t => t.estado === "CANCELADA").length,
    }
    const proximas = activas.filter(t => t.fechaProgramada >= hoy).slice(0, 8)
    const recientes = finca.tareas.filter(t => t.estado === "EJECUTADA").sort((a, b) => +(b.fechaEjecucion ?? b.updatedAt) - +(a.fechaEjecucion ?? a.updatedAt)).slice(0, 5)

    // ── Puntos de atención ──
    const alertas: string[] = []
    if (!fincaGeom) alertas.push("La finca no tiene lindero georreferenciado.")
    const sinLindero = lotes.filter(l => !l.geom)
    if (sinLindero.length) alertas.push(`Lotes sin lindero georreferenciado: ${sinLindero.map(l => l.codigo).join(", ")}.`)
    const sinPlantas = sembrados.filter(l => !l.numeroPlantas)
    if (sinPlantas.length) alertas.push(`Lotes de siembra sin número de plantas: ${sinPlantas.map(l => l.codigo).join(", ")}.`)
    const sinVariedad = sembrados.filter(l => !l.variedad)
    if (sinVariedad.length) alertas.push(`Lotes de siembra sin variedad o cruce: ${sinVariedad.map(l => l.codigo).join(", ")}.`)
    if (areaLotes > areaFinca * 1.01) alertas.push(`El área de los lotes (${formatHa(areaLotes)}) supera el área de la finca (${formatHa(areaFinca)}).`)
    if (finca.areaMedidaHa && finca.areaTotalHa && Math.abs(finca.areaMedidaHa - finca.areaTotalHa) / finca.areaTotalHa > 0.05) {
        alertas.push(`El área medida (${formatHa(finca.areaMedidaHa)}) difiere ${Math.round(((finca.areaMedidaHa - finca.areaTotalHa) / finca.areaTotalHa) * 100)} % del área registrada (${formatHa(finca.areaTotalHa)}).`)
    }
    if (atrasadas.length) alertas.push(`${atrasadas.length} tarea(s) atrasada(s) pendientes de ejecutar.`)

    // ── Mapa ──
    const mapa = mapaEstatico([fincaGeom, ...lotes.map(l => l.geom)], 1000)

    return (
        <div className="inf-root">
            <InformeToolbar volver={`/fincas/${finca.id}`} />
            <div className="inf-hoja">
                {/* Encabezado */}
                <div className="inf-banda">
                    <div className="inf-marca">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
                        </svg>
                        <div>AgroApp<small>Gestión de palmicultura</small></div>
                    </div>
                    <div className="inf-banda-der">
                        <strong>INFORME DE FINCA</strong>
                        {hoy.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                <div className="inf-titulo">
                    <div>
                        <h1>{finca.nombre}</h1>
                        <div className="inf-sub">
                            <span className="inf-chip">{finca.codigo}</span>
                            <span className="inf-chip">{finca.estado === "ACTIVO" ? "Activa" : "Inactiva"}</span>
                            {finca.veredaSector} · {finca.municipio}, {finca.departamento}
                        </div>
                        <div className="inf-sub">Responsable: <b>{finca.responsable}</b></div>
                    </div>
                    {finca.logo && <img className="inf-logo" src={finca.logo} alt="" />}
                </div>

                {/* Indicadores */}
                <div className="inf-kpis">
                    <div className="inf-kpi"><div className="inf-kpi-l">Área registrada</div><div className="inf-kpi-v">{formatHa(finca.areaTotalHa)}</div><div className="inf-kpi-h">Según escritura</div></div>
                    <div className="inf-kpi"><div className="inf-kpi-l">Área medida</div><div className="inf-kpi-v">{finca.areaMedidaHa != null ? formatHa(finca.areaMedidaHa) : "—"}</div><div className="inf-kpi-h">{finca.perimetroM ? `Perímetro ${formatMeters(finca.perimetroM)}` : "Sin lindero"}</div></div>
                    <div className="inf-kpi"><div className="inf-kpi-l">Lotes</div><div className="inf-kpi-v">{lotes.length}</div><div className="inf-kpi-h">{formatHa(areaLotes)} · {Math.round((areaLotes / (areaFinca || 1)) * 100)} % de la finca</div></div>
                    <div className="inf-kpi"><div className="inf-kpi-l">Área sembrada</div><div className="inf-kpi-v">{formatHa(areaSembrada)}</div><div className="inf-kpi-h">{sembrados.length} lote(s) de siembra</div></div>
                    <div className="inf-kpi dorado"><div className="inf-kpi-l">Plantas en campo</div><div className="inf-kpi-v">{formatEntero(plantasSembradas)}</div><div className="inf-kpi-h">{densidadMedia ? `${Math.round(densidadMedia)} plantas/ha promedio` : "Sin densidad registrada"}</div></div>
                    <div className="inf-kpi dorado"><div className="inf-kpi-l">Plantas en vivero</div><div className="inf-kpi-v">{formatEntero(plantasVivero)}</div><div className="inf-kpi-h">{lotes.filter(l => l.finalidad === "VIVERO").length} vivero(s)</div></div>
                    <div className="inf-kpi"><div className="inf-kpi-l">Tareas activas</div><div className="inf-kpi-v">{activas.length}</div><div className="inf-kpi-h">{atrasadas.length ? `${atrasadas.length} atrasada(s)` : "Al día"}</div></div>
                    <div className="inf-kpi"><div className="inf-kpi-l">Área sin asignar</div><div className="inf-kpi-v">{formatHa(sinAsignar)}</div><div className="inf-kpi-h">No pertenece a ningún lote</div></div>
                </div>

                {/* Mapa de loteo */}
                <section className="inf-sec">
                    <h2><span className="num">1</span> Mapa de loteo</h2>
                    {mapa ? (
                        <>
                            <div className="inf-mapa">
                                <svg viewBox={`0 0 ${mapa.ancho} ${mapa.alto}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Mapa de loteo de ${finca.nombre}`}>
                                    <image href={mapa.urlSatelite} x="0" y="0" width={mapa.ancho} height={mapa.alto} preserveAspectRatio="none" />
                                    <rect width={mapa.ancho} height={mapa.alto} fill="rgb(0 0 0 / 0.12)" />
                                    {lotes.filter(l => l.geom).map(l => (
                                        <path key={l.id} d={pathSVG(l.geom as BoundaryGeometry, mapa.proyectar)} fill={COLOR_FINALIDAD[l.finalidad]} fillOpacity="0.45"
                                            stroke="#fff" strokeWidth="2.5" fillRule="evenodd" />
                                    ))}
                                    {fincaGeom && (
                                        <path d={pathSVG(fincaGeom, mapa.proyectar)} fill="none" stroke="#ffd34d" strokeWidth="3.5" strokeDasharray="12 8" />
                                    )}
                                    {lotes.filter(l => l.centro).map(l => {
                                        const [x, y] = mapa.proyectar([l.centro!.lng, l.centro!.lat])
                                        return (
                                            <g key={`t-${l.id}`} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700">
                                                <text x={x} y={y - 2} fontSize="22" fill="#fff" stroke="rgb(0 0 0 / .65)" strokeWidth="4" paintOrder="stroke">{l.codigo}</text>
                                                <text x={x} y={y + 18} fontSize="13" fill="#fff" stroke="rgb(0 0 0 / .65)" strokeWidth="3" paintOrder="stroke" fontWeight="600">{formatHa(l.area, 1)}</text>
                                            </g>
                                        )
                                    })}
                                    {/* Norte */}
                                    <g transform={`translate(${mapa.ancho - 46} 52)`}>
                                        <circle r="26" fill="rgb(255 255 255 / .9)" />
                                        <path d="M0 -18 L8 6 L0 1 L-8 6 Z" fill="#0f5132" />
                                        <text y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f5132" fontFamily="Inter, sans-serif">N</text>
                                    </g>
                                    {/* Escala */}
                                    <g transform={`translate(24 ${mapa.alto - 30})`} fontFamily="Inter, sans-serif">
                                        <rect x="-8" y="-20" width={mapa.escala.pixeles + 16} height="34" rx="6" fill="rgb(255 255 255 / .9)" />
                                        <rect x="0" y="0" width={mapa.escala.pixeles / 2} height="6" fill="#14211b" />
                                        <rect x={mapa.escala.pixeles / 2} y="0" width={mapa.escala.pixeles / 2} height="6" fill="#fff" stroke="#14211b" />
                                        <text x="0" y="-6" fontSize="11" fill="#14211b">0</text>
                                        <text x={mapa.escala.pixeles} y="-6" fontSize="11" fill="#14211b" textAnchor="end">{formatMeters(mapa.escala.metros)}</text>
                                    </g>
                                </svg>
                            </div>
                            <div className="inf-leyenda">
                                <span><i style={{ background: "transparent", border: "2px dashed #e0b32a" }} />Lindero de la finca</span>
                                {porFinalidad.map(x => <span key={x.f}><i style={{ background: COLOR_FINALIDAD[x.f] }} />{NOMBRE_FINALIDAD[x.f]}</span>)}
                                <span style={{ marginLeft: "auto" }}>Imagen satelital © Esri, Maxar, Earthstar Geographics</span>
                            </div>
                        </>
                    ) : (
                        <p className="inf-nota">La finca y sus lotes aún no tienen linderos georreferenciados.</p>
                    )}
                </section>

                {/* Composición del área */}
                <section className="inf-sec">
                    <h2><span className="num">2</span> Composición del área</h2>
                    <div className="inf-barra" aria-hidden>
                        {porFinalidad.map(x => <span key={x.f} style={{ width: `${(x.ha / baseComp) * 100}%`, background: COLOR_FINALIDAD[x.f] }} />)}
                        {sinAsignar > 0 && <span style={{ width: `${(sinAsignar / baseComp) * 100}%`, background: "#e5e9e7" }} />}
                    </div>
                    <div className="inf-comp">
                        {porFinalidad.map(x => (
                            <div key={x.f}><span><span className="inf-punto" style={{ background: COLOR_FINALIDAD[x.f] }} />{NOMBRE_FINALIDAD[x.f]} ({x.n})</span><b>{formatHa(x.ha)} · {Math.round((x.ha / baseComp) * 100)} %</b></div>
                        ))}
                        <div><span><span className="inf-punto" style={{ background: "#e5e9e7" }} />Sin asignar</span><b>{formatHa(sinAsignar)} · {Math.round((sinAsignar / baseComp) * 100)} %</b></div>
                    </div>
                </section>

                {/* Lotes */}
                <section className="inf-sec permitir-corte">
                    <h2><span className="num">3</span> Lotes de la finca</h2>
                    <table className="inf-tabla">
                        <thead>
                            <tr>
                                <th>Lote</th><th>Uso / cultivo</th><th>Material</th>
                                <th className="der">Área</th><th className="der">Plantas</th><th className="der">Dens.</th><th>Edad</th><th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lotes.map(l => {
                                const uso = describirUso(l)
                                return (
                                    <tr key={l.id}>
                                        <td><b>{l.codigo}</b><span className="sub">{l.nombre}</span></td>
                                        <td><span className="inf-punto" style={{ background: COLOR_FINALIDAD[l.finalidad] }} />{uso.titulo}
                                            {l.finalidad !== "SIEMBRA" && uso.detalle && <span className="sub">{uso.detalle}</span>}
                                            {l.finalidad === "SIEMBRA" && l.especie && <span className="sub"><i>{l.especie}</i></span>}</td>
                                        <td>{l.finalidad === "SIEMBRA" ? (l.variedad ? describirMaterial(l, { conCasa: false }) : "—") : l.finalidad === "VIVERO" ? `${l.materialesVivero.length} material(es)` : "—"}
                                            {l.finalidad === "SIEMBRA" && l.casaGenetica && <span className="sub">{l.casaGenetica}</span>}</td>
                                        <td className="der">{formatHa(l.area)}{l.areaMedidaHa == null && <span className="sub">registrada</span>}</td>
                                        <td className="der">{formatEntero(l.finalidad === "VIVERO" ? l.plantasVivero : l.numeroPlantas)}</td>
                                        <td className="der">{l.densidad ? Math.round(l.densidad) : "—"}</td>
                                        <td>{l.finalidad === "SIEMBRA" ? textoEdad(l.edad) : "—"}{l.fechaSiembra && <span className="sub">{formatDate(l.fechaSiembra)}</span>}</td>
                                        <td>{ESTADO_LOTE[l.estado]}<span className="sub">{l.metodoGeorreferenciacion ? METODO_LABELS[l.metodoGeorreferenciacion] : "Sin lindero"}</span></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3}>Total ({lotes.length} lotes)</td>
                                <td className="der">{formatHa(areaLotes)}</td>
                                <td className="der">{formatEntero(plantasSembradas + plantasVivero)}</td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    </table>
                    <p className="inf-nota">Dens. = plantas por hectárea. El área es la medida con el lindero cuando existe; si no, la registrada.</p>
                </section>

                {/* Inventario de plantas por material */}
                {inventario.length > 0 && (
                    <section className="inf-sec">
                        <h2><span className="num">4</span> Inventario de plantas por material</h2>
                        <table className="inf-tabla">
                            <thead>
                                <tr><th>Material</th><th>Casa genética</th><th className="der">En campo</th><th className="der">Previvero</th><th className="der">Vivero</th><th className="der">Lista siembra</th><th className="der">Total</th></tr>
                            </thead>
                            <tbody>
                                {inventario.map(m => (
                                    <tr key={[m.cultivo, m.especie, m.material, m.casa].join("|")}>
                                        <td><b>{m.material}</b><span className="sub">{m.cultivo}{m.especie ? ` · ${m.especie}` : ""}</span></td>
                                        <td>{m.casa || "—"}</td>
                                        <td className="der">{m.campo ? formatEntero(m.campo) : "—"}</td>
                                        <td className="der">{m.previvero ? formatEntero(m.previvero) : "—"}</td>
                                        <td className="der">{m.vivero ? formatEntero(m.vivero) : "—"}</td>
                                        <td className="der">{m.lista ? formatEntero(m.lista) : "—"}</td>
                                        <td className="der"><b>{formatEntero(m.campo + m.previvero + m.vivero + m.lista)}</b></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2}>Total</td>
                                    {(["campo", "previvero", "vivero", "lista"] as const).map(k => { const t = inventario.reduce((s, m) => s + m[k], 0); return <td key={k} className="der">{t ? formatEntero(t) : "—"}</td> })}
                                    <td className="der">{formatEntero(plantasSembradas + plantasVivero)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                )}

                {/* Viveros */}
                {lotes.filter(l => l.finalidad === "VIVERO" && l.materialesVivero.length).map(l => (
                    <section key={l.id} className="inf-sec permitir-corte">
                        <h2><span className="num">5</span> Vivero {l.codigo} · {l.nombre}</h2>
                        <table className="inf-tabla">
                            <thead><tr><th>Material</th><th>Casa genética</th><th>Ubicación</th><th>Ingreso</th><th>Edad</th><th className="der">Plantas</th></tr></thead>
                            {ETAPAS_VIVERO.map(e => {
                                const items = l.materialesVivero.filter(m => m.etapa === e.valor)
                                if (!items.length) return null
                                return (
                                    <tbody key={e.valor}>
                                        <tr className="grupo"><td colSpan={5}>{e.nombre}</td><td className="der">{formatEntero(items.reduce((s, m) => s + m.cantidad, 0))}</td></tr>
                                        {items.map(m => (
                                            <tr key={m.id}>
                                                <td><b>{m.variedad ? describirMaterial({ variedad: m.variedad, opcionesGeneticas: m.opcionesGeneticas }, { conCasa: false }) : m.tipoCultivo}</b><span className="sub">{m.tipoCultivo}{m.especie ? ` · ${m.especie}` : ""}</span></td>
                                                <td>{m.casaGenetica || "—"}</td>
                                                <td>{m.ubicacion || "—"}</td>
                                                <td>{m.fechaIngreso ? formatDate(m.fechaIngreso) : "—"}</td>
                                                <td>{textoEdad(edadMeses(m.fechaIngreso))}</td>
                                                <td className="der">{formatEntero(m.cantidad)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                )
                            })}
                            <tfoot><tr><td colSpan={5}>Total del vivero</td><td className="der">{formatEntero(l.plantasVivero)}</td></tr></tfoot>
                        </table>
                    </section>
                ))}

                {/* Tareas */}
                <section className="inf-sec">
                    <h2><span className="num">6</span> Labores y tareas</h2>
                    <div className="inf-estados">
                        <div className="inf-estado"><b>{conteo.PROGRAMADA}</b><span>Programadas</span></div>
                        <div className="inf-estado"><b>{conteo.EN_PROCESO}</b><span>En proceso</span></div>
                        <div className="inf-estado"><b>{conteo.EJECUTADA}</b><span>Ejecutadas</span></div>
                        <div className="inf-estado"><b>{conteo.CANCELADA}</b><span>Canceladas</span></div>
                        <div className={`inf-estado${atrasadas.length ? " alerta" : ""}`}><b>{atrasadas.length}</b><span>Atrasadas</span></div>
                    </div>
                    <div className="inf-dos">
                        <div>
                            <div className="inf-kpi-l" style={{ marginBottom: 4 }}>Próximas tareas</div>
                            {proximas.length ? (
                                <table className="inf-tabla">
                                    <tbody>{proximas.map(t => (
                                        <tr key={t.id}><td style={{ whiteSpace: "nowrap" }}>{formatDate(t.fechaProgramada)}</td><td><b>{t.tipo}</b><span className="sub">{t.lote ? `${t.lote.codigo} ${t.lote.nombre}` : "Toda la finca"} · {t.responsable}</span></td></tr>
                                    ))}</tbody>
                                </table>
                            ) : <p className="inf-nota">No hay tareas programadas a futuro.</p>}
                        </div>
                        <div>
                            <div className="inf-kpi-l" style={{ marginBottom: 4 }}>Últimas ejecutadas</div>
                            {recientes.length ? (
                                <table className="inf-tabla">
                                    <tbody>{recientes.map(t => (
                                        <tr key={t.id}><td style={{ whiteSpace: "nowrap" }}>{formatDate(t.fechaEjecucion ?? t.fechaProgramada)}</td><td><b>{t.tipo}</b><span className="sub">{t.lote ? `${t.lote.codigo} ${t.lote.nombre}` : "Toda la finca"} · {t.responsable}</span></td></tr>
                                    ))}</tbody>
                                </table>
                            ) : <p className="inf-nota">Aún no hay tareas ejecutadas.</p>}
                        </div>
                    </div>
                </section>

                {/* Ficha y puntos de atención */}
                <section className="inf-sec">
                    <div className="inf-dos">
                        <div>
                            <h2><span className="num">7</span> Ficha de la finca</h2>
                            <table className="inf-ficha"><tbody>
                                <tr><td>Código</td><td>{finca.codigo}</td></tr>
                                <tr><td>Ubicación</td><td>{finca.veredaSector}, {finca.municipio} ({finca.departamento})</td></tr>
                                <tr><td>Coordenadas (centro)</td><td>{finca.latitud != null && finca.longitud != null ? `${finca.latitud.toFixed(5)}, ${finca.longitud.toFixed(5)}` : "—"}</td></tr>
                                <tr><td>Responsable</td><td>{finca.responsable}</td></tr>
                                <tr><td>Registrada</td><td>{formatDate(finca.createdAt)}</td></tr>
                                <tr><td>Georreferenciación</td><td>{finca.metodoGeorreferenciacion ? METODO_LABELS[finca.metodoGeorreferenciacion] : "Pendiente"}{finca.precisionM != null ? ` (±${finca.precisionM.toFixed(1)} m)` : ""}</td></tr>
                                <tr><td>Perímetro</td><td>{finca.perimetroM ? formatMeters(finca.perimetroM) : "—"}</td></tr>
                            </tbody></table>
                            {finca.observaciones && <p className="inf-nota" style={{ marginTop: 8 }}><b>Observaciones:</b> {finca.observaciones}</p>}
                        </div>
                        <div>
                            <h2><span className="num">8</span> Puntos de atención</h2>
                            <ul className="inf-alertas">
                                {alertas.length ? alertas.map((a, i) => <li key={i}>{a}</li>) : <li className="ok">La información de la finca está completa y no hay tareas atrasadas.</li>}
                            </ul>
                        </div>
                    </div>
                </section>

                <div className="inf-pie">
                    <span>Generado por AgroApp el {hoy.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Bogota" })}</span>
                    <span>Los datos reflejan lo registrado en el sistema a esa fecha.</span>
                </div>
            </div>
        </div>
    )
}
