
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const colombiaData = [
    {
        departamento: 'Meta',
        municipios: ['Villavicencio', 'San Martín', 'Granada', 'Puerto López', 'Puerto Gaitán', 'Acacías', 'Castilla la Nueva', 'Cumaral', 'Restrepo', 'San Carlos de Guaroa']
    },
    {
        departamento: 'Cesar',
        municipios: ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'El Copey', 'San Alberto', 'San Martín', 'Curumaní']
    },
    {
        departamento: 'Santander',
        municipios: ['Bucaramanga', 'Barrancabermeja', 'San Gil', 'Piedecuesta', 'Floridablanca', 'Girón', 'Sabana de Torres', 'Puerto Wilches']
    },
    {
        departamento: 'Magdalena',
        municipios: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Aracataca', 'Zona Bananera']
    },
    {
        departamento: 'Cundinamarca',
        municipios: ['Bogotá D.C.', 'Soacha', 'Girardot', 'Zipaquirá', 'Facatativá', 'Chía', 'Mosquera', 'Madrid', 'Funza']
    },
    {
        departamento: 'Casanare',
        municipios: ['Yopal', 'Aguazul', 'Villanueva', 'Paz de Ariporo', 'Maní', 'Tauramena', 'Monterrey']
    }
]

async function main() {
    console.log('Start seeding locations...')

    // Geolocation seeding removed as tables do not exist in schema.
    // console.log('Start seeding locations...')
    // ... code removed ...

    console.log('Seeding finished.')

    // --- SEED MAQUINARIA ---
    console.log('Start seeding machinery catalogs...')

    const tiposMaquinaria = ['Tractor', 'Camión', 'Cosechadora', 'Fumigadora', 'Guadaña', 'Motobomba', 'Planta Eléctrica', 'Remolque']
    for (const nombre of tiposMaquinaria) {
        // We use findFirst to avoid unique constraint errors if name isn't unique in schema schema (it should be though)
        // Ideally schema has @unique on name. Assuming it does or we just check existence.
        // Actually schema for TipoMaquinaria doesn't verify unique name explicitly in snippet I saw?
        // Let's use create directly inside a try-catch or findFirst. 
        // Better: check if exists.
        const exists = await prisma.tipoMaquinaria.findFirst({ where: { nombre } })
        if (!exists) {
            await prisma.tipoMaquinaria.create({ data: { nombre } })
        }
    }

    const marcasMaquinaria = ['John Deere', 'Massey Ferguson', 'Caterpillar', 'Kubota', 'Yamaha', 'Honda', 'Stihl', 'Ford', 'Chevrolet', 'Husqvarna']
    for (const nombre of marcasMaquinaria) {
        const exists = await prisma.marcaMaquinaria.findFirst({ where: { nombre } })
        if (!exists) {
            await prisma.marcaMaquinaria.create({ data: { nombre } })
        }
    }

    const ubicacionesMaquinaria = ['Bodega Principal', 'Taller Mecánico', 'Patio de Maquinaria', 'Garaje Administrativo']
    for (const nombre of ubicacionesMaquinaria) {
        const exists = await prisma.ubicacionMaquinaria.findFirst({ where: { nombre } })
        if (!exists) {
            await prisma.ubicacionMaquinaria.create({ data: { nombre } })
        }
    }

    console.log('Machinery seeding finished.')

    // --- SEED CULTIVOS ---
    console.log('Start seeding crops...')
    const cultivos = [
        {
            nombre: 'Palma de Aceite',
            variedades: ['Guineensis', 'Híbrido OxG', 'Coari x La Mé']
        },
        {
            nombre: 'Frutales',
            variedades: ['Cítricos', 'Aguacate', 'Mango', 'Guanábana']
        },
        {
            nombre: 'Forestales',
            variedades: ['Teca', 'Melina', 'Eucalipto', 'Acacia']
        },
        {
            nombre: 'Pastos',
            variedades: ['Brachiaria', 'Estrella', 'Mombasa']
        }
    ]

    for (const cult of cultivos) {
        // Use upsert or findFirst to verify
        let tipo = await prisma.tipoCultivo.findUnique({ where: { nombre: cult.nombre } })
        if (!tipo) {
            tipo = await prisma.tipoCultivo.create({ data: { nombre: cult.nombre } })
        }

        for (const varn of cult.variedades) {
            await prisma.variedadCultivo.upsert({
                where: {
                    tipoCultivoId_nombre: {
                        tipoCultivoId: tipo.id,
                        nombre: varn
                    }
                },
                update: {},
                create: {
                    nombre: varn,
                    tipoCultivoId: tipo.id
                }
            })
        }
    }
    console.log('Crops seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
