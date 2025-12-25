
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

    for (const dept of colombiaData) {
        const createdDept = await prisma.departamento.upsert({
            where: { nombre: dept.departamento },
            update: {},
            create: {
                nombre: dept.departamento
            }
        })

        console.log(`Created Department: ${createdDept.nombre}`)

        for (const muniName of dept.municipios) {
            await prisma.municipio.upsert({
                where: {
                    departamentoId_nombre: {
                        departamentoId: createdDept.id,
                        nombre: muniName
                    }
                },
                update: {},
                create: {
                    nombre: muniName,
                    departamentoId: createdDept.id
                }
            })
        }
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
