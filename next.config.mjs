/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'export',
  basePath: isProd ? '/IEC-Learning' : '',
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
