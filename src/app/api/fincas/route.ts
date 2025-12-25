import { NextResponse } from "next/server";
import { createFincaInDb, findLastFinca } from "@/services/fincas";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            nombre,
            departamento,
            municipio,
            veredaSector,
            responsable,
            areaTotalHa,
            latitud,
            longitud,
            poligono,
            observaciones
        } = body;

        // Validation
        if (!nombre || !areaTotalHa) {
            return NextResponse.json({ error: "Campos obligatorios faltantes" }, { status: 400 });
        }

        // Auto-generate code
        const lastFinca = await findLastFinca();

        let nextCode = "FIN-001";
        if (lastFinca && lastFinca.codigo.startsWith("FIN-")) {
            const lastNumber = parseInt(lastFinca.codigo.split("-")[1]);
            if (!isNaN(lastNumber)) {
                nextCode = `FIN-${(lastNumber + 1).toString().padStart(3, '0')}`;
            }
        }

        const newFinca = await createFincaInDb({
            codigo: nextCode,
            nombre,
            departamento,
            municipio,
            veredaSector,
            responsable,
            areaTotalHa: parseFloat(areaTotalHa),
            latitud: latitud ? parseFloat(latitud) : null,
            longitud: longitud ? parseFloat(longitud) : null,
            poligono,
            observaciones,
            estado: 'ACTIVO'
        });

        return NextResponse.json({ data: newFinca });

    } catch (error: any) {
        console.error("API Error creating finca:", error);
        return NextResponse.json(
            { error: `Error interno: ${error.message}` },
            { status: 500 }
        );
    }
}
