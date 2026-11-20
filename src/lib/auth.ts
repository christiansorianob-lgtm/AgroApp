// Sesión del lado del servidor: leerla en páginas y acciones, y exigir el perfil adecuado.
// Las acciones del servidor se pueden invocar directamente, así que cada una debe llamar a
// `exigir…` aunque el menú ya oculte la opción.

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { COOKIE_SESION, DURACION_SESION_S, esGestor, firmarSesion, leerSesion, puedeConfigurar, type Rol, type Sesion } from "@/lib/sesion"

export class NoAutorizado extends Error {
    constructor(mensaje = "No tiene permiso para esta acción.") { super(mensaje) }
}

export async function getSesion(): Promise<Sesion | null> {
    return leerSesion((await cookies()).get(COOKIE_SESION)?.value)
}

/** Sesión vigente de un usuario activo. Se consulta la base para que desactivar a alguien surta efecto de inmediato. */
async function sesionActiva(): Promise<Sesion | null> {
    const s = await getSesion()
    if (!s) return null
    const u = await db.usuario.findUnique({ where: { id: s.uid }, select: { activo: true, rol: true, responsableId: true } })
    if (!u?.activo) return null
    return { ...s, rol: u.rol, responsableId: u.responsableId }
}

/** Para acciones: lanza NoAutorizado si no hay sesión o el perfil no está permitido. */
export async function exigirRol(...roles: Rol[]): Promise<Sesion> {
    const s = await sesionActiva()
    if (!s) throw new NoAutorizado("Su sesión terminó. Ingrese de nuevo.")
    if (roles.length && !roles.includes(s.rol)) throw new NoAutorizado()
    return s
}

export const exigirGestor = () => exigirRol("DESARROLLADOR", "ADMINISTRADOR")
export const exigirDesarrollador = () => exigirRol("DESARROLLADOR")
export const exigirSesion = () => exigirRol()

/** Para páginas: redirige en lugar de lanzar. */
export async function sesionDePagina(permitidos?: (rol: Rol) => boolean): Promise<Sesion> {
    const s = await sesionActiva()
    if (!s) redirect("/login")
    if (permitidos && !permitidos(s.rol)) redirect(s.rol === "RESPONSABLE" ? "/mis-tareas" : "/")
    return s
}
export const paginaDeGestor = () => sesionDePagina(esGestor)
export const paginaDeDesarrollador = () => sesionDePagina(puedeConfigurar)

/** Un responsable solo puede tocar sus propias tareas. */
export async function exigirAccesoATarea(tareaId: string): Promise<Sesion> {
    const s = await exigirSesion()
    if (esGestor(s.rol)) return s
    const t = await db.tarea.findUnique({ where: { id: tareaId }, select: { responsableId: true } })
    if (!t || !s.responsableId || t.responsableId !== s.responsableId) throw new NoAutorizado("Esta tarea no está asignada a usted.")
    return s
}

export async function abrirSesion(s: Sesion) {
    (await cookies()).set(COOKIE_SESION, await firmarSesion(s), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: DURACION_SESION_S,
    })
}

export async function cerrarSesion() {
    (await cookies()).delete(COOKIE_SESION)
}

export const cifrarPassword = (plano: string) => bcrypt.hash(plano, 10)
export const verificarPassword = (plano: string, hash: string) => bcrypt.compare(plano, hash)

/** Solo dígitos: así "318 254 2939" y "3182542939" son el mismo usuario. */
export const normalizarCelular = (c: string) => c.replace(/\D/g, "")
