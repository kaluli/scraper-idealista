/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * NextAuth en Vercel: si no definís NEXTAUTH_URL a mano, Vercel inyecta VERCEL_URL
   * (host sin protocolo). Sin URL absoluta, login devuelve /api/auth/error?error=Configuration.
   */
  env: {
    ...(!process.env.NEXTAUTH_URL && process.env.VERCEL_URL
      ? { NEXTAUTH_URL: `https://${process.env.VERCEL_URL}` }
      : {}),
  },
  // No fallar el build si falta ESLint; la DB no se usa en build
  eslint: { ignoreDuringBuilds: true },
  /**
   * Evita fallos al restaurar caché en disco de webpack en dev
   * ("PackFileCacheStrategy ... hasStartTime"). Memoria: algo más lento al arrancar, más estable.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' }
    }
    return config
  },
}

module.exports = nextConfig
