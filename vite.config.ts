import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 排除 recipe_new 目录，避免扫描大量HTML文件
  server: {
    watch: {
      // 忽略 recipe_new 目录下的所有文件
      ignored: ['**/recipe_new/**']
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

