const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deletePuebloNuevoNeighborhood() {
  try {
    console.log('🗑️  Eliminando el barrio "Pueblo Nuevo" de la tabla neighborhoods...\n');

    // Buscar el barrio
    const neighborhoods = await prisma.neighborhood.findMany({
      where: {
        name: {
          contains: 'Pueblo Nuevo',
        },
      },
    });

    console.log(`📊 Encontrados ${neighborhoods.length} barrios para eliminar\n`);

    if (neighborhoods.length === 0) {
      console.log('⚠️  No hay barrios "Pueblo Nuevo" para eliminar.');
      return;
    }

    // Mostrar los barrios que se eliminarán
    neighborhoods.forEach((neighborhood, index) => {
      console.log(`${index + 1}. ID ${neighborhood.id}: ${neighborhood.name} (${neighborhood.province})`);
    });

    console.log('\n🗑️  Eliminando...\n');

    // Eliminar los barrios
    let deleted = 0;
    let errors = 0;

    for (const neighborhood of neighborhoods) {
      try {
        await prisma.neighborhood.delete({
          where: { id: neighborhood.id },
        });
        deleted++;
        console.log(`✅ Eliminado: ${neighborhood.name}`);
      } catch (error) {
        errors++;
        console.error(`❌ Error al eliminar ID ${neighborhood.id}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${neighborhoods.length}`);

    // Verificar que se eliminaron
    const remaining = await prisma.neighborhood.count({
      where: {
        name: {
          contains: 'Pueblo Nuevo',
        },
      },
    });

    if (remaining > 0) {
      console.log(`\n⚠️  Aún quedan ${remaining} barrios "Pueblo Nuevo".`);
    } else {
      console.log(`\n✅ Todos los barrios "Pueblo Nuevo" han sido eliminados.`);
    }

    // Mostrar estadísticas finales
    const totalNeighborhoods = await prisma.neighborhood.count();
    console.log(`\n📊 Total de barrios restantes: ${totalNeighborhoods}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deletePuebloNuevoNeighborhood();


