// Usuario de ingreso de cada responsable. No es un archivo de acciones: estas funciones solo
// se llaman desde acciones que ya verificaron el perfil.

import { db } from "@/lib/db"
import { cifrarPassword, normalizarCelular } from "@/lib/auth"

/** Contraseña con la que queda un usuario nuevo o restablecido; se pide cambiarla al primer ingreso. */
export const PASSWORD_INICIAL = "12345678"

export type ResultadoAcceso =
    | { estado: "creado"; celular: string }
    | { estado: "actualizado" | "sin-cambios" }
    | { estado: "sin-celular" }
    | { estado: "celular-en-uso"; celular: string; de: string }

/**
 * Deja al responsable con su usuario de ingreso al día: lo crea si tiene celular y aún no tiene
 * usuario, o le actualiza nombre y celular si ya lo tiene.
 */
export async function sincronizarUsuarioDeResponsable(responsableId: string): Promise<ResultadoAcceso> {
    const r = await db.responsable.findUniqueOrThrow({ where: { id: responsableId }, include: { usuario: true } })
    const celular = normalizarCelular(r.celular ?? "")
    if (!celular) return { estado: "sin-celular" }

    const otro = await db.usuario.findUnique({ where: { celular } })
    if (otro && otro.responsableId !== r.id) return { estado: "celular-en-uso", celular, de: otro.nombre }

    if (r.usuario) {
        if (r.usuario.celular === celular && r.usuario.nombre === r.nombre) return { estado: "sin-cambios" }
        await db.usuario.update({ where: { id: r.usuario.id }, data: { celular, nombre: r.nombre } })
        return { estado: "actualizado" }
    }

    await db.usuario.create({
        data: {
            nombre: r.nombre, celular, rol: "RESPONSABLE", responsableId: r.id,
            passwordHash: await cifrarPassword(PASSWORD_INICIAL), debeCambiarPassword: true,
        },
    })
    return { estado: "creado", celular }
}

/** Mensaje para mostrar después de crear o editar un responsable. */
export function mensajeAcceso(res: ResultadoAcceso): string | undefined {
    switch (res.estado) {
        case "creado": return `Puede ingresar con el celular ${res.celular} y la contraseña ${PASSWORD_INICIAL}. Deberá cambiarla al primer ingreso.`
        case "sin-celular": return "Sin celular no puede ingresar a la plataforma. Agréguelo para darle acceso."
        case "celular-en-uso": return `El celular ${res.celular} ya lo usa ${res.de} para ingresar; este responsable quedó sin acceso.`
        default: return undefined
    }
}
