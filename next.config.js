/** @type {import('next').NextConfig} */
const nextConfig = {
  // تفعيل الملفات الستاتيكية من مجلد public (افتراضي، لكن للتأكيد)
  reactStrictMode: true,
  // السماح بـ Body Parser أكبر للصور base64 إذا لزم الأمر
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/admin.html',
      },
      {
        source: '/cart',
        destination: '/cart.html',
      },
      {
        source: '/checkout',
        destination: '/checkout.html',
      },
      {
        source: '/my-orders',
        destination: '/my-orders.html',
      },
      {
        source: '/order-success',
        destination: '/order-success.html',
      },
    ];
  },
};

module.exports = nextConfig;
