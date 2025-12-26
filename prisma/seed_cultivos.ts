import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const cultivos = [
        {
            nombre: 'Palma de Aceite',
            variedades: ['Guineensis', 'Híbrido OxG', 'Noli', 'Coari']
        },
        {
            nombre: 'Café',
            variedades: ['Castillo', 'Caturra', 'Colombia', 'Borbón']
        },
        {
            nombre: 'Banano',
            variedades: ['Cavendish', 'Valery', 'Gros Michel']
        },
        {
            nombre: 'Cacao',
            variedades: ['CCN-51', 'Trinitario', 'Criollo']
        },
        {
            nombre: 'Aguacate',
            variedades: ['Hass', 'Lorena', 'Choquette']
        },
        {
            nombre: 'Arroz',
            variedades: ['Fedearroz 67', 'Fedearroz 68', 'Oryzica']
        },
        {
            nombre: 'Caña de Azúcar',
            variedades: ['CC 85-92', 'CC 01-1940']
        }
    ]

    for (const cultivo of cultivos) {
        const tipo = await prisma.tipoCultivo.upsert({
            where: { nombre: cultivo.nombre },
            update: {},
            create: { nombre: cultivo.nombre }
        })

        console.log(`Upserted TipoCultivo: ${tipo.nombre}`)

        for (const variedad of cultivo.variedades) {
            await prisma.variedadCultivo.upsert({
                where: {
                    tipoCultivoId_nombre: {
                        tipoCultivoId: tipo.id,
                        nombre: variedad
                    }
                },
                update: {},
                create: {
                    nombre: variedad,
                    tipoCultivoId: tipo.id
                }
            })
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
