import { NextResponse } from "next/server";
import { createLoteInDb, findLastLote } from "@/services/lotes";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            fincaId,
            codigo,
            nombre,
            areaHa,
            tipoCultivo,
            variedad,
            fechaSiembra,
            latitud,
            longitud,
            poligono,
            observaciones
        } = body;

        // Validation
        if (!fincaId || !nombre || !areaHa) {
            return NextResponse.json({ error: "Faltan campos obligatorios (Finca, Nombre, Área)" }, { status: 400 });
        }

        // Auto-generate code if missing
        let useCode = codigo;
        if (!useCode) {
            const lastLote = await findLastLote(fincaId);
            let nextNum = 1;
            if (lastLote && lastLote.codigo.startsWith("L-")) {
                const part = lastLote.codigo.split("-")[1];
                if (part && !isNaN(parseInt(part))) nextNum = parseInt(part) + 1;
            }
            useCode = `L-${nextNum.toString().padStart(2, '0')}`;
        }

        const newLote = await createLoteInDb({
            fincaId,
            codigo: useCode,
            nombre,
            areaHa: parseFloat(areaHa),
            tipoCultivo,
            variedad,
            fechaSiembra: fechaSiembra ? new Date(fechaSiembra) : null,
            latitud: latitud ? parseFloat(latitud) : null,
            longitud: longitud ? parseFloat(longitud) : null,
            poligono,
            observaciones,
            estado: 'ACTIVO'
        });

        return NextResponse.json({ data: newLote });

    } catch (error: any) {
        console.error("API Error creating lote:", error);

        // Handle Prisma unique constraint errors if any
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "El código del lote ya existe en esta finca." }, { status: 400 });
        }

        return NextResponse.json(
            { error: `Error interno: ${error.message}` },
            { status: 500 }
        );
    }
}
