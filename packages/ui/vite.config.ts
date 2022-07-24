/* eslint-disable @typescript-eslint/no-var-requires */

import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import { defineConfig, Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { set } from 'lodash'

// "vite-plugin-electron": "^0.4.4",
// use "vite-plugin-electron/render", 基本就是 makeRendererHappyPlugin 的逻辑

import { builtinModules as __builtinModules } from 'module'
const builtinModules = __builtinModules.filter((name) => !name.startsWith('_'))

function makeRendererHappyPlugin(): Plugin {
  const happyModules = ['electron', ...builtinModules]
  const name = 'make-electron-renderer-happy'
  const modulePrefix = `virtual:${name}:`

  return {
    name,

    config(config, env) {
      const isDev = env.command === 'serve'
      const isBuild = (env.command = 'build')

      set(config, 'optimizeDeps.exclude', [
        ...(config.optimizeDeps?.exclude || []),
        ...happyModules,
      ])

      // for embed deployment
      set(config, 'base', config.base || './')

      // dev 设置 alias, 提供 bridge virtual module
      if (isDev) {
        const alias: Record<string, string> = {}
        for (const name of happyModules) {
          alias[name] = modulePrefix + name
        }
        set(config, 'resolve.alias', { ...config.resolve?.alias, ...alias })
      }

      // build 设置 external
      if (isBuild) {
        // Rollup ---- external ----
        let external = config.build?.rollupOptions?.external

        if (Array.isArray(external)) {
          external = [...external, ...happyModules]
        } else if (typeof external === 'string' || external instanceof RegExp) {
          external = [external, ...happyModules]
        } else if (typeof external === 'function') {
          const original = external
          external = function externalFn(source, importer, isResolved) {
            if (happyModules.includes(source)) {
              return true
            }
            return original(source, importer, isResolved)
          }
        } else {
          external = happyModules
        }
        set(config, 'build.rollupOptions.external', external)

        // Rollup ---- output.format ----
        const output = config.build?.rollupOptions?.output
        if (Array.isArray(output)) {
          for (const o of output) {
            if (!o.format) o.format = 'cjs'
          }
        } else {
          if (!output?.format) {
            set(config, 'build.rollupOptions.output.format', 'cjs')
          }
        }
      }
    },

    load(id) {
      const getModuleCode = (m: string) => {
        if (m === 'electron') {
          return `
          const M = require("electron");
          const {
            clipboard,
            nativeImage,
            shell,
            contextBridge,
            crashReporter,
            ipcRenderer,
            webFrame,
            desktopCapturer,
            deprecate,
          } = M;

          export default M
          export {
            clipboard,
            nativeImage,
            shell,
            contextBridge,
            crashReporter,
            ipcRenderer,
            webFrame,
            desktopCapturer,
            deprecate,
          }
          `
        }

        if (builtinModules.includes(m)) {
          const M = require(`node:${m}`)
          const namedExports = Object.keys(M).filter((name) => !name.startsWith('_'))
          const namedExportsStr = namedExports.join(',\n')

          return `
            const M = require('${m}')
            const {
              ${namedExportsStr}
            } = M

            export default M
            export {
              ${namedExportsStr}
            }
          `
        }
      }

      // make-electron-happy:crypto
      if (id.startsWith(modulePrefix)) {
        console.log(id)
        const m = id.slice(modulePrefix.length)
        const code = getModuleCode(m)
        if (code) return code
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      root: join(__dirname, '../../'),
    }),

    // electronRenderer(),
    makeRendererHappyPlugin(),

    // https://github.com/vitejs/vite/issues/3409
    viteCommonjs({
      include: ['react-command-palette'],
    }),
  ].filter(Boolean),

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },

  /**
   * dev
   */
  optimizeDeps: {
    esbuildOptions: {
      logLevel: 'info',
    },
  },
  server: {
    port: 7749,
  },

  /**
   * prod
   */
  preview: {
    port: 7749,
  },
  build: {
    // minify: true,
    outDir: join(__dirname, '../../bundle/production/renderer/'),
    emptyOutDir: true,
  },
})
