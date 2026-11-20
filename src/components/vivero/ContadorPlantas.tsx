'use client'

// Contador de plantas para la salida de plántulas del vivero (adaptado del prototipo de Villa Lida).
// Un botón gigante suma de a uno con vibración y voz; el trabajo se divide en conteos (#1, #2…),
// cada uno de un renglón del inventario. Al final registra el movimiento de la tarea, descuenta el
// inventario y, en ventas, genera la constancia PDF firmada y el mensaje de WhatsApp para el cliente.
// Lo contado se guarda en el teléfono mientras tanto, por si no hay señal o se cierra la página.

import "./contador.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { registrarMovimientoDeTarea, guardarConstancia } from "@/app/actions/vivero"
import { MODOS_SONIDO, VozContador, type ModoSonido } from "@/lib/contador/voz"
import { generarConstancia, nombreConstancia, type FirmaDibujada } from "@/lib/contador/constancia"
import { enlaceWhatsApp, mensajeConstanciaEntrega } from "@/lib/whatsapp"
import { infoMovimiento, formatPesos, type TipoMovimientoVivero } from "@/lib/vivero"

export interface RenglonContador {
    id: string
    /** "Deli x La Mé #S · Vivero · Ubic. 1" */
    descripcion: string
    /** "Deli x La Mé #S": agrupa precios y la constancia */
    variedad: string
    disponibles: number
}

interface Conteo { materialId: string; n: number; ts: number; nota: string }
interface Estado {
    n: number
    saved: Conteo[]
    cur: string
    cliente: { nombre: string; cc: string; cel: string; placas: string }
    precios: Record<string, string>
    destino: string
    firmas: { R: FirmaDibujada | null; C: FirmaDibujada | null }
}

const CLAVE_MODO = "agroapp-contador-modo"
const CLAVE_REP = "agroapp-contador-rep"
const ICONO_MODO: Record<ModoSonido, string> = { voz: "🗣️", pitido: "🔊", silencio: "🔇" }
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const miles = (n: number) => n.toLocaleString("es-CO")
const horaCorta = (ts: number) => new Date(ts).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
const aNumero = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", ".")))

function leer<T>(clave: string, defecto: T): T {
    try { const r = localStorage.getItem(clave); return r ? { ...defecto, ...JSON.parse(r) } : defecto } catch { return defecto }
}

