// Constancia de entrega de plántulas en PDF (carta, una página), generada en el celular con jsPDF.
// Mismo diseño del prototipo del contador: membrete de Villa Lida, conteos agrupados por variedad
// y las dos firmas. jsPDF no justifica texto, así que los párrafos se justifican aquí.

export interface FirmaDibujada { data: string; w: number; h: number }

export interface DatosConstancia {
    cliente: string
    cedula: string
    celular?: string
    representante: string
    placas?: string
    /** Código del movimiento (MV-001) */
    codigo?: string
    conteos: { variedad: string; cantidad: number; ts: number }[]
    firmaRepresentante?: FirmaDibujada | null
    firmaCliente?: FirmaDibujada | null
    /** Logo de Villa Lida como data URL PNG */
    logo: string
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const pad2 = (n: number) => (n < 10 ? "0" : "") + n
const fecha = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
const hora = (d: Date) => `${pad2(d.getHours() % 12 || 12)}:${pad2(d.getMinutes())} ${d.getHours() < 12 ? "a. m." : "p. m."}`
const unirEs = (a: string[]) => (a.length < 2 ? a[0] ?? "" : a.slice(0, -1).join(", ") + " y " + a[a.length - 1])
const miles = (n: number) => n.toLocaleString("es-CO")

type Segmento = { t: string; b?: boolean; i?: boolean }
type RGB = [number, number, number]

/** La constancia debe caber en una página: si no cabe, se compacta letra y espacios por pasos. */
export async function generarConstancia(d: DatosConstancia): Promise<Blob> {
    const { jsPDF } = await import("jspdf")
    let doc = construir(new jsPDF({ unit: "pt", format: "letter" }), d, 1)
    for (const escala of [0.92, 0.85, 0.78]) {
        if (doc.getNumberOfPages() === 1) break
        doc = construir(new jsPDF({ unit: "pt", format: "letter" }), d, escala)
    }
    return doc.output("blob")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function construir(doc: any, d: DatosConstancia, escala: number) {
    const W = 612, H = 792, cm = 28.3465
    const DG: RGB = [20, 57, 31], G: RGB = [31, 90, 45], GOLD: RGB = [201, 162, 39], LG: RGB = [230, 241, 227]
    const fc = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
    const dc = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
    const tc = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
    const RAT = 0.9675

    function membrete() {
        fc(DG); doc.rect(0, 0, W, 0.9 * cm, "F")
        fc(GOLD); doc.rect(0, 0.9 * cm, W, 0.14 * cm, "F")
        dc(GOLD); doc.setLineWidth(0.9)
        doc.roundedRect(1.1 * cm, 1.45 * cm, W - 2.2 * cm, H - 2.75 * cm - 1.45 * cm, 0.3 * cm, 0.3 * cm, "S")
        dc(G); doc.setLineWidth(0.4)
        doc.roundedRect(1.25 * cm, 1.6 * cm, W - 2.5 * cm, H - 2.9 * cm - 1.6 * cm, 0.22 * cm, 0.22 * cm, "S")
        const lh = 3.2 * cm, lw = lh / RAT
        doc.addImage(d.logo, "PNG", 2.1 * cm, 1.75 * cm, lw, lh)
        const x = 2.1 * cm + lw + 0.7 * cm
        doc.setFont("times", "bold"); doc.setFontSize(19); tc(G); doc.text("VIVERO DE PALMA DE ACEITE", x, 2.75 * cm)
        doc.setFontSize(26); tc(DG); doc.text("VILLA LIDA", x, 3.65 * cm)
        doc.setFont("times", "italic"); doc.setFontSize(11.5); tc([138, 109, 18]); doc.text("Calidad que produce futuro", x, 4.2 * cm)
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); tc([51, 51, 51])
        doc.text("Vereda Totumito, Tamalameque, Cesar  |  WhatsApp 311 200 3224", x, 4.75 * cm)
        dc(G); doc.setLineWidth(1.6); doc.line(2.1 * cm, 5.35 * cm, W - 2.1 * cm, 5.35 * cm)
        dc(GOLD); doc.setLineWidth(0.6); doc.line(2.1 * cm, 5.35 * cm + 0.12 * cm, W - 2.1 * cm, 5.35 * cm + 0.12 * cm)
        fc(DG); doc.rect(0, H - 2.15 * cm, W, 2.15 * cm, "F")
        fc(GOLD); doc.rect(0, H - 2.15 * cm - 0.12 * cm, W, 0.12 * cm, "F")
        fc(GOLD); doc.circle(2.0 * cm, H - 1.35 * cm, 0.2 * cm, "F"); fc(DG); doc.circle(2.0 * cm, H - 1.35 * cm, 0.07 * cm, "F")
        tc([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5)
        doc.text("Vereda Totumito, Tamalameque, Cesar", 2.5 * cm, H - 1.3 * cm)
        doc.setFont("helvetica", "normal"); doc.setFontSize(8)
        doc.text("Ingreso por el frigorífico de Pailitas, a 200 m del caserío de Totumito.", 2.5 * cm, H - 0.82 * cm)
        dc(GOLD); doc.setLineWidth(0.8); doc.line(12 * cm, H - 0.55 * cm, 12 * cm, H - 1.65 * cm)
        tc([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text("Yenriht Reyes", 12.4 * cm, H - 1.3 * cm)
        doc.setFontSize(11); tc(GOLD); doc.text("WhatsApp  311 200 3224", 12.4 * cm, H - 0.82 * cm)
    }
    membrete()

    const X0 = 2.4 * cm, CW = W - 4.8 * cm, TOP = 5.95 * cm, BOT = H - 3.3 * cm
    const FS = 10.6 * escala, LEAD = 13.6 * escala
    let y = TOP
    const cabe = (h: number) => { if (y + h > BOT) { doc.addPage(); membrete(); y = TOP; return true } return false }

    function palabras(segs: Segmento[]) {
        const out: { w: string; b: boolean; i: boolean; wd: number; pegada: boolean }[] = []
        let prevFin = true
        for (const sg of segs) {
            doc.setFont("times", sg.b ? "bold" : sg.i ? "italic" : "normal"); doc.setFontSize(FS)
            const empiezaEsp = /^\s/.test(sg.t)
            let primera = true
            for (const w of sg.t.split(/\s+/).filter(Boolean)) {
                const pegada = primera && !empiezaEsp && !prevFin && out.length > 0
                primera = false
                out.push({ w, b: !!sg.b, i: !!sg.i, wd: doc.getTextWidth(w), pegada })
            }
            prevFin = /\s$/.test(sg.t)
        }
        return out
    }

    function parrafo(segs: Segmento[], justificar = false) {
        const ws = palabras(segs)
        doc.setFont("times", "normal"); doc.setFontSize(FS)
        const esp = doc.getTextWidth(" ")
        const lineas: typeof ws[] = []
        let cur: typeof ws = [], cw = 0
        for (const o of ws) {
            const add = (cur.length && !o.pegada ? esp : 0) + o.wd
            if (cw + add > CW && cur.length) { lineas.push(cur); cur = [o]; cw = o.wd } else { cur.push(o); cw += add }
        }
        if (cur.length) lineas.push(cur)
        lineas.forEach((ln, idx) => {
            cabe(LEAD)
            let tw = 0, huecos = 0
            ln.forEach((o, k) => { tw += o.wd; if (k > 0 && !o.pegada) huecos++ })
            const hueco = justificar && idx < lineas.length - 1 && huecos > 0 ? (CW - tw) / huecos : esp
            let x = X0
            ln.forEach((o, k) => {
                if (k > 0 && !o.pegada) x += hueco
                doc.setFont("times", o.b ? "bold" : o.i ? "italic" : "normal"); doc.setFontSize(FS); tc([0, 0, 0])
                doc.text(o.w, x, y + FS)
                x += o.wd
            })
            y += LEAD
        })
    }
    const espacio = (n: number) => { y += n * escala }

    const items = d.conteos
    const primero = new Date(items[0].ts), ultimo = new Date(items[items.length - 1].ts)
    const mismoDia = primero.toDateString() === ultimo.toDateString()
    const entrega = mismoDia ? `el día ${fecha(primero)}` : `entre el ${fecha(primero)} y el ${fecha(ultimo)}`
    const grupos: { v: string; filas: { c: typeof items[number]; i: number }[]; total: number }[] = []
    items.forEach((c, i) => {
        let g = grupos.find(x => x.v === c.variedad)
        if (!g) { g = { v: c.variedad, filas: [], total: 0 }; grupos.push(g) }
        g.filas.push({ c, i }); g.total += c.cantidad
    })
    const total = items.reduce((s, c) => s + c.cantidad, 0)

    const hoy = new Date()
    parrafo([{ t: fecha(hoy) + (d.codigo ? `     Ref. ${d.codigo}` : "") }]); espacio(8)
    parrafo([{ t: "Señor(a)" }]); parrafo([{ t: d.cliente.toUpperCase(), b: true }]); parrafo([{ t: "Cliente" }]); espacio(8)
    parrafo([{ t: "Asunto:", b: true }, { t: ` Constancia de entrega de plántulas de palma de aceite, ${grupos.length > 1 ? "variedades " : "variedad "}${unirEs(grupos.map(g => g.v))}` }]); espacio(8)
    parrafo([{ t: "Cordial saludo:" }]); espacio(6)
    const intro: Segmento[] = grupos.length === 1
        ? [{ t: `Por medio de la presente, el Vivero de Palma de Aceite Villa Lida certifica que ${entrega} le hizo entrega, en calidad de cliente, de ` }, { t: `${miles(total)} plántulas de palma de aceite de la variedad ${grupos[0].v}`, b: true }, { t: "." }]
        : [{ t: `Por medio de la presente, el Vivero de Palma de Aceite Villa Lida certifica que ${entrega} le hizo entrega, en calidad de cliente, de ` }, { t: `${miles(total)} plántulas de palma de aceite`, b: true },
        { t: `, correspondientes a ${grupos.length} variedades: ${unirEs(grupos.map(g => `${miles(g.total)} de la variedad ${g.v}`))}.` }]
    parrafo(intro, true); espacio(6)
    const camion: Segmento[] = d.placas ? [{ t: " y se cargaron en el camión de placas " }, { t: d.placas, b: true }, { t: "." }] : [{ t: " y se cargaron en el camión." }]
    parrafo([{ t: "Las plántulas fueron contadas en conteos sucesivos, identificados por variedad, a medida que ingresaron a la estación de carga" }, ...camion,
    { t: " Los conteos se realizaron con la presencia de personal del Vivero de Palma de Aceite Villa Lida y de personal del cliente. El detalle de la entrega es el siguiente:" }], true)
    espacio(8)

    const cols = [3 * cm, 6.2 * cm, 3 * cm, 3 * cm], tw = cols.reduce((a, b) => a + b), TX = X0 + (CW - tw) / 2, RH = 15.5 * escala
    function fila(celdas: (string | number)[], tipo: "head" | "body" | "var" | "sub" | "total") {
        if (tipo === "total" || tipo === "sub") { fc(LG); doc.rect(TX, y, tw, RH, "F") }
        else if (tipo === "head") { fc(G); doc.rect(TX, y, tw, RH, "F") }
        else if (tipo === "var") { fc([245, 232, 185]); doc.rect(TX, y, tw, RH, "F") }
        dc([155, 181, 159]); doc.setLineWidth(0.5)
        if (tipo === "total" || tipo === "sub") {
            doc.rect(TX, y, cols[0] + cols[1], RH, "S"); doc.rect(TX + cols[0] + cols[1], y, cols[2], RH, "S"); doc.rect(TX + cols[0] + cols[1] + cols[2], y, cols[3], RH, "S")
        } else if (tipo === "var") doc.rect(TX, y, tw, RH, "S")
        else { let x = TX; cols.forEach(w => { doc.rect(x, y, w, RH, "S"); x += w }) }
        doc.setFont("times", tipo === "body" ? "normal" : "bold"); doc.setFontSize((tipo === "total" ? 11 : 10.3) * escala)
        const base = y + 11 * escala
        tc(tipo === "head" ? [255, 255, 255] : [0, 0, 0])
        if (tipo === "total" || tipo === "sub") {
            doc.text(String(celdas[0]), TX + (cols[0] + cols[1]) / 2, base, { align: "center" })
            doc.text(String(celdas[2]), TX + cols[0] + cols[1] + cols[2] / 2, base, { align: "center" })
        } else if (tipo === "var") doc.text(String(celdas[0]), TX + 8, base)
        else { let cx = TX; celdas.forEach((c, i) => { doc.text(String(c), cx + cols[i] / 2, base, { align: "center" }); cx += cols[i] }) }
        y += RH
    }
    const encabezado = () => fila(["Conteo", "Ingreso a la estación de carga", "Plántulas", "Acumulado"], "head")
    cabe(RH * 4); encabezado()
    for (const g of grupos) {
        if (cabe(RH * 3)) encabezado()
        fila([`Variedad: ${g.v}`], "var")
        let acum = 0
        for (const o of g.filas) {
            if (cabe(RH * 2)) encabezado()
            acum += o.c.cantidad
            const t = new Date(o.c.ts)
            fila([`#${o.i + 1}`, (mismoDia ? "" : `${t.getDate()} ${MESES[t.getMonth()].slice(0, 3)} · `) + hora(t), miles(o.c.cantidad), miles(acum)], "body")
        }
        if (cabe(RH * 2)) encabezado()
        fila([`Subtotal ${g.v}`, "", miles(g.total), ""], "sub")
    }
    if (cabe(RH * 2)) encabezado()
    fila(["Total entregado", "", miles(total), ""], "total")
    espacio(10)
    parrafo([{ t: "La presente constancia se expide en la fecha indicada como soporte de la entrega realizada. Agradecemos la confianza depositada en nuestro vivero y reiteramos nuestro compromiso con la calidad del material vegetal que entregamos." }], true)
    espacio(8)
    parrafo([{ t: "Cordialmente," }]); espacio(6)

    cabe(5.2 * cm * escala)
    const colW = (CW - 1.2 * cm) / 2, xs = [X0, X0 + colW + 1.2 * cm], sy = y + 2.5 * cm * escala
    function bloqueFirma(i: number, firma: FirmaDibujada | null | undefined, nombre: string, cc: string, rol: string) {
        const x = xs[i]
        if (firma) {
            const mw = colW * 0.9, mh = 2.3 * cm * escala, r = firma.w / firma.h
            let w = mw, h = w / r
            if (h > mh) { h = mh; w = h * r }
            doc.addImage(firma.data, "PNG", x + (colW - w) / 2, sy - h - 2, w, h)
        }
        dc([0, 0, 0]); doc.setLineWidth(0.7); doc.line(x, sy, x + colW, sy)
        let ty = sy + 11
        doc.setFont("times", "bold"); doc.setFontSize(10.2); tc([0, 0, 0])
        for (const l of doc.splitTextToSize(nombre.toUpperCase(), colW)) { doc.text(l, x, ty); ty += 12 }
        doc.setFont("times", "normal"); doc.setFontSize(9.8)
        if (cc) { doc.text(`C.C. ${cc}`, x, ty); ty += 12 }
        if (d.celular && i === 1) { doc.text(`Cel. ${d.celular}`, x, ty); ty += 12 }
        for (const l of doc.splitTextToSize(rol, colW)) { doc.text(l, x, ty); ty += 11.5 }
    }
    bloqueFirma(0, d.firmaRepresentante, d.representante, "", "Representante de Vivero de Palma de Aceite Villa Lida (entrega)")
    bloqueFirma(1, d.firmaCliente, d.cliente, d.cedula, "Cliente (recibe a conformidad)")

    return doc
}

/** Nombre del archivo de la constancia. */
export const nombreConstancia = (cliente: string) =>
    `Constancia_entrega_${cliente.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]+/g, "_").slice(0, 40)}.pdf`
