const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTitles() {
  try {
    console.log('🔍 Buscando pisos sin título o con "sin titulo"...');
    
    // Obtener todos los listings
    const allListings = await prisma.listing.findMany({
      select: {
        id: true,
        title: true,
        publishedAddress: true,
      },
    });

    // Filtrar los que necesitan corrección (en JavaScript porque MySQL no soporta case-insensitive contains)
    const listings = allListings.filter(listing => {
      const title = listing.title || '';
      const titleLower = title.toLowerCase();
      return (
        !listing.title ||
        listing.title === '' ||
        titleLower.includes('sin titulo') ||
        titleLower.includes('sin título')
      );
    });

    console.log(`📋 Encontrados ${listings.length} pisos para corregir\n`);

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
      let newTitle = null;
      
      // Prioridad 1: usar publishedAddress si existe
      if (listing.publishedAddress) {
        newTitle = listing.publishedAddress;
      } 
      // Prioridad 2: construir título con barrio y tipo
      else if (listing.neighborhood) {
        const tipo = listing.type === 'alquiler' ? 'Alquiler' : 'Compra';
        newTitle = `${tipo} en ${listing.neighborhood}`;
        if (listing.city) {
          newTitle += `, ${listing.city}`;
        }
      }
      // Prioridad 3: usar solo el tipo y ciudad
      else if (listing.city) {
        const tipo = listing.type === 'alquiler' ? 'Alquiler' : 'Compra';
        newTitle = `${tipo} en ${listing.city}`;
      }
      // Prioridad 4: solo el tipo
      else {
        newTitle = listing.type === 'alquiler' ? 'Alquiler' : 'Compra';
      }
      
      if (newTitle) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { title: newTitle },
        });
        updated++;
        if (updated <= 10) {
          console.log(`✅ ID ${listing.id}: "${newTitle}"`);
        }
      } else {
        skipped++;
        console.log(`⚠️  ID ${listing.id}: Sin información suficiente, omitido`);
      }
    }
    
    if (updated > 10) {
      console.log(`... y ${updated - 10} más`);
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⚠️  Omitidos (sin dirección): ${skipped}`);
    console.log(`📋 Total procesados: ${listings.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTitles();
