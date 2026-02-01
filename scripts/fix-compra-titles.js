const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCompraTitles() {
  try {
    console.log('🔍 Buscando pisos con título "Compra"...\n');

    // Buscar todos los pisos con título "Compra"
    const listingsToFix = await prisma.listing.findMany({
      where: {
        title: 'Compra',
      },
      select: {
        id: true,
        title: true,
        publishedAddress: true,
        neighborhood: true,
        city: true,
        type: true,
      },
    });

    console.log(`📋 Encontrados ${listingsToFix.length} pisos con título "Compra"\n`);

    if (listingsToFix.length === 0) {
      console.log('✅ No hay pisos con título "Compra" para corregir.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    const updatedTitles = [];

    for (const listing of listingsToFix) {
      let newTitle = null;

      // Prioridad 1: Usar dirección publicada
      if (listing.publishedAddress && listing.publishedAddress.trim() !== '') {
        newTitle = listing.publishedAddress.trim();
      } 
      // Prioridad 2: Construir con información disponible
      else if (listing.neighborhood || listing.city || listing.type) {
        const parts = [];
        if (listing.type) {
          parts.push(listing.type === 'alquiler' ? 'Alquiler' : 'Compra');
        }
        if (listing.neighborhood) parts.push(listing.neighborhood);
        if (listing.city) parts.push(listing.city);
        newTitle = parts.join(' en ');
        if (newTitle === '') newTitle = 'Piso sin título';
      } 
      // Prioridad 3: Fallback
      else {
        newTitle = 'Piso sin título';
      }

      if (newTitle && newTitle !== listing.title) {
        try {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { title: newTitle },
          });
          updated++;
          updatedTitles.push(`✅ ID ${listing.id}: "${newTitle}"`);
        } catch (error) {
          console.error(`❌ Error al actualizar el piso ID ${listing.id}:`, error.message);
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⚠️  Omitidos: ${skipped}`);
    console.log(`📋 Total procesados: ${listingsToFix.length}\n`);

    if (updatedTitles.length > 0) {
      console.log('📋 Ejemplos de títulos corregidos:');
      updatedTitles.slice(0, 10).forEach(t => console.log(t));
      if (updatedTitles.length > 10) {
        console.log(`... y ${updatedTitles.length - 10} más.`);
      }
    }

    // Verificar que no queden títulos "Compra"
    const remaining = await prisma.listing.count({
      where: {
        title: 'Compra',
      },
    });

    if (remaining > 0) {
      console.log(`\n⚠️  Aún quedan ${remaining} pisos con título "Compra".`);
    } else {
      console.log(`\n✅ Todos los títulos "Compra" han sido corregidos.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixCompraTitles();


