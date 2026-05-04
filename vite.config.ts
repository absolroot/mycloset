import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: projectRoot,
  plugins: [react(), tailwindcss(), copyRuntimeFiles()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
})

function copyRuntimeFiles() {
  const files = [
    "config.js",
    "config.example.js",
    "sw.js",
    "Closet 137abb41507c80699008e26e88fa26d9_all (2).csv",
  ]

  return {
    name: "copy-runtime-files",
    closeBundle() {
      const outDir = path.resolve(projectRoot, "dist")
      for (const file of files) {
        const source = path.resolve(projectRoot, file)
        if (!fs.existsSync(source)) continue
        fs.copyFileSync(source, path.join(outDir, file))
      }
    },
  }
}
