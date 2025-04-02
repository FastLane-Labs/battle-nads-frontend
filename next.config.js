/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  distDir: 'out',
  output: 'export',
  // Remove webpack cache files that exceed Cloudflare's 25MB limit
  webpack: (config) => {
    // Don't include large cache files in the output
    config.optimization.providedExports = false;
    config.optimization.usedExports = false;
    
    return config;
  },
};

module.exports = nextConfig;