export function ContadorPlantas({ tareaId, tareaCodigo, tipo, materiales, representanteInicial, volverA }: {
    tareaId: string
    tareaCodigo: string
    tipo: TipoMovimientoVivero
    materiales: RenglonContador[]
    representanteInicial: string
    volverA: string
}) {
    const info = infoMovimiento(tipo)
    const esVenta = tipo === "VENTA"
    const CLAVE = `agroapp-contador-${tareaId}`
    const inicial: Estado = useMemo(() => ({
        n: 0, saved: [], cur: materiales.find(m => m.disponibles > 0)?.id ?? materiales[0]?.id ?? "",
        cliente: { nombre: "", cc: "", cel: "", placas: "" }, precios: {}, destino: "", firmas: { R: null, C: null },
    }), [materiales])

    const [st, setSt] = useState<Estado>(inicial)
    const [rep, setRep] = useState(representanteInicial)
    const [modo, setModo] = useState<ModoSonido>("voz")
    const [cargado, setCargado] = useState(false)
    const [detalle, setDetalle] = useState(false)
    const [selector, setSelector] = useState<null | { conteo: number | null }>(null)
    const [editar, setEditar] = useState<null | { i: number; n: string }>(null)
    const [pregunta, setPregunta] = useState<null | { msg: string; si: () => void; textoSi?: string }>(null)
    const [mensaje, setMensaje] = useState<null | { t: string; err?: boolean }>(null)
    const [enviando, setEnviando] = useState(false)
    const [resultado, setResultado] = useState<null | { codigo: string; total: number; pdf: Blob | null; pdfUrl: string | null; nombrePdf: string; wa: string | null; aviso?: string }>(null)
    const [firmando, setFirmando] = useState<null | "R" | "C">(null)
    const [nota, setNota] = useState("")
    const voz = useRef<VozContador | null>(null)
    const tapRef = useRef<HTMLButtonElement>(null)
    // Número del conteo en curso, al día aunque se toque más rápido de lo que la pantalla se redibuja
    const nRef = useRef(0)
    useEffect(() => { nRef.current = st.n }, [st.n])

    // Estado guardado en el teléfono (por tarea), modo de sonido y representante (para todas)
    useEffect(() => {
        setSt(leer(CLAVE, inicial))
        try {
            const m = localStorage.getItem(CLAVE_MODO) as ModoSonido | null
            if (m && MODOS_SONIDO.includes(m)) setModo(m)
            const r = localStorage.getItem(CLAVE_REP); if (r) setRep(r)
        } catch { }
        setCargado(true)
        voz.current = new VozContador()
    }, [CLAVE, inicial])
    useEffect(() => { if (cargado) try { localStorage.setItem(CLAVE, JSON.stringify(st)) } catch { } }, [st, cargado, CLAVE])
    useEffect(() => { if (cargado) try { localStorage.setItem(CLAVE_REP, rep) } catch { } }, [rep, cargado])

    const porId = useMemo(() => new Map(materiales.map(m => [m.id, m])), [materiales])
    const actual = porId.get(st.cur)
    const contadoDe = useCallback((id: string, conActual = true) =>
        st.saved.filter(s => s.materialId === id).reduce((a, s) => a + s.n, 0) + (conActual && st.cur === id ? st.n : 0), [st])
    const total = st.saved.reduce((a, s) => a + s.n, 0) + st.n
    const porVariedad = useMemo(() => {
        const m = new Map<string, number>()
        for (const s of st.saved) { const v = porId.get(s.materialId)?.variedad ?? "Material"; m.set(v, (m.get(v) ?? 0) + s.n) }
        return [...m.entries()]
    }, [st.saved, porId])

    const sonar = (n: number) => voz.current?.avisar(n, modo)
    const vibrar = () => { try { navigator.vibrate?.(15) } catch { } }

    // El toque cuenta en pointerdown: responde de inmediato aunque se toque varias veces por segundo
    useEffect(() => {
        const b = tapRef.current
        if (!b) return
        const toque = (e: PointerEvent) => {
            e.preventDefault()
            const n = ++nRef.current
            setSt(s => ({ ...s, n }))
            sonar(n)
            vibrar()
            b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 70)
        }
        b.addEventListener("pointerdown", toque)
        return () => b.removeEventListener("pointerdown", toque)
    })

    const cambiarModo = () => {
        const m = MODOS_SONIDO[(MODOS_SONIDO.indexOf(modo) + 1) % MODOS_SONIDO.length]
        setModo(m)
        try { localStorage.setItem(CLAVE_MODO, m) } catch { }
        if (m === "voz") voz.current?.decir(st.n); else if (m === "pitido") voz.current?.pitar()
    }

    const terminarConteo = () => {
        if (st.n === 0) return
        setPregunta({
            msg: `¿Terminar el conteo #${st.saved.length + 1} de ${actual?.descripcion ?? "material"} con ${miles(st.n)} plantas?`,
            textoSi: "Sí, terminar",
            si: () => {
                setSt(s => ({ ...s, saved: [...s.saved, { materialId: s.cur, n: s.n, ts: Date.now(), nota: nota.trim() }], n: 0 }))
                setNota("")
            },
        })
    }

    // ── Registro final ──
    function validar(): string | null {
        if (st.n > 0) return `Tienes ${miles(st.n)} plantas sin terminar. Toca "Terminar conteo" y vuelve a intentar.`
        if (!st.saved.length) return "Aún no hay conteos terminados."
        for (const m of materiales) {
            const c = contadoDe(m.id, false)
            if (info.sentido === "salida" && c > m.disponibles) return `De ${m.descripcion} se contaron ${miles(c)} pero solo hay ${miles(m.disponibles)}.`
        }
        if (esVenta) {
            if (!st.cliente.nombre.trim()) return "Escribe el nombre del cliente."
            if (!st.cliente.cc.trim()) return "Escribe la cédula del cliente."
            if (!rep.trim()) return "Escribe el nombre de quien entrega por Villa Lida."
            for (const [v] of porVariedad) { const p = aNumero(st.precios[v] ?? ""); if (p == null || !Number.isFinite(p) || p < 0) return `Escribe el precio por planta de ${v}.` }
            if (!st.firmas.R) return "Falta la firma del representante de Villa Lida."
            if (!st.firmas.C) return "Falta la firma del cliente."
        } else if (info.pideDestino && !st.destino.trim()) return "Escribe a dónde salen las plantas."
        return null
    }

    function pedirRegistro() {
        const e = validar()
        if (e) { setMensaje({ t: e, err: true }); setDetalle(true); return }
        setMensaje(null)
        setPregunta({
            msg: `¿Registrar ${info.nombre.toLowerCase()} de ${miles(total)} plantas (${st.saved.length} conteos)? ${info.sentido === "salida" ? "Se descontarán" : "Se sumarán"} del inventario del vivero y la tarea quedará ejecutada.`,
            textoSi: "Sí, registrar",
            si: registrar,
        })
    }

    async function registrar() {
        if (enviando) return
        setEnviando(true)
        setMensaje({ t: "Registrando…" })
        const precios = Object.fromEntries(porVariedad.map(([v]) => [v, aNumero(st.precios[v] ?? "") ?? 0]))
        const res: { codigo?: string; movimientoId?: string; error?: string } = await registrarMovimientoDeTarea(tareaId, {
            fecha: hoyISO(),
            conteos: st.saved.map(s => ({ materialId: s.materialId, cantidad: s.n, cerradoEn: s.ts, nota: s.nota })),
            precios: esVenta ? precios : undefined,
            destino: st.destino,
            representante: rep,
            ...(esVenta ? {
                clienteNombre: st.cliente.nombre, clienteCedula: st.cliente.cc, clienteCelular: st.cliente.cel, placas: st.cliente.placas,
                firmaCliente: st.firmas.C?.data, firmaRepresentante: st.firmas.R?.data,
            } : {}),
        }).catch(() => ({ error: "No hay conexión. Lo contado sigue guardado en este teléfono: intenta de nuevo cuando haya señal." }))
        if (res.error || !res.codigo) {
            setMensaje({ t: res.error ?? "No se pudo registrar.", err: true }); setDetalle(true); setEnviando(false)
            return
        }

        let pdf: Blob | null = null, pdfUrl: string | null = null, aviso: string | undefined
        const nombrePdf = nombreConstancia(st.cliente.nombre || tareaCodigo)
        if (esVenta) {
            try {
                const logo = await fetch("/marca/villa-lida.png").then(r => r.blob()).then(b => new Promise<string>(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.readAsDataURL(b) }))
                pdf = await generarConstancia({
                    cliente: st.cliente.nombre.trim(), cedula: st.cliente.cc.trim(), celular: st.cliente.cel.trim(), representante: rep.trim(),
                    placas: st.cliente.placas.trim().toUpperCase(), codigo: res.codigo, logo,
                    conteos: st.saved.map(s => ({ variedad: porId.get(s.materialId)?.variedad ?? "Material", cantidad: s.n, ts: s.ts })),
                    firmaRepresentante: st.firmas.R, firmaCliente: st.firmas.C,
                })
                descargar(pdf, nombrePdf)
                const fd = new FormData(); fd.append("pdf", pdf, nombrePdf)
                const g: { url?: string; error?: string } = await guardarConstancia(res.movimientoId!, fd).catch(() => ({ error: "Sin conexión al guardar el PDF en la plataforma." }))
                if (g.url) pdfUrl = g.url; else aviso = g.error
            } catch (e) {
                aviso = `El movimiento quedó registrado, pero no se pudo generar el PDF (${(e as Error).message}).`
            }
        }
        const wa = esVenta ? enlaceWhatsApp(st.cliente.cel, mensajeConstanciaEntrega({ cliente: st.cliente.nombre.trim(), total, codigo: res.codigo, enlacePdf: pdfUrl })) : null
        try { localStorage.removeItem(CLAVE) } catch { }
        setResultado({ codigo: res.codigo, total, pdf, pdfUrl, nombrePdf, wa, aviso })
        setEnviando(false)
    }

    function descargar(blob: Blob, nombre: string) {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob); a.download = nombre
        document.body.appendChild(a); a.click()
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 4000)
    }

    async function compartir() {
        if (!resultado?.pdf) return
        const file = new File([resultado.pdf], resultado.nombrePdf, { type: "application/pdf" })
        try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Constancia de entrega" }) } catch { }
    }
    const puedeCompartir = typeof navigator !== "undefined" && !!resultado?.pdf && !!navigator.canShare?.({ files: [new File([resultado.pdf], "c.pdf", { type: "application/pdf" })] })

    if (!cargado) return <div className="contador" />

    if (resultado) {
        return (
            <div className="contador">
                <div className="resultado">
                    <div className="box">
                        <p style={{ marginBottom: 4 }}>✓ {info.nombre} registrada · <b>{resultado.codigo}</b></p>
                        <div className="grande">{miles(resultado.total)}</div>
                        <p style={{ fontSize: 14, color: "#8fa896" }}>plantas {info.sentido === "salida" ? "descontadas del" : "sumadas al"} inventario del vivero</p>
                        {resultado.aviso && <p className="msg err">{resultado.aviso}</p>}
                        {resultado.pdf && <p className="msg bien">La constancia quedó en Descargas: {resultado.nombrePdf}</p>}
                        {resultado.wa && <a className="btn wa" href={resultado.wa} target="_blank" rel="noopener">📲 Abrir WhatsApp del cliente</a>}
                        {resultado.wa && !resultado.pdfUrl && <p className="msg" style={{ color: "#8fa896" }}>En el chat toca 📎 y adjunta el PDF de Descargas.</p>}
                        {puedeCompartir && <button className="btn" onClick={compartir}>Compartir PDF (elige el chat)</button>}
                        {resultado.pdf && <button className="btn" onClick={() => descargar(resultado.pdf!, resultado.nombrePdf)}>Descargar PDF de nuevo</button>}
                        <a className="btn save" href={volverA} style={{ display: "block", textDecoration: "none", marginTop: 8 }}>Volver a la tarea</a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="contador">
            <div className="app">
                <div className="bar">
                    <a className="btn icono" href={volverA} aria-label="Volver a la tarea">✕</a>
                    <div className="sum"><span>TOTAL {tareaCodigo}<small>Conteo #{st.saved.length + 1} en curso</small></span><b>{miles(total)}</b></div>
                    <button className="btn icono" onClick={() => setDetalle(d => !d)}>{detalle ? "Ocultar ▴" : "Detalle ▾"}</button>
                </div>

                <button className="vchip" onClick={() => setSelector({ conteo: null })}>
                    <small>Material de este conteo (toca para cambiar)</small>
                    {actual ? actual.descripcion : "Elige el material"} ▾
                    {actual && <small className={contadoDe(actual.id) > actual.disponibles && info.sentido === "salida" ? "alerta" : ""}>
                        Disponibles: {miles(actual.disponibles)} · contadas: {miles(contadoDe(actual.id))}
                    </small>}
                </button>

                <div className={`detail${detalle ? " open" : ""}`}>
                    {mensaje && <div className={`msg ${mensaje.err ? "err" : "bien"}`} style={{ marginBottom: 8 }}>{mensaje.t}</div>}
                    <input placeholder="Nota del conteo (opcional)" maxLength={40} value={nota} onChange={e => setNota(e.target.value)} />
                    <div className="tools">
                        <button className="btn danger" onClick={() => st.n > 0 && setPregunta({ msg: `¿Reiniciar el conteo actual (${miles(st.n)})?`, si: () => setSt(s => ({ ...s, n: 0 })) })}>Reiniciar conteo</button>
                        <button className="btn danger" onClick={() => setPregunta({
                            msg: `¿Borrar todos los conteos (${st.saved.length}) y el total (${miles(total)}) para empezar desde cero?`,
                            si: () => setSt(s => ({ ...s, n: 0, saved: [] })),
                        })}>Nuevo conteo total</button>
                    </div>

                    <div className="caja">
                        <h3>{esVenta ? "Venta y constancia de entrega" : `${info.nombre}: datos`}</h3>
                        {esVenta ? (<>
                            <input placeholder="Nombre del cliente" maxLength={60} value={st.cliente.nombre} onChange={e => setSt(s => ({ ...s, cliente: { ...s.cliente, nombre: e.target.value } }))} />
                            <input placeholder="Cédula de ciudadanía del cliente" maxLength={16} inputMode="numeric" value={st.cliente.cc} onChange={e => setSt(s => ({ ...s, cliente: { ...s.cliente, cc: e.target.value } }))} />
                            <input placeholder="Celular del cliente (WhatsApp)" maxLength={16} inputMode="tel" value={st.cliente.cel} onChange={e => setSt(s => ({ ...s, cliente: { ...s.cliente, cel: e.target.value } }))} />
                            <input placeholder="Representante de Villa Lida que entrega" maxLength={60} value={rep} onChange={e => setRep(e.target.value)} />
                            <input placeholder="Placas del camión (opcional)" maxLength={12} value={st.cliente.placas} onChange={e => setSt(s => ({ ...s, cliente: { ...s.cliente, placas: e.target.value.toUpperCase() } }))} />
                            {porVariedad.length > 0 && <h3>Precio por planta</h3>}
                            {porVariedad.map(([v, n]) => {
                                const p = aNumero(st.precios[v] ?? "")
                                return (
                                    <div className="precio" key={v}>
                                        <span>{v}<br /><small style={{ color: "#8fa896" }}>{miles(n)} pl.{p != null && Number.isFinite(p) ? ` · ${formatPesos(p * n)}` : ""}</small></span>
                                        <input inputMode="decimal" placeholder="$ 0" value={st.precios[v] ?? ""} onChange={e => setSt(s => ({ ...s, precios: { ...s.precios, [v]: e.target.value.replace(/[^\d.,]/g, "") } }))} />
                                    </div>
                                )
                            })}
                            <div className="sigbtns">
                                <button className={`btn${st.firmas.R ? " ok" : ""}`} onClick={() => setFirmando("R")}>{st.firmas.R ? "✓" : "✍"} Firma representante</button>
                                <button className={`btn${st.firmas.C ? " ok" : ""}`} onClick={() => setFirmando("C")}>{st.firmas.C ? "✓" : "✍"} Firma cliente</button>
                            </div>
                        </>) : (<>
                            {info.pideDestino && <input placeholder="¿A dónde salen las plantas?" maxLength={120} value={st.destino} onChange={e => setSt(s => ({ ...s, destino: e.target.value }))} />}
                            <input placeholder="Quién entrega / registra" maxLength={60} value={rep} onChange={e => setRep(e.target.value)} />
                        </>)}
                        <button className="btn save" style={{ width: "100%" }} disabled={enviando} onClick={pedirRegistro}>
                            {enviando ? "Registrando…" : esVenta ? "Registrar venta y generar constancia" : `Registrar ${info.nombre.toLowerCase()}`}
                        </button>
                    </div>

                    {porVariedad.length > 0 && (<>
                        <h3>Por variedad</h3>
                        <div className="vsum">{porVariedad.map(([v, n]) => <div key={v}><span>{v}</span><b>{miles(n)}</b></div>)}</div>
                    </>)}
                    <h3>Conteos realizados</h3>
                    {st.saved.length === 0 ? <div className="empty">Aún no hay conteos terminados.</div> : (<>
                        {st.saved.map((s, i) => {
                            const acum = st.saved.slice(0, i + 1).reduce((a, x) => a + x.n, 0)
                            return (
                                <div className="item" key={i}>
                                    <div>Conteo #{i + 1}{s.nota ? ` · ${s.nota}` : ""}
                                        <small><span className="vlink" onClick={() => setSelector({ conteo: i })}>{porId.get(s.materialId)?.descripcion ?? "Material"}</span> · {horaCorta(s.ts)} · acum. {miles(acum)}</small>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <b>{miles(s.n)}</b>
                                        <button aria-label="Editar" onClick={() => setEditar({ i, n: String(s.n) })}>✎</button>
                                        <button aria-label="Borrar" onClick={() => setPregunta({ msg: `¿Borrar el conteo #${i + 1} (${miles(s.n)})?`, si: () => setSt(x => ({ ...x, saved: x.saved.filter((_, k) => k !== i) })) })}>✕</button>
                                    </div>
                                </div>
                            )
                        })}
                        <div className="total"><span>Total</span><span>{miles(st.saved.reduce((a, s) => a + s.n, 0))}</span></div>
                    </>)}
                </div>

                <div className="tapwrap">
                    <button className="snd" onClick={cambiarModo} aria-label={`Sonido: ${modo}`} title={modo}>{ICONO_MODO[modo]}</button>
                    <button className="tap" ref={tapRef} onClick={e => e.preventDefault()} disabled={!actual}>
                        <span className="n">{miles(st.n)}</span><span className="h">toca para contar +1</span>
                    </button>
                </div>
                <div className="row">
                    <button className="btn" onClick={() => { if (st.n > 0) { const n = st.n - 1; setSt(s => ({ ...s, n })); sonar(n) } }}>↩ Quitar 1</button>
                    <button className="btn save" onClick={terminarConteo}>Terminar conteo</button>
                </div>
            </div>

            {selector && (
                <div className="confirm" onClick={e => e.target === e.currentTarget && setSelector(null)}>
                    <div className="box">
                        <p>{selector.conteo === null ? `Material del conteo #${st.saved.length + 1}` : `Material del conteo #${selector.conteo + 1}`}</p>
                        {materiales.map(m => {
                            const sel = selector.conteo === null ? st.cur === m.id : st.saved[selector.conteo]?.materialId === m.id
                            const quedan = m.disponibles - contadoDe(m.id)
                            return (
                                <div className="vopt" key={m.id}>
                                    <button className={`btn${sel ? " sel" : ""}`} onClick={() => {
                                        setSt(s => selector.conteo === null ? { ...s, cur: m.id } : { ...s, saved: s.saved.map((x, k) => k === selector.conteo ? { ...x, materialId: m.id } : x) })
                                        setSelector(null)
                                    }}>
                                        {sel ? "✓ " : ""}{m.descripcion}
                                        <small>Disponibles {miles(m.disponibles)}{info.sentido === "salida" ? ` · quedan ${miles(quedan)}` : ""}</small>
                                    </button>
                                </div>
                            )
                        })}
                        <div className="row"><button className="btn" onClick={() => setSelector(null)}>Cerrar</button></div>
                    </div>
                </div>
            )}

            {editar && (
                <div className="confirm">
                    <div className="box">
                        <p>Corregir el conteo #{editar.i + 1}</p>
                        <input inputMode="numeric" value={editar.n} onChange={e => setEditar({ ...editar, n: e.target.value.replace(/\D/g, "") })} />
                        <div className="row">
                            <button className="btn" onClick={() => setEditar(null)}>Cancelar</button>
                            <button className="btn save" onClick={() => {
                                const n = parseInt(editar.n || "0", 10)
                                if (n > 0) setSt(s => ({ ...s, saved: s.saved.map((x, k) => k === editar.i ? { ...x, n } : x) }))
                                setEditar(null)
                            }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {pregunta && (
                <div className="confirm">
                    <div className="box">
                        <p>{pregunta.msg}</p>
                        <div className="row">
                            <button className="btn" onClick={() => setPregunta(null)}>Cancelar</button>
                            <button className="btn save" onClick={() => { const f = pregunta.si; setPregunta(null); f() }}>{pregunta.textoSi ?? "Sí"}</button>
                        </div>
                    </div>
                </div>
            )}

            {firmando && (
                <LienzoFirma
                    titulo={firmando === "R" ? "Firma del representante de Villa Lida" : "Firma del cliente"}
                    onCancelar={() => setFirmando(null)}
                    onGuardar={f => { setSt(s => ({ ...s, firmas: { ...s.firmas, [firmando]: f } })); setFirmando(null) }}
                />
            )}
        </div>
    )
}

/**
 * Lienzo de firma a pantalla completa y en horizontal: pide pantalla completa y bloquea la orientación;
 * si el celular no lo permite, gira el lienzo con CSS. La firma se recorta al contorno de la tinta.
 */
function LienzoFirma({ titulo, onCancelar, onGuardar }: { titulo: string; onCancelar: () => void; onGuardar: (f: FirmaDibujada) => void }) {
    const ovRef = useRef<HTMLDivElement>(null)
    const cvRef = useRef<HTMLCanvasElement>(null)
    const dibujo = useRef({ drew: false, down: false, lx: 0, ly: 0 })

    useEffect(() => {
        const ov = ovRef.current!, cv = cvRef.current!
        let ctx: CanvasRenderingContext2D | null = null
        const acomodar = () => {
            const w = window.innerWidth, h = window.innerHeight
            const sp = (k: string, v: string) => ov.style.setProperty(k, v, "important")
            if (h > w) { sp("width", `${h}px`); sp("height", `${w}px`); sp("transform", "rotate(90deg) translateY(-100%)") }
            else { sp("width", `${w}px`); sp("height", `${h}px`); sp("transform", "none") }
            const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight
            if (!cw || !ch) return
            const previo = dibujo.current.drew ? cv.toDataURL() : null
            cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr)
            ctx = cv.getContext("2d")!
            ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2.6 * dpr; ctx.strokeStyle = "#10224a"; ctx.fillStyle = "#10224a"
            if (previo) { const im = new Image(); im.onload = () => ctx!.drawImage(im, 0, 0, cv.width, cv.height); im.src = previo }
        }
        const reintentar = () => { setTimeout(acomodar, 120); setTimeout(acomodar, 500) }
        try {
            ov.requestFullscreen?.().then(() => {
                const q = (screen.orientation as any)?.lock?.("landscape")
                if (q?.then) q.then(() => setTimeout(acomodar, 500), () => { document.exitFullscreen?.().catch(() => { }); reintentar() })
                else reintentar()
            }, () => { })
        } catch { }
        setTimeout(acomodar, 60); setTimeout(acomodar, 350)
        const onResize = () => setTimeout(acomodar, 80)
        window.addEventListener("resize", onResize)

        const pos = (e: PointerEvent) => { const k = cv.width / cv.clientWidth; return [e.offsetX * k, e.offsetY * k] }
        const abajo = (e: PointerEvent) => {
            if (!ctx) return
            e.preventDefault(); try { cv.setPointerCapture(e.pointerId) } catch { }
            const d = dibujo.current; d.down = true; [d.lx, d.ly] = pos(e)
            ctx.beginPath(); ctx.arc(d.lx, d.ly, ctx.lineWidth / 2, 0, 6.3); ctx.fill(); d.drew = true
        }
        const mover = (e: PointerEvent) => {
            const d = dibujo.current
            if (!d.down || !ctx) return
            e.preventDefault()
            const [x, y] = pos(e)
            ctx.beginPath(); ctx.moveTo(d.lx, d.ly); ctx.lineTo(x, y); ctx.stroke(); d.lx = x; d.ly = y
        }
        const arriba = () => { dibujo.current.down = false }
        cv.addEventListener("pointerdown", abajo); cv.addEventListener("pointermove", mover)
        cv.addEventListener("pointerup", arriba); cv.addEventListener("pointercancel", arriba); cv.addEventListener("pointerleave", arriba)
        return () => {
            window.removeEventListener("resize", onResize)
            cv.removeEventListener("pointerdown", abajo); cv.removeEventListener("pointermove", mover)
            cv.removeEventListener("pointerup", arriba); cv.removeEventListener("pointercancel", arriba); cv.removeEventListener("pointerleave", arriba)
            try { if (document.fullscreenElement) document.exitFullscreen() } catch { }
            try { (screen.orientation as any)?.unlock?.() } catch { }
        }
    }, [])

    function recortada(): FirmaDibujada | null {
        const cv = cvRef.current!, ctx = cv.getContext("2d")!
        const w = cv.width, h = cv.height, d = ctx.getImageData(0, 0, w, h).data
        let x0 = w, y0 = h, x1 = 0, y1 = 0
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
        if (x1 < x0) return null
        const pad = 8
        x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
        const c = document.createElement("canvas"); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1
        c.getContext("2d")!.drawImage(cv, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
        return { data: c.toDataURL("image/png"), w: c.width, h: c.height }
    }

    return (
        <div id="sigov" ref={ovRef}>
            <div className="sighead"><span>{titulo}</span><small>Firma con el dedo dentro del recuadro</small></div>
            <canvas id="sigc" ref={cvRef} />
            <div className="sigfoot">
                <button className="btn" onClick={onCancelar}>Cancelar</button>
                <button className="btn danger" onClick={() => { const cv = cvRef.current!; cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height); dibujo.current.drew = false }}>Borrar</button>
                <button className="btn save" onClick={() => { const f = dibujo.current.drew ? recortada() : null; if (f) onGuardar(f) }}>Guardar firma</button>
            </div>
        </div>
    )
}
