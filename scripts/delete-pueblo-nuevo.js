const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deletePuebloNuevo() {
  try {
    console.log('🗑️  Eliminando todos los pisos de Pueblo Nuevo...\n');

    // Buscar todos los pisos de Pueblo Nuevo
    const listingsToDelete = await prisma.listing.findMany({
      where: {
        neighborhood: {
          contains: 'Pueblo Nuevo',
        },
      },
      select: {
        id: true,
        link: true,
        title: true,
        publishedAddress: true,
        price: true,
        surface: true,
        type: true,
      },
    });

    console.log(`📊 Encontrados ${listingsToDelete.length} pisos para eliminar\n`);

    if (listingsToDelete.length === 0) {
      console.log('⚠️  No hay pisos de Pueblo Nuevo para eliminar.');
      return;
    }

    // Mostrar resumen antes de eliminar (solo primeros 10)
    console.log('📋 Pisos que se eliminarán (mostrando primeros 10):');
    listingsToDelete.slice(0, 10).forEach((listing, index) => {
      console.log(`${index + 1}. ID ${listing.id}: ${listing.title || 'Sin título'}`);
      console.log(`   ${listing.publishedAddress || 'Sin dirección'} - ${listing.price}€ - ${listing.type}`);
    });
    if (listingsToDelete.length > 10) {
      console.log(`   ... y ${listingsToDelete.length - 10} más.`);
    }

    console.log('\n🗑️  Eliminando...\n');

    // Eliminar los pisos
    let deleted = 0;
    let errors = 0;

    for (const listing of listingsToDelete) {
      try {
        await prisma.listing.delete({
          where: { id: listing.id },
        });
        deleted++;
        if (deleted % 10 === 0 || deleted === listingsToDelete.length) {
          console.log(`✅ Eliminados ${deleted}/${listingsToDelete.length}...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error al eliminar ID ${listing.id}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${listingsToDelete.length}`);

    // Verificar que se eliminaron
    const remaining = await prisma.listing.count({
      where: {
        neighborhood: {
          contains: 'Pueblo Nuevo',
        },
      },
    });

    if (remaining > 0) {
      console.log(`\n⚠️  Aún quedan ${remaining} pisos de Pueblo Nuevo.`);
    } else {
      console.log(`\n✅ Todos los pisos de Pueblo Nuevo han sido eliminados.`);
    }

    // Mostrar estadísticas finales
    const totalRemaining = await prisma.listing.count();
    console.log(`\n📊 Total de pisos restantes en la base de datos: ${totalRemaining}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deletePuebloNuevo();


