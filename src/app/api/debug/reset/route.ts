
import { db } from "../../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await db.tarea.deleteMany({});
        await db.trackingPoint.deleteMany({});
        // Re-seed minimal data if needed, or just clear

        await db.tarea.create({
            data: {
                tipo: "TEST-RESET",
                descripcion: "Tarea de prueba post-reset",
                estado: "PROGRAMADA",
                fechaProgramada: new Date(),
                prioridad: "MEDIA"
            }
        });

        return NextResponse.json({ success: true, message: "Tasks reset complete" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
