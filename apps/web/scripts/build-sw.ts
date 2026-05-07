import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const templatePath = resolve(webRoot, 'sw-template.js')
const publicDir = resolve(webRoot, 'public')
const outPath = resolve(publicDir, 'sw.js')

const BASE_PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
]

async function discoverSplashImages(): Promise<string[]> {
  const splashDir = resolve(publicDir, 'icons', 'splash')
  try {
    const entries = await readdir(splashDir)
    return entries
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
      .map((name) => `/icons/splash/${name}`)
  } catch {
    return []
  }
}

async function main() {
  const splash = await discoverSplashImages()
  const precache = [...BASE_PRECACHE, ...splash]

  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`

  const template = await readFile(templatePath, 'utf-8')
  const out = template
    .replace(/__BUILD_ID__/g, buildId)
    .replace(/__PRECACHE_LIST__/g, JSON.stringify(precache))

  await writeFile(outPath, out)
  console.log(
    `wrote ${outPath.replace(`${webRoot}/`, '')} — build ${buildId} — ${precache.length} precache entries`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
