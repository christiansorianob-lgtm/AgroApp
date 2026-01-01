import { NextApiRequest, NextApiResponse } from 'next';
// Force deployment trigger
import { db } from "@/lib/db";

// Helper function to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Explicit CORS Handling
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    console.log(`[Login Attempt] Method: ${req.method}`); // Debug log

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: "Celular y contraseña requeridos" });
        }

        // Search for user
        const responsable = await db.responsable.findFirst({
            where: {
                celular: { equals: phone.trim() },
                password: { equals: password.trim() }, // Simple check as per original
                activo: true
            },
            include: { cargoRef: true }
        });

        if (!responsable) {
            return res.status(401).json({ error: "Credenciales incorrectas (Celular o contraseña)" });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: responsable.id,
                nombre: responsable.nombre,
                cargo: responsable.cargoRef?.nombre || "Sin Cargo",
                celular: responsable.celular
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Error procesando la solicitud" });
    }
}
