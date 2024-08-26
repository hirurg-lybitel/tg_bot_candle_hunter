/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  headers: () => ([{
    source: "/api/:path*",
    headers: [
      { key: "Access-Control-Allow-Credentials", value: "true" },
      { key: "Access-Control-Allow-Origin", value: "https://3commas-reader.vercel.app" },
      { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
      { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
    ]
  }]),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app.3commas.io',
      },
      {
        protocol: 'https',
        hostname: '3commasio-public.s3.eu-west-1.amazonaws.com',
      }
    ]
  },
  experimental: { 
    serverComponentsExternalPackages: ['grammy'], 
  }, 
};

export default nextConfig;
