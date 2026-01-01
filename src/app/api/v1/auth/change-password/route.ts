import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { userId, currentPassword, newPassword } = body

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
        }

        // Find user
        const responsable = await db.responsable.findUnique({
            where: { id: userId }
        })

        if (!responsable) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        // Verify current password
        if (responsable.password !== currentPassword) {
            return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 })
        }

        // Update password
        await db.responsable.update({
            where: { id: userId },
            data: { password: newPassword }
        })

        return NextResponse.json({ success: true, message: "Contraseña actualizada correctamente" })

    } catch (error) {
        console.error("Change Password Error:", error)
        return NextResponse.json({ error: "Error al actualizar la contraseña" }, { status: 500 })
    }
}
