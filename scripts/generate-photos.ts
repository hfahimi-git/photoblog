/**
 * Scans public/photos/, extracts EXIF + optional sidecar JSON,
 * writes public/data/photos.json
 *
 * Sidecar example (next to photo.jpg → photo.json):
 * { "title": "Sunset", "description": "Optional caption" }
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import exifr from 'exifr'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PHOTOS_DIR = join(ROOT, 'public', 'photos')
const OUT_FILE = join(ROOT, 'public', 'data', 'photos.json')

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'])

export interface PhotoExif {
  camera?: string
  lens?: string
  aperture?: string
  shutter?: string
  iso?: number
  focalLength?: string
}

export interface Photo {
  id: string
  filename: string
  src: string
  title?: string
  description?: string
  dateTaken: string // ISO 8601
  year: number
  month: number
  exif: PhotoExif
  width?: number
  height?: number
}

function formatAperture(f?: number): string | undefined {
  if (f == null || Number.isNaN(f)) return undefined
  return `ƒ/${f}`
}

function formatShutter(s?: number): string | undefined {
  if (s == null || Number.isNaN(s)) return undefined
  if (s >= 1) return `${s}s`
  const denom = Math.round(1 / s)
  return `1/${denom}s`
}

function formatFocal(fl?: number): string | undefined {
  if (fl == null || Number.isNaN(fl)) return undefined
  return `${Math.round(fl)}mm`
}

async function loadSidecar(imagePath: string): Promise<{ title?: string; description?: string }> {
  const base = imagePath.slice(0, -extname(imagePath).length)
  const candidates = [`${base}.json`, `${base}.JSON`]
  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf-8')
      const data = JSON.parse(raw)
      return {
        title: typeof data.title === 'string' ? data.title.trim() || undefined : undefined,
        description: typeof data.description === 'string' ? data.description.trim() || undefined : undefined,
      }
    } catch {
      // no sidecar or invalid — ignore
    }
  }
  return {}
}

async function processImage(filename: string): Promise<Photo | null> {
  const fullPath = join(PHOTOS_DIR, filename)
  const ext = extname(filename).toLowerCase()
  if (!IMAGE_EXTS.has(ext)) return null

  const id = basename(filename, ext)

  let meta: any = {}
  try {
    meta = await exifr.parse(fullPath, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'Make',
        'Model',
        'LensModel',
        'Lens',
        'FNumber',
        'ExposureTime',
        'ISO',
        'FocalLength',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
      ],
      reviveValues: true,
    }) ?? {}
  } catch (e) {
    console.warn(`EXIF failed for ${filename}:`, (e as Error).message)
  }

  const sidecar = await loadSidecar(fullPath)

  // Date priority: DateTimeOriginal > CreateDate > file mtime
  let date = meta.DateTimeOriginal || meta.CreateDate || meta.ModifyDate
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    const st = await stat(fullPath)
    date = st.mtime
  }

  const isoDate = date.toISOString()
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const make = meta.Make?.trim()
  const model = meta.Model?.trim()
  const camera = [make, model].filter(Boolean).join(' ') || undefined

  const photo: Photo = {
    id,
    filename,
    src: `photos/${filename}`,
    title: sidecar.title,
    description: sidecar.description,
    dateTaken: isoDate,
    year,
    month,
    width: meta.ImageWidth || meta.ExifImageWidth,
    height: meta.ImageHeight || meta.ExifImageHeight,
    exif: {
      camera,
      lens: meta.LensModel || meta.Lens,
      aperture: formatAperture(meta.FNumber),
      shutter: formatShutter(meta.ExposureTime),
      iso: meta.ISO,
      focalLength: formatFocal(meta.FocalLength),
    },
  }

  return photo
}

async function main() {
  let files: string[] = []
  try {
    files = await readdir(PHOTOS_DIR)
  } catch {
    console.log('No public/photos folder yet — creating empty index.')
    await writeFile(OUT_FILE, '[]\n', 'utf-8')
    return
  }

  const photos: Photo[] = []
  for (const file of files) {
    const photo = await processImage(file)
    if (photo) photos.push(photo)
  }

  // newest first
  photos.sort((a, b) => b.dateTaken.localeCompare(a.dateTaken))

  await writeFile(OUT_FILE, JSON.stringify(photos, null, 2) + '\n', 'utf-8')
  console.log(`✓ Generated ${photos.length} photos → public/data/photos.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
