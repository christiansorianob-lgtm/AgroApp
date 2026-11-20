'use server'

// Acceso de los responsables a la plataforma: solo el desarrollador lo administra (Configuración → Responsables).

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { cifrarPassword, exigirDesarrollador } from "@/lib/auth"
import { PASSWORD_INICIAL, mensajeAcceso, sincronizarUsuarioDeResponsable } from "@/lib/usuarios"

/** Crea el usuario de un responsable que aún no lo tiene. */
export async function darAcceso(responsableId: string): Promise<{ success?: boolean; mensaje?: string; error?: string }> {
    await exigirDesarrollador()
    const res = await sincronizarUsuarioDeResponsable(responsableId)
    revalidatePath('/configuracion/responsables')
    if (res.estado === "creado") return { success: true, mensaje: mensajeAcceso(res) }
    return { error: mensajeAcceso(res) ?? "El responsable ya tiene acceso." }
}

/** Vuelve a dejar la contraseña inicial; el responsable deberá cambiarla al ingresar. */
export async function restablecerPassword(responsableId: string): Promise<{ success?: boolean; mensaje?: string; error?: string }> {
    await exigirDesarrollador()
    const u = await db.usuario.findUnique({ where: { responsableId } })
    if (!u) return { error: "Este responsable no tiene usuario para ingresar." }
    await db.usuario.update({ where: { id: u.id }, data: { passwordHash: await cifrarPassword(PASSWORD_INICIAL), debeCambiarPassword: true } })
    revalidatePath('/configuracion/responsables')
    return { success: true, mensaje: `La contraseña de ${u.nombre} quedó en ${PASSWORD_INICIAL}. Deberá cambiarla al ingresar.` }
}

/** Activa o desactiva el ingreso. Desactivado, su sesión deja de valer de inmediato. */
export async function cambiarAcceso(responsableId: string, activo: boolean): Promise<{ success?: boolean; error?: string }> {
    await exigirDesarrollador()
    const u = await db.usuario.findUnique({ where: { responsableId } })
    if (!u) return { error: "Este responsable no tiene usuario para ingresar." }
    await db.usuario.update({ where: { id: u.id }, data: { activo } })
    revalidatePath('/configuracion/responsables')
    return { success: true }
}
