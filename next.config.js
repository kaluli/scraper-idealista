/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No fallar el build si falta ESLint; la DB no se usa en build
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
