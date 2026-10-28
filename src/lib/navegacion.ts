// Memoria de navegación: cada pantalla que abre un formulario le pasa `returnTo` con su propia
// ruta, y el formulario vuelve ahí al guardar o cancelar.

/** Acepta solo rutas internas ("/fincas/…"), para no redirigir a otros sitios. */
export function rutaSegura(value: string | null | undefined): string | null {
    if (!value) return null
    const v = decodeURIComponent(value)
    return v.startsWith("/") && !v.startsWith("//") ? v : null
}

/** Agrega `returnTo` (y otros parámetros) a una ruta. */
export function conRetorno(href: string, returnTo: string | null | undefined, extra: Record<string, string | null | undefined> = {}): string {
    const [path, query = ""] = href.split("?")
    const params = new URLSearchParams(query)
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v)
    const r = rutaSegura(returnTo)
    if (r) params.set("returnTo", r)
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
}
