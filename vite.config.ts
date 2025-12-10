import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 排除 recipe_new 目录，避免扫描大量HTML文件
  server: {
    watch: {
      // 忽略 recipe_new 目录下的所有文件
      ignored: ['**/recipe_new/**']
    },
    // 配置代理以解决图片跨域问题
    proxy: {
      '/api/image-proxy': {
        target: 'https://i3.meishichina.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/image-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 设置请求头，避免被拒绝
            proxyReq.setHeader('Referer', 'https://www.meishichina.com/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        },
      }
    }
  },
  // 优化依赖扫描配置 - 只扫描必要的入口文件
  optimizeDeps: {
    entries: [
      'index.html',
      'src/**/*.{js,jsx,ts,tsx}'
    ]
  }
})

