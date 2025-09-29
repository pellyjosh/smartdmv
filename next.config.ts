import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone mode for Docker deployment
  output: 'standalone',
  
  // Allow dev origins for subdomain testing
  allowedDevOrigins: [
    'testvet.localhost:9002',
    'acme.localhost:9002',
    'brgd.localhost:9002',
    'smartdvm.localhost:9002',
    'smartvet.localhost:9002',
    'demo.localhost:9002',
    'clinic1.localhost:9002',
    'clinic2.localhost:9002',
    'vet1.localhost:9002',
    'vet2.localhost:9002',
  ],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
