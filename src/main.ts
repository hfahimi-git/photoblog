import './style.css'
import type { Photo } from './types'
import { aboutHtml } from './about-content'

// ── State ────────────────────────────────────────────

let photos: Photo[] = []
let currentView: 'home' | 'photo' | 'archive' | 'about' = 'home'
let currentId: string | null = null

// ── Helpers ──────────────────────────────────────────

function $(sel: string, parent: ParentNode = document): HTMLElement | null {
  return parent.querySelector(sel)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function currentIndex(): number {
  if (!currentId) return -1
  return photos.findIndex((p) => p.id === currentId)
}

function goRelative(delta: number): void {
  const i = currentIndex()
  if (i < 0) return
  const next = i + delta
  if (next < 0 || next >= photos.length) return
  navigate(`/photo/${encodeURIComponent(photos[next].id)}`)
}

// ── Routing (hash-based — works on GitHub Pages) ─────

function parseHash(): void {
  const hash = location.hash.slice(1) || '/'
  if (hash === '/' || hash === '') {
    currentView = 'home'
    currentId = null
  } else if (hash === '/archive') {
    currentView = 'archive'
    currentId = null
  } else if (hash === '/about') {
    currentView = 'about'
    currentId = null
  } else if (hash.startsWith('/photo/')) {
    currentView = 'photo'
    currentId = decodeURIComponent(hash.slice(7))
  } else {
    currentView = 'home'
    currentId = null
  }
  render()
}

function navigate(path: string): void {
  location.hash = path
}

// ── Lightbox ─────────────────────────────────────────

function openLightbox(src: string, alt: string, naturalWidth?: number, naturalHeight?: number): void {
  closeLightbox()

  const lb = document.createElement('div')
  lb.className = 'lightbox'
  lb.setAttribute('role', 'dialog')
  lb.setAttribute('aria-modal', 'true')
  lb.setAttribute('aria-label', 'Full-size image')

  const img = document.createElement('img')
  img.src = src
  img.alt = alt

  const closeBtn = document.createElement('button')
  closeBtn.className = 'lightbox-close'
  closeBtn.type = 'button'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.innerHTML = '×'

  lb.appendChild(img)
  lb.appendChild(closeBtn)
  document.body.appendChild(lb)
  document.body.style.overflow = 'hidden'

  const finishLayout = () => {
    const w = naturalWidth || img.naturalWidth
    const h = naturalHeight || img.naturalHeight
    if (w > window.innerWidth - 48 || h > window.innerHeight - 48) {
      lb.classList.add('is-scrollable')
      img.style.width = `${w}px`
      img.style.height = `${h}px`
      img.style.maxWidth = 'none'
      img.style.maxHeight = 'none'
    }
  }

  if (img.complete && img.naturalWidth) {
    finishLayout()
  } else {
    img.addEventListener('load', finishLayout, { once: true })
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
  }
  window.addEventListener('keydown', onKey)

  const cleanup = () => {
    window.removeEventListener('keydown', onKey)
  }

  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target === img) {
      cleanup()
      closeLightbox()
    }
  })
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    cleanup()
    closeLightbox()
  })
}

function closeLightbox(): void {
  const existing = document.querySelector('.lightbox')
  if (existing) existing.remove()
  document.body.style.overflow = ''
}

// ── Renderers ────────────────────────────────────────

function renderHeader(): string {
  return `
    <header class="header">
      <div class="header-inner">
        <a href="#/" class="logo">Photoblog</a>
        <nav class="nav">
          <a href="#/" class="${currentView === 'home' ? 'active' : ''}">Home</a>
          <a href="#/archive" class="${currentView === 'archive' ? 'active' : ''}">Archive</a>
          <a href="#/about" class="${currentView === 'about' ? 'active' : ''}">About</a>
        </nav>
      </div>
    </header>
  `
}

function renderFooter(): string {
  return `
    <footer class="footer">
      <p>Drop photos into <code>public/photos/</code> · rebuild to publish</p>
    </footer>
  `
}

