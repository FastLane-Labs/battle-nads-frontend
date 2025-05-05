/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    // Fix for Ably Buffer dependency issue
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/node:buffer/, (resource) => {
        resource.request = 'buffer';
      }),
    );
    config.externals.push('node-fetch');

    // Added server-side optimization
    if (isServer) {
      config.optimization.minimize = true;
    }
    return config;
  },
};

if (process.env.NODE_ENV === 'production') {
  nextConfig.distDir = 'out';
  nextConfig.output = 'export';
}

module.exports = nextConfig;