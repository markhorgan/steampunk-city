import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'
import { normalizePath } from 'vite'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, './node_modules/@polygon-streaming/web-player-playcanvas/dist/service-worker.js')),
          dest: ''
        }
      ]
    })
  ],
  base: './'
})