/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "randomuser.me", // Corrected hostname
        },
      ],
    },
  };
  
  export default nextConfig;
