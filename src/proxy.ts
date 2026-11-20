// Primera barrera: sin sesión no se ve ninguna página, y cada perfil solo entra a sus rutas.
// Las acciones del servidor además verifican el perfil por su cuenta (ver `lib/auth.ts`).

import { NextResponse, type NextRequest } from "next/server"
import { COOKIE_SESION, inicioDe, leerSesion, puedeConfigurar, type Rol } from "@/lib/sesion"

/** Rutas que no piden sesión. */
const PUBLICAS = [/^\/login$/, /^\/api\/ping$/]

/** Lo único que ve un responsable: sus tareas, la pantalla para ejecutarlas y su cuenta. */
const DEL_RESPONSABLE = [/^\/mis-tareas(\/|$)/, /^\/tareas\/[^/]+\/execute$/, /^\/cuenta(\/|$)/]

function permitida(rol: Rol, ruta: string): boolean {
    if (ruta.startsWith("/configuracion")) return puedeConfigurar(rol)
    if (rol === "RESPONSABLE") return DEL_RESPONSABLE.some(r => r.test(ruta))
    return true
}

export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl
    if (PUBLICAS.some(r => r.test(pathname))) return NextResponse.next()

    const sesion = await leerSesion(request.cookies.get(COOKIE_SESION)?.value)
    if (!sesion) {
        if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        const url = new URL("/login", request.url)
        if (pathname !== "/") url.searchParams.set("next", pathname + search)
        return NextResponse.redirect(url)
    }

    // Con la contraseña inicial, lo primero es cambiarla
    if (sesion.debeCambiarPassword && !pathname.startsWith("/cuenta")) {
        return NextResponse.redirect(new URL("/cuenta/contrasena", request.url))
    }

    if (!permitida(sesion.rol, pathname)) {
        if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        return NextResponse.redirect(new URL(inicioDe(sesion.rol), request.url))
    }
    return NextResponse.next()
}

export const config = {
    // Todo menos los archivos internos de Next y los estáticos
    matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
}