function renderHome(): string {
  if (photos.length === 0) {
    return `<div class="empty">No photos yet. Add images to <code>public/photos/</code> and run <code>npm run generate</code>.</div>`
  }

  const cards = photos
    .map(
      (p) => `
      <article class="card" data-id="${p.id}" role="button" tabindex="0">
        <div class="card-img-wrap">
          <img src="${p.src}" alt="${p.title ?? p.filename}" loading="lazy" width="${p.width ?? ''}" height="${p.height ?? ''}" />
        </div>
        <div class="card-body">
          ${p.title ? `<h2 class="card-title">${escapeHtml(p.title)}</h2>` : ''}
          <time class="card-date" datetime="${p.dateTaken}">${formatDate(p.dateTaken)}</time>
        </div>
      </article>
    `
    )
    .join('')

  return `
    <h1 class="page-title">Latest</h1>
    <div class="masonry">${cards}</div>
  `
}

function renderPhoto(): string {
  const photo = photos.find((p) => p.id === currentId)
  if (!photo) {
    return `<div class="empty">Photo not found. <a href="#/">Back home</a></div>`
  }

  const idx = currentIndex()
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < photos.length - 1
  const counter = photos.length > 0 ? `${idx + 1} / ${photos.length}` : ''

  const exifRows: string[] = []
  const e = photo.exif
  if (e.camera) exifRows.push(`<dt>Camera</dt><dd>${escapeHtml(e.camera)}</dd>`)
  if (e.lens) exifRows.push(`<dt>Lens</dt><dd>${escapeHtml(e.lens)}</dd>`)
  if (e.focalLength) exifRows.push(`<dt>Focal length</dt><dd>${e.focalLength}</dd>`)
  if (e.aperture) exifRows.push(`<dt>Aperture</dt><dd>${e.aperture}</dd>`)
  if (e.shutter) exifRows.push(`<dt>Shutter</dt><dd>${e.shutter}</dd>`)
  if (e.iso != null) exifRows.push(`<dt>ISO</dt><dd>${e.iso}</dd>`)

  return `
    <div class="photo-top">
      <a href="#/" class="back-link">← Back</a>
      <div class="photo-nav">
        <button type="button" class="nav-btn" data-nav="prev" ${hasPrev ? '' : 'disabled'} aria-label="Previous photo">← Prev</button>
        <span class="photo-counter">${counter}</span>
        <button type="button" class="nav-btn" data-nav="next" ${hasNext ? '' : 'disabled'} aria-label="Next photo">Next →</button>
      </div>
    </div>
    <div class="photo-detail">
      <div class="photo-full" data-zoom-src="${photo.src}" data-zoom-alt="${escapeHtml(photo.title ?? photo.filename)}" data-zoom-w="${photo.width ?? ''}" data-zoom-h="${photo.height ?? ''}">
        <img src="${photo.src}" alt="${escapeHtml(photo.title ?? photo.filename)}" />
        <span class="zoom-hint">Click to zoom</span>
      </div>
      <aside class="photo-meta">
        ${photo.title ? `<h1 class="photo-title">${escapeHtml(photo.title)}</h1>` : ''}
        ${photo.description ? `<p class="photo-desc">${escapeHtml(photo.description)}</p>` : ''}
        <time class="photo-datetime" datetime="${photo.dateTaken}">${formatDateTime(photo.dateTaken)}</time>
        ${
          exifRows.length
            ? `
          <div class="exif-block">
            <div class="exif-label">Technical details</div>
            <dl class="exif-grid">${exifRows.join('')}</dl>
          </div>`
            : ''
        }
      </aside>
    </div>
  `
}

function renderAbout(): string {
  return `<article class="about-page" lang="fa" dir="rtl">${aboutHtml}</article>`
}

