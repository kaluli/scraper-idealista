import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { MobileNavProvider } from '@/components/MobileAppNav'
import { AppTopHeader } from '@/components/AppTopHeader'
import { AppSiteFooter } from '@/components/AppSiteFooter'
import { cn } from '@/lib/utils'

// Evitar que el build pre-renderice páginas que usan la API/DB (falla en Vercel si la DB no está disponible en build)
export const dynamic = 'force-dynamic'

// Mismas familias y pesos que `idealista-pro-makeover` (index.html: Inter 400–700, Plus Jakarta 600–800)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Idealista Manager',
  description: 'Gestiona tus pisos de alquiler y compra',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={cn(inter.variable, plusJakarta.variable)}>
      <body className="min-h-screen font-sans antialiased">
        <div className="app-root">
          <MobileNavProvider>
            <AppTopHeader />
            <div className="main-pad">{children}</div>
            <AppSiteFooter />
          </MobileNavProvider>
        </div>
      </body>
    </html>
  )
}
