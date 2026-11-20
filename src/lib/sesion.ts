// Sesión firmada que viaja en una cookie. Este archivo solo usa `jose` para poder correr
// tanto en el proxy como en el servidor; lo que toca la base está en `auth.ts`.

import { SignJWT, jwtVerify } from "jose"

export type Rol = "DESARROLLADOR" | "ADMINISTRADOR" | "RESPONSABLE"

export interface Sesion {
    uid: string
    nombre: string
    rol: Rol
    responsableId: string | null
    debeCambiarPassword: boolean
}

export const COOKIE_SESION = "agroapp_sesion"
export const DURACION_SESION_S = 60 * 60 * 24 * 30 // 30 días: en campo no conviene pedir el ingreso a cada rato

export const ROL_LABELS: Record<Rol, string> = {
    DESARROLLADOR: "Desarrollador",
    ADMINISTRADOR: "Administrador",
    RESPONSABLE: "Responsable",
}

function clave(): Uint8Array {
    const secreto = process.env.AUTH_SECRET
    if (!secreto) {
        if (process.env.NODE_ENV === "production") throw new Error("Falta la variable AUTH_SECRET")
        return new TextEncoder().encode("agroapp-desarrollo-local-no-usar-en-produccion")
    }
    return new TextEncoder().encode(secreto)
}

export async function firmarSesion(s: Sesion): Promise<string> {
    return new SignJWT({ ...s })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${DURACION_SESION_S}s`)
        .sign(clave())
}

export async function leerSesion(token: string | undefined): Promise<Sesion | null> {
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, clave())
        const p = payload as unknown as Sesion
        return p.uid && p.rol ? p : null
    } catch {
        return null
    }
}

/** Configuración solo la ve el desarrollador. */
export const puedeConfigurar = (rol: Rol) => rol === "DESARROLLADOR"
/** Desarrollador y administrador ven la operación completa. */
export const esGestor = (rol: Rol) => rol === "DESARROLLADOR" || rol === "ADMINISTRADOR"

/** Página de inicio de cada perfil. */
export const inicioDe = (rol: Rol) => (rol === "RESPONSABLE" ? "/mis-tareas" : "/")
