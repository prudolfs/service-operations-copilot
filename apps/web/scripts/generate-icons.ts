import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const repoRoot = resolve(webRoot, '..', '..')
const sourceIcon = resolve(repoRoot, 'icon.png')
const outDir = resolve(webRoot, 'public', 'icons')
const splashDir = resolve(outDir, 'splash')

const BRAND_BG = '#0a0d14'
const MASKABLE_SAFE_ZONE = 0.8
const SPLASH_ICON_RATIO = 0.4

type SplashSpec = {
  name: string
  width: number
  height: number
}

const SPLASHES: SplashSpec[] = [
  { name: 'iphone-14-15-pro-max', width: 1290, height: 2796 },
  { name: 'iphone-14-15-pro', width: 1179, height: 2556 },
  { name: 'iphone-12-13-14', width: 1170, height: 2532 },
  { name: 'iphone-se-8', width: 750, height: 1334 },
  { name: 'ipad-pro-11', width: 1668, height: 2388 },
]

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true })
}

async function writePng(outPath: string, buffer: Buffer) {
  await writeFile(outPath, buffer)
  console.log(`  wrote ${outPath.replace(webRoot + '/', '')}`)
}

async function generateSquare(size: number, outFile: string) {
  const buf = await sharp(sourceIcon)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer()
  await writePng(resolve(outDir, outFile), buf)
}

async function generateMaskable(size: number, outFile: string) {
  const inner = Math.round(size * MASKABLE_SAFE_ZONE)
  const offset = Math.round((size - inner) / 2)
  const innerBuf = await sharp(sourceIcon)
    .resize(inner, inner, { fit: 'cover' })
    .png()
    .toBuffer()

  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: innerBuf, top: offset, left: offset }])
    .png()
    .toBuffer()

  await writePng(resolve(outDir, outFile), buf)
}

async function generateSplash(spec: SplashSpec) {
  const inner = Math.round(spec.width * SPLASH_ICON_RATIO)
  const top = Math.round((spec.height - inner) / 2)
  const left = Math.round((spec.width - inner) / 2)

  const innerBuf = await sharp(sourceIcon)
    .resize(inner, inner, { fit: 'cover' })
    .png()
    .toBuffer()

  const buf = await sharp({
    create: {
      width: spec.width,
      height: spec.height,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: innerBuf, top, left }])
    .png()
    .toBuffer()

  await writePng(resolve(splashDir, `${spec.name}.png`), buf)
}

async function generateFavicon() {
  const sizes = [16, 32, 48]
  const pngs = await Promise.all(
    sizes.map((s) =>
      sharp(sourceIcon).resize(s, s, { fit: 'cover' }).png().toBuffer(),
    ),
  )
  const ico = await pngToIco(pngs)
  await writeFile(resolve(webRoot, 'public', 'favicon.ico'), ico)
  console.log('  wrote public/favicon.ico')
}

async function main() {
  await ensureDir(outDir)
  await ensureDir(splashDir)
  console.log(`source: ${sourceIcon}`)
  console.log(`out:    ${outDir}`)

  await generateSquare(192, 'icon-192.png')
  await generateSquare(512, 'icon-512.png')
  await generateMaskable(512, 'icon-maskable-512.png')
  await generateSquare(180, 'apple-touch-icon.png')
  await generateFavicon()

  for (const spec of SPLASHES) {
    await generateSplash(spec)
  }

  console.log('done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
