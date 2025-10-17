import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Seed Areas
  const areas = [
    { codigo: '111', nombre: 'Área 111', descripcion: 'Área de proceso 111' },
    { codigo: '123', nombre: 'Área 123', descripcion: 'Área de proceso 123' },
    { codigo: '456', nombre: 'Área 456', descripcion: 'Área de proceso 456' },
  ]

  console.log('📍 Seeding areas...')
  for (const area of areas) {
    await prisma.area.upsert({
      where: { codigo: area.codigo },
      update: area,
      create: area,
    })
  }

  // Seed Tipos de Equipo
  const tiposEquipo = [
    { codigo: 'BBA', nombre: 'Bomba Centrifuga Horizontal', categoria: 'Bombas' },
    { codigo: 'VCT', nombre: 'Válvula de Control', categoria: 'Válvulas' },
    { codigo: 'BCN', nombre: 'Bomba Centrifuga', categoria: 'Bombas' },
    { codigo: 'VBL', nombre: 'Válvula de Bola', categoria: 'Válvulas' },
    { codigo: 'CMP', nombre: 'Compresor', categoria: 'Compresores' },
  ]

  console.log('⚙️ Seeding tipos de equipo...')
  for (const tipo of tiposEquipo) {
    await prisma.tipoEquipo.upsert({
      where: { codigo: tipo.codigo },
      update: tipo,
      create: tipo,
    })
  }

  // Seed Ejecutores (from existing data)
  const ejecutores = [
    { nombre: 'Carlos Silva', email: 'carlos.silva@empresa.com' },
    { nombre: 'Ana Gutierrez', email: 'ana.gutierrez@empresa.com' },
    { nombre: 'Sebastián Concha', email: 'sebastian.concha@empresa.com' },
    { nombre: 'María López', email: 'maria.lopez@empresa.com' },
  ]

  console.log('👥 Seeding ejecutores...')
  for (const ejecutor of ejecutores) {
    await prisma.ejecutor.upsert({
      where: { nombre: ejecutor.nombre },
      update: ejecutor,
      create: ejecutor,
    })
  }

  // Seed Clientes/Zonas
  const clientesZonas = [
    {
      nombre: 'Antofagasta | SQM | Salar del Carmen | LioH L1',
      cliente: 'SQM',
      zona: 'Antofagasta',
      ubicacion: 'Salar del Carmen',
      detalle: 'LioH L1'
    },
    {
      nombre: 'Antofagasta | SQM | Salar del Carmen | LioH L2',
      cliente: 'SQM',
      zona: 'Antofagasta', 
      ubicacion: 'Salar del Carmen',
      detalle: 'LioH L2'
    },
    {
      nombre: 'Santiago | CODELCO | El Teniente',
      cliente: 'CODELCO',
      zona: 'Santiago',
      ubicacion: 'El Teniente',
      detalle: null
    }
  ]

  console.log('🏢 Seeding clientes y zonas...')
  for (const clienteZona of clientesZonas) {
    await prisma.clienteZona.upsert({
      where: { nombre: clienteZona.nombre },
      update: clienteZona,
      create: clienteZona,
    })
  }

  console.log('✅ Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })