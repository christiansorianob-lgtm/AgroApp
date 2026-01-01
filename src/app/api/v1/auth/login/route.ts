import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function OPTIONS(request: Request) {
    return NextResponse.json({}, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    })
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { phone, password } = body

        if (!phone || !password) {
            return NextResponse.json({ error: "Celular y contraseña requeridos" }, { status: 400 })
        }

        // Search for user
        const responsable = await db.responsable.findFirst({
            where: {
                celular: { equals: phone.trim() },
                password: { equals: password.trim() }, // Simple check
                activo: true
            },
            include: { cargoRef: true }
        })

        if (!responsable) {
            return NextResponse.json({ error: "Credenciales incorrectas (Celular o contraseña)" }, { status: 401 })
        }

        return NextResponse.json({
            success: true,
            user: {
                id: responsable.id,
                nombre: responsable.nombre,
                cargo: responsable.cargoRef?.nombre || "Sin Cargo",
                celular: responsable.celular
            }
        })

    } catch (error) {
        console.error("Login Error:", error)
        return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 })
    }
}
