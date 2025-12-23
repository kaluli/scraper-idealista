import type { Metadata } from 'next'
import './globals.css'

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

