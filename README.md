# Idealista Listing Manager

Web app to manage rental and sale listings with filters by type, neighborhoods, and provinces.

## Features

- Add listings with full details
- Delete listings
- Filters by type (Rental / Sale)
- Filters by neighborhood
- Filters by province
- Filters by max price
- Stats per neighborhood (average price, surface, rooms)
- Profitability comparison: rental vs sale

## Current data

**Note:** The app currently holds data mainly for **Murcia** province, but is built to scale to any province and neighborhood. Filters and structure support multiple provinces and neighborhoods.

## Listing fields

- **Title**
- **Price** (€)
- **Surface** (m²)
- **Idealista link**
- **Profitability rate** (%)
- **Type** (Rental / Sale)
- **Neighborhood**
- **City**
- **Province**
- **Rooms**

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure database:**  
   Use `.env.example` or see [ENTORNOS.md](ENTORNOS.md) for dev vs production setup.

3. **Run the app:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Sync schema with database
- `npm run db:studio` — Open Prisma Studio

## Usage

1. **Add a listing:** Click "Añadir Piso", fill the form, submit.
2. **Filter by type:** Use "Alquiler" or "Compra" in the filter bar.
3. **Filter by province:** Choose a province from the dropdown.
4. **Filter by neighborhood:** Choose a neighborhood (filtered by selected province).
5. **Filter by max price:** Choose a max price range.
6. **View stats:** Stats appear at the top (average price, surface, rooms, distribution; per-neighborhood when rental and sale data exist).
7. **Delete a listing:** Click "Eliminar" on the card and confirm.
8. **Open on Idealista:** Click "Ver en Idealista" to open the link in a new tab.

## Importing data

Import from JSON:

```bash
node scripts/import-json.js archivo.json
```

Supported field names:
- Price: `precio_venta_eur`, `precio_mensual_eur`, `precio_eur_mes`
- Surface: `metros_cuadrados`, `m2`
- Neighborhood: `barrio`, `neighborhood`
- Address: `direccion_publicada`, `publishedAddress`

## Scaling

- **Multiple provinces:** Add provinces and neighborhoods via your data.
- **Dynamic filters:** Filters are built from available data.
- **Profitability:** Computed when rental and sale data exist for the same neighborhood.
- **Live stats:** Recalculated when filters change.
