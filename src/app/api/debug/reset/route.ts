
import { db } from "../../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await db.tarea.deleteMany({});
        await db.trazabilidad.deleteMany({});
        // Re-seed minimal data if needed, or just clear

        let finca = await db.finca.findFirst();
        if (!finca) {
            finca = await db.finca.create({
                data: {
                    codigo: "FIN-RESET",
                    nombre: "Finca Default",
                    departamento: "Default",
                    municipio: "Default",
                    veredaSector: "Default",
                    responsable: "Admin",
                    areaTotalHa: 10
                }
            });
        }

        await db.tarea.create({
            data: {
                codigo: "TAR-RESET-001",
                nivel: "FINCA",
                responsable: "Admin",
                fincaId: finca.id,
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
