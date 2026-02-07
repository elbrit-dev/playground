/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@plasmicapp/loader-nextjs",
    "@plasmicapp/loader-react",
    "@plasmicapp/loader-core",
    "antd"
  ],
  reactStrictMode: false,
};

export default nextConfig;