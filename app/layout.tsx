import type { Metadata } from 'next'
import './globals.css'

// Evitar que el build pre-renderice páginas que usan la API/DB (falla en Vercel si la DB no está disponible en build)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestor de Pisos Idealista',
  description: 'Gestiona tus pisos de alquiler y compra',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}


