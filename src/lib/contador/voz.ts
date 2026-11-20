// Voz del contador de plantas: dice el número en voz alta con clips grabados (voz neuronal) en
// /voces/0.mp3 … 600.mp3, más 700, 800, 900 y 1000 para componer los números mayores.
// Usa WebAudio para que el sonido no se corte ni se retrase al tocar rápido; si un clip falla, pita.

export type ModoSonido = "voz" | "pitido" | "silencio"
export const MODOS_SONIDO: ModoSonido[] = ["voz", "pitido", "silencio"]

/** Clips que forman un número: 735 → [700, 35]; 2150 → [2, 1000, 100, 50]. */
export function partes(n: number): number[] {
    if (n <= 600) return [n]
    if (n < 1000) {
        const h = Math.floor(n / 100) * 100, r = n % 100
        return r ? [h, r] : [h]
    }
    const miles = Math.floor(n / 1000), resto = n % 1000
    const out = miles === 1 ? [1000] : [...partes(miles), 1000]
    return resto ? out.concat(partes(resto)) : out
}

export class VozContador {
    private ctx: AudioContext | null = null
    private clips = new Map<number, Promise<AudioBuffer>>()
    private sonando: AudioBufferSourceNode[] = []
    private turno = 0

    private contexto(): AudioContext {
        if (!this.ctx) {
            const C = window.AudioContext || (window as any).webkitAudioContext
            this.ctx = new C()
        }
        // En el celular el audio solo arranca dentro de un toque: se reanuda en cada uno
        if (this.ctx.state === "suspended") void this.ctx.resume()
        return this.ctx
    }

    private clip(k: number): Promise<AudioBuffer> {
        let p = this.clips.get(k)
        if (!p) {
            const c = this.contexto()
            p = fetch(`/voces/${k}.mp3`)
                .then(r => { if (!r.ok) throw new Error(`Sin clip ${k}`); return r.arrayBuffer() })
                .then(b => c.decodeAudioData(b))
            p.catch(() => this.clips.delete(k))
            this.clips.set(k, p)
        }
        return p
    }

    /** Carga por adelantado los próximos números para que suenen sin espera. */
    precargar(desde: number, cuantos = 8) {
        for (let k = 1; k <= cuantos; k++) for (const x of partes(desde + k)) this.clip(x).catch(() => { })
    }

    decir(n: number) {
        try {
            const c = this.contexto()
            const mio = ++this.turno
            this.sonando.forEach(s => { try { s.stop() } catch { } })
            this.sonando = []
            Promise.all(partes(n).map(x => this.clip(x)))
                .then(bufs => {
                    if (mio !== this.turno) return
                    let t = c.currentTime + 0.01
                    for (const buf of bufs) {
                        const s = c.createBufferSource()
                        s.buffer = buf
                        s.connect(c.destination)
                        s.start(t)
                        this.sonando.push(s)
                        t += buf.duration - 0.03
                    }
                })
                .catch(() => { if (mio === this.turno) this.pitar() })
            this.precargar(n)
        } catch {
            this.pitar()
        }
    }

    /** Pitido corto y fuerte, sintetizado. */
    pitar() {
        try {
            const c = this.contexto()
            const t = c.currentTime, g = c.createGain()
            g.gain.setValueAtTime(1.0, t)
            g.gain.setValueAtTime(1.0, t + 0.17)
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
            g.connect(c.destination)
            for (const f of [1800, 2600]) {
                const o = c.createOscillator()
                o.type = "square"
                o.frequency.value = f
                o.connect(g)
                o.start(t)
                o.stop(t + 0.23)
            }
        } catch { }
    }

    avisar(n: number, modo: ModoSonido) {
        if (modo === "voz") this.decir(n)
        else if (modo === "pitido") this.pitar()
    }
}
