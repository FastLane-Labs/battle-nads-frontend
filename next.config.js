/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  // Remove webpack cache files that exceed Cloudflare's 25MB limit
  webpack: (config) => {
    // Don't include large cache files in the output
    config.optimization.providedExports = false;
    config.optimization.usedExports = false;
    
    return config;
  },
};

if (process.env.NODE_ENV === 'production') {
  nextConfig.distDir = 'out';
  nextConfig.output = 'export';
}

module.exports = nextConfig;