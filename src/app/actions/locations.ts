'use server'

import { db } from "@/lib/db"

export async function getDepartamentos() {
    try {
        const departamentos = await db.departamento.findMany({
            orderBy: { nombre: 'asc' }
        })
        return { data: departamentos }
    } catch (error) {
        console.error("Error fetching departamentos:", error)
        return { data: [] }
    }
}

export async function getMunicipios(departamentoId: string) {
    try {
        const municipios = await db.municipio.findMany({
            where: { departamentoId },
            orderBy: { nombre: 'asc' }
        })
        return { data: municipios }
    } catch (error) {
        console.error("Error fetching municipios:", error)
        return { data: [] }
    }
}