function renderArchive(): string {
  if (photos.length === 0) {
    return `<div class="empty">No photos yet.</div>`
  }

  const byYear = new Map<number, Map<number, Photo[]>>()
  for (const p of photos) {
    if (!byYear.has(p.year)) byYear.set(p.year, new Map())
    const byMonth = byYear.get(p.year)!
    if (!byMonth.has(p.month)) byMonth.set(p.month, [])
    byMonth.get(p.month)!.push(p)
  }

  const years = [...byYear.keys()].sort((a, b) => b - a)

  const sections = years
    .map((year) => {
      const months = [...byYear.get(year)!.keys()].sort((a, b) => b - a)
      const monthBlocks = months
        .map((month) => {
          const list = byYear.get(year)!.get(month)!
          const thumbs = list
            .map(
              (p) => `
            <a href="#/photo/${encodeURIComponent(p.id)}" class="archive-thumb" title="${p.title ?? p.filename}">
              <img src="${p.src}" alt="${p.title ?? p.filename}" loading="lazy" />
            </a>
          `
            )
            .join('')
          return `
            <div class="archive-month">
              <h3>${MONTH_NAMES[month - 1]}</h3>
              <div class="archive-grid">${thumbs}</div>
            </div>
          `
        })
        .join('')

      return `
        <section class="archive-year">
          <h2>${year}</h2>
          ${monthBlocks}
        </section>
      `
    })
    .join('')

  return `
    <h1 class="page-title">Archive</h1>
    ${sections}
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

let photoKeyHandler: ((e: KeyboardEvent) => void) | null = null

function render(): void {
  closeLightbox()

  if (photoKeyHandler) {
    window.removeEventListener('keydown', photoKeyHandler)
    photoKeyHandler = null
  }

  const app = $('#app')!
  let content = ''
  if (currentView === 'home') content = renderHome()
  else if (currentView === 'photo') content = renderPhoto()
  else if (currentView === 'about') content = renderAbout()
  else content = renderArchive()

  app.innerHTML = `
    ${renderHeader()}
    <main class="main">${content}</main>
    ${renderFooter()}
  `

  if (currentView === 'home') {
    app.querySelectorAll('.card').forEach((el) => {
      const id = (el as HTMLElement).dataset.id!
      el.addEventListener('click', () => navigate(`/photo/${encodeURIComponent(id)}`))
      el.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') navigate(`/photo/${encodeURIComponent(id)}`)
      })
    })
  }

  if (currentView === 'photo') {
    const zoomEl = app.querySelector('.photo-full') as HTMLElement | null
    if (zoomEl) {
      const src = zoomEl.dataset.zoomSrc!
      const alt = zoomEl.dataset.zoomAlt || ''
      const w = zoomEl.dataset.zoomW ? Number(zoomEl.dataset.zoomW) : undefined
      const h = zoomEl.dataset.zoomH ? Number(zoomEl.dataset.zoomH) : undefined
      zoomEl.addEventListener('click', () => openLightbox(src, alt, w, h))
    }

    app.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = (btn as HTMLElement).dataset.nav
        if (dir === 'prev') goRelative(-1)
        else if (dir === 'next') goRelative(1)
      })
    })

    // Arrow keys: left = newer (prev in list which is newest-first), right = older
    // Photos are sorted newest first, so index 0 is newest.
    // Prev button = higher index direction toward older? 
    // Actually: list is newest first. "Prev" in UI often means previous chronologically (older)
    // or previous in gallery order. We'll treat:
    // ← Prev = go to previous in array (newer, lower index) — wait
    // Array: [newest, ..., oldest]
    // "Next →" should go toward older (higher index)
    // "← Prev" toward newer (lower index)
    // Keyboard: ArrowLeft = Prev, ArrowRight = Next
    photoKeyHandler = (e: KeyboardEvent) => {
      if (document.querySelector('.lightbox')) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goRelative(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goRelative(1)
      }
    }
    window.addEventListener('keydown', photoKeyHandler)
  }
}

// ── Boot ─────────────────────────────────────────────

async function loadPhotos(): Promise<void> {
  try {
    const res = await fetch('./data/photos.json')
    if (!res.ok) throw new Error(res.statusText)
    photos = await res.json()
  } catch (err) {
    console.warn('Could not load photos.json', err)
    photos = []
  }
}

async function init() {
  await loadPhotos()
  parseHash()
  window.addEventListener('hashchange', parseHash)
}

init()
