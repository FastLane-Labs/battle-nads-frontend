/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  webpack: (config) => {
    // Don't include large cache files in the output
    config.optimization.providedExports = false;
    config.optimization.usedExports = false;
    
    return config;
  },
};

// Only use export settings in production mode
if (process.env.NODE_ENV === 'production') {
  nextConfig.distDir = 'out';
  nextConfig.output = 'export';
}

module.exports = nextConfig;
