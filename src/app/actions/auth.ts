'use server'

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { abrirSesion, cerrarSesion, cifrarPassword, exigirSesion, normalizarCelular, verificarPassword } from "@/lib/auth"
import { inicioDe, type Sesion } from "@/lib/sesion"
import { rutaSegura } from "@/lib/navegacion"

const MIN_PASSWORD = 8

export async function ingresar(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string }> {
    const celular = normalizarCelular(String(formData.get("celular") ?? ""))
    const password = String(formData.get("password") ?? "")
    if (!celular || !password) return { error: "Escriba su celular y su contraseña." }

    const u = await db.usuario.findUnique({ where: { celular } })
    // Mismo mensaje si el usuario no existe o la contraseña falla, para no revelar qué celulares están registrados
    if (!u || !u.activo || !(await verificarPassword(password, u.passwordHash))) {
        return { error: "Celular o contraseña incorrectos." }
    }

    await db.usuario.update({ where: { id: u.id }, data: { ultimoIngreso: new Date() } })
    await abrirSesion({ uid: u.id, nombre: u.nombre, rol: u.rol, responsableId: u.responsableId, debeCambiarPassword: u.debeCambiarPassword })

    if (u.debeCambiarPassword) redirect("/cuenta/contrasena")
    const siguiente = rutaSegura(String(formData.get("next") ?? ""))
    redirect(siguiente && siguiente !== "/login" ? siguiente : inicioDe(u.rol))
}

export async function salir() {
    await cerrarSesion()
    redirect("/login")
}

export async function cambiarPassword(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string }> {
    const s = await exigirSesion()
    const actual = String(formData.get("actual") ?? "")
    const nueva = String(formData.get("nueva") ?? "")
    const repetir = String(formData.get("repetir") ?? "")

    if (nueva.length < MIN_PASSWORD) return { error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` }
    if (nueva !== repetir) return { error: "Las dos contraseñas nuevas no coinciden." }
    if (nueva === actual) return { error: "La nueva contraseña debe ser distinta de la actual." }

    const u = await db.usuario.findUniqueOrThrow({ where: { id: s.uid } })
    if (!(await verificarPassword(actual, u.passwordHash))) return { error: "La contraseña actual no es correcta." }

    await db.usuario.update({ where: { id: u.id }, data: { passwordHash: await cifrarPassword(nueva), debeCambiarPassword: false } })
    const sesionNueva: Sesion = { ...s, debeCambiarPassword: false }
    await abrirSesion(sesionNueva)
    redirect(inicioDe(s.rol))
}
