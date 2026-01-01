
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const colombiaData = [
    {
        departamento: 'Meta',
        municipios: ['Villavicencio', 'San Martín', 'Granada', 'Puerto López', 'Puerto Gaitán', 'Acacías', 'Castilla la Nueva', 'Cumaral', 'Restrepo', 'San Carlos de Guaroa']
    },
    {
        departamento: 'Cesar',
        municipios: [
            'Valledupar', 'Aguachica', 'Agustín Codazzi', 'Astrea', 'Becerril', 'Bosconia',
            'Chimichagua', 'Chiriguaná', 'Curumaní', 'El Copey', 'El Paso', 'Gamarra',
            'González', 'La Gloria', 'La Jagua de Ibirico', 'La Paz', 'Manaure Balcón del Cesar',
            'Pailitas', 'Pelaya', 'Pueblo Bello', 'Río de Oro', 'San Alberto', 'San Diego',
            'San Martín', 'Tamalameque'
        ]
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

    // --- SEED LOCATIONS ---
    console.log('Start seeding locations...')
    for (const data of colombiaData) {
        // Create Department
        let dept = await prisma.departamento.findUnique({ where: { nombre: data.departamento } })
        if (!dept) {
            dept = await prisma.departamento.create({ data: { nombre: data.departamento } })
        }

        // Create Municipios
        for (const muniName of data.municipios) {
            // Check if exists in this dept
            // Since we don't have unique constraint on name alone (only ID), and we want to avoid duplicates if possible.
            // But usually unique constraint is on ID. 
            // We can check if a municipality with this name exists in this department
            const muniExists = await prisma.municipio.findFirst({
                where: {
                    nombre: muniName,
                    departamentoId: dept.id
                }
            })

            if (!muniExists) {
                await prisma.municipio.create({
                    data: {
                        nombre: muniName,
                        departamentoId: dept.id
                    }
                })
            }
        }
    }
    console.log('Locations seeding finished.')

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

    // --- SEED TIPO ACTIVIDAD ---
    console.log('Start seeding activity types...')
    const actividades = [
        'Fertilización',
        'Plateo',
        'Poda',
        'Cosecha',
        'Fumigación',
        'Siembra',
        'Mantenimiento Vías',
        'Mantenimiento Drenajes',
        'Aplicación Herbicida',
        'Censo',
        'Polinización'
    ]

    for (const nombre of actividades) {
        const exists = await prisma.tipoActividad.findUnique({ where: { nombre } })
        if (!exists) {
            await prisma.tipoActividad.create({ data: { nombre } })
        }
    }
    console.log('Activity types seeding finished.')

    // --- SEED PRODUCTOS CATALOGOS ---
    // --- SEED PRODUCTOS CATALOGOS ---
    console.log('Start seeding product catalogs...')
    const unidadesMedida = ["Kilogramo (kg)", "Gramo (g)", "Litro (l)", "Mililitro (ml)", "Bulto", "Galón", "Unidad"]

    for (const nombre of unidadesMedida) {
        const exists = await prisma.unidadMedida.findUnique({ where: { nombre } })
        if (!exists) { await prisma.unidadMedida.create({ data: { nombre } }) }
    }

    // Structured Catalog with Correct Categorization
    const catalogoProductos = [
        {
            categoria: "Fertilizante",
            productos: ["Urea 46%", "DAP 18-46-0", "KCL Cloruro de Potasio", "Triple 15", "Sulfato de Amonio", "Borozinco", "Nitromag"]
        },
        {
            categoria: "Herbicida",
            productos: ["Glifosato 480 SL", "Paraquat", "Metsulfuron Metil", "Atrazina", "Diuron", "Aminas 2,4-D"]
        },
        {
            categoria: "Fungicida",
            productos: ["Mancozeb", "Carbendazim", "Azoxistrobina", "Propiconazol", "Validacina"]
        },
        {
            categoria: "Insecticida",
            productos: ["Clorpirifos", "Cipermetrina", "Imidacloprid", "Fipronil"]
        },
        {
            categoria: "Enmienda",
            productos: ["Cal Dolomita", "Cal Agrícola", "Yeso Agrícola", "Roca Fosfórica"]
        },
        {
            categoria: "Combustible",
            productos: ["Gasolina Corriente", "ACPM (Diesel)"]
        },
        {
            categoria: "Lubricantes",
            productos: ["Aceite 2T", "Aceite Motor 15W40", "Grasa Multipropósito", "Aceite Hidráulico", "Valvulina"]
        },
        {
            categoria: "Herramienta",
            productos: ["Palín", "Machete", "Lima", "Tijera de Poda", "Bomba de Espalda 20L", "Guantes de Carnaza"]
        },
        {
            categoria: "Repuestos",
            productos: ["Bujía", "Filtro de Aire", "Filtro de Aceite", "Correa", "Cuchilla Guadaña"]
        }
    ]

    for (const grupo of catalogoProductos) {
        // 1. Ensure Category Exists
        let cat = await prisma.categoriaProducto.findUnique({ where: { nombre: grupo.categoria } })
        if (!cat) {
            cat = await prisma.categoriaProducto.create({ data: { nombre: grupo.categoria } })
        }

        // 2. Create Products linked to this Category
        for (const prodNombre of grupo.productos) {
            const prodExists = await prisma.nombreProducto.findUnique({ where: { nombre: prodNombre } })

            if (!prodExists) {
                await prisma.nombreProducto.create({
                    data: {
                        nombre: prodNombre,
                        categoriaId: cat.id // CRITICAL: Link to category
                    }
                })
            } else {
                // Optional: Update category if it was missing (fix existing bad data)
                if (prodExists.categoriaId !== cat.id) {
                    await prisma.nombreProducto.update({
                        where: { id: prodExists.id },
                        data: { categoriaId: cat.id }
                    })
                }
            }
        }
    }
    console.log('Product catalogs seeding finished.')

    // --- SEED CARGOS ---
    console.log('Start seeding cargos...')
    const cargos = [
        "Administrador", "Mayordomo", "Capataz", "Agrónomo",
        "Veterinario", "Tractorista / Operario", "Jornalero",
        "Oficios Varios", "Vigilante"
    ]
    for (const nombre of cargos) {
        const exists = await prisma.cargo.findUnique({ where: { nombre } })
        if (!exists) {
            await prisma.cargo.create({ data: { nombre } })
        }
    }
    console.log('Cargos seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
