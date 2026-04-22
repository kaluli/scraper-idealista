/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
