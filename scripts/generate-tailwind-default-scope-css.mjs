/**
 * Downloads tailwindcss default @theme block and writes
 * `src/renderer/src/assets/styles/tailwind-default-scope.css`:
 * full default tokens under `.scope-tailwind-default-theme`, plus Cherry-only
 * radius steps, Shadcn-like semantic colors, and legacy `legacy-vars.css` bridges.
 *
 * Run: node scripts/generate-tailwind-default-scope-css.mjs
 */
import fs from 'node:fs'
import https from 'node:https'

const TW_VERSION = '4.1.13'
const THEME_URL = `https://unpkg.com/tailwindcss@${TW_VERSION}/theme.css`
const OUT = new URL('../src/renderer/src/assets/styles/tailwind-default-scope.css', import.meta.url)

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(fetchText(new URL(res.headers.location, url).href))
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`))
          return
        }
        let data = ''
        res.on('data', (c) => {
          data += c
        })
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

function extractThemeDefaultBlock(src) {
  const marker = '@theme default {'
  const start = src.indexOf(marker)
  if (start < 0) throw new Error('missing @theme default block')
  let i = start + marker.length
  let depth = 1
  while (i < src.length && depth > 0) {
    if (src.slice(i, i + 10) === '@keyframes') {
      let j = i + 10
      while (j < src.length && src[j] !== '{') j++
      let kd = 1
      j++
      while (j < src.length && kd > 0) {
        if (src[j] === '{') kd++
        else if (src[j] === '}') kd--
        j++
      }
      i = j
      continue
    }
    if (src[i] === '{') depth++
    else if (src[i] === '}') depth--
    i++
  }
  return src.slice(start + marker.length, i - 1)
}

function declarationsFromInner(inner) {
  const innerNoKf = inner.replace(/@keyframes[\s\S]*?(?=\n  --|\n\})/g, '')
  const lines = innerNoKf.split('\n')
  const declarations = []
  let current = ''
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('--')) {
      if (current) declarations.push(current.trim())
      current = t
    } else {
      current += ` ${t}`
    }
  }
  if (current) declarations.push(current.trim())
  return declarations
    .map((d) => d.replace(/\s+/g, ' ').replace(/;$/, ''))
    .filter((d) => d.includes(':'))
}

function extractKeyframesFromInner(inner) {
  const blocks = []
  let i = 0
  while (i < inner.length) {
    if (inner.slice(i, i + 10) !== '@keyframes') {
      i++
      continue
    }
    const start = i
    let j = i + 10
    while (j < inner.length && inner[j] !== '{') j++
    if (inner[j] !== '{') throw new Error('keyframes: expected {')
    let kd = 1
    j++
    while (j < inner.length && kd > 0) {
      if (inner[j] === '{') kd++
      else if (inner[j] === '}') kd--
      j++
    }
    blocks.push(inner.slice(start, j).trim())
    i = j
  }
  return blocks
}

function fixThemeFunctions(decl) {
  return decl
    .replace(/--default-font-family:\s*--theme\(([^)]+)\)/, '--default-font-family: var($1)')
    .replace(/--default-font-feature-settings:\s*--theme\(([^)]+)\)/, '--default-font-feature-settings: var($1)')
    .replace(/--default-font-variation-settings:\s*--theme\(([^)]+)\)/, '--default-font-variation-settings: var($1)')
    .replace(/--default-mono-font-family:\s*--theme\(([^)]+)\)/, '--default-mono-font-family: var($1)')
    .replace(/--default-mono-font-feature-settings:\s*--theme\(([^)]+)\)/, '--default-mono-font-feature-settings: var($1)')
    .replace(/--default-mono-font-variation-settings:\s*--theme\(([^)]+)\)/, '--default-mono-font-variation-settings: var($1)')
}

const cherryRadius = [
  '/* Cherry-only radius steps → nearest Tailwind default scale */',
  '--radius-4xs: 0.125rem',
  '--radius-3xs: 0.25rem',
  '--radius-2xs: 0.375rem',
  '--radius-round: 9999px'
]

const brandAsZinc = [
  '/* Cherry-only brand ramp → zinc (so legacy `--color-primary-1` stays neutral on this page) */',
  ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => `--color-brand-${s}: var(--color-zinc-${s})`)
]

const semanticLight = [
  '/* Shadcn-like semantic colors (Tailwind zinc + red); maps `bg-background`, `text-muted-foreground`, etc. */',
  '--color-background: #ffffff',
  '--color-foreground: var(--color-zinc-950)',
  '--color-card: #ffffff',
  '--color-card-foreground: var(--color-zinc-950)',
  '--color-popover: #ffffff',
  '--color-popover-foreground: var(--color-zinc-950)',
  '--color-border: var(--color-zinc-200)',
  '--color-input: var(--color-zinc-200)',
  '--color-ring: var(--color-zinc-400)',
  '--color-muted: var(--color-zinc-100)',
  '--color-muted-foreground: var(--color-zinc-500)',
  '--color-accent: var(--color-zinc-100)',
  '--color-accent-foreground: var(--color-zinc-900)',
  '--color-primary: var(--color-zinc-900)',
  '--color-primary-foreground: var(--color-zinc-50)',
  '--color-secondary: var(--color-zinc-100)',
  '--color-secondary-foreground: var(--color-zinc-900)',
  '--color-destructive: var(--color-red-600)',
  '--color-destructive-foreground: var(--color-red-50)',
  '--primary: var(--color-primary)',
  '--color-background-subtle: var(--color-zinc-50)',
  '--color-foreground-secondary: var(--color-zinc-600)',
  '--color-foreground-muted: var(--color-zinc-500)',
  '--color-border-hover: var(--color-zinc-300)',
  '--color-border-active: var(--color-zinc-400)',
  '--color-secondary-hover: var(--color-zinc-200)',
  '--color-secondary-active: var(--color-zinc-300)',
  '--color-primary-hover: var(--color-zinc-800)',
  '--color-primary-soft: color-mix(in srgb, var(--color-primary) 60%, transparent)',
  '--color-primary-mute: color-mix(in srgb, var(--color-primary) 30%, transparent)',
  '--color-ghost-hover: var(--color-zinc-100)',
  '--color-ghost-active: var(--color-zinc-200)',
  '--color-sidebar: var(--color-zinc-50)',
  '--color-sidebar-accent: var(--color-zinc-100)',
  '--color-success: var(--color-green-600)',
  '--color-warning: var(--color-amber-600)',
  '--color-error-base: var(--color-red-600)',
  '--color-error-text: var(--color-red-700)',
  '--color-error-bg: var(--color-red-50)',
  '--color-error-text-hover: var(--color-red-800)',
  '--color-error-bg-hover: var(--color-red-100)',
  '--color-error-border: var(--color-red-200)',
  '--color-error-border-hover: var(--color-red-300)',
  '--color-error-active: var(--color-red-100)',
  '--color-success-base: var(--color-green-600)',
  '--color-success-text-hover: var(--color-green-700)',
  '--color-success-bg: var(--color-green-50)',
  '--color-success-bg-hover: var(--color-green-100)',
  '--color-warning-base: var(--color-amber-600)',
  '--color-warning-text-hover: var(--color-amber-700)',
  '--color-warning-bg: var(--color-amber-50)',
  '--color-warning-bg-hover: var(--color-amber-100)',
  '--color-warning-active: var(--color-amber-100)'
]

const semanticDark = [
  '--color-background: var(--color-zinc-950)',
  '--color-foreground: var(--color-zinc-50)',
  '--color-card: var(--color-zinc-950)',
  '--color-card-foreground: var(--color-zinc-50)',
  '--color-popover: var(--color-zinc-950)',
  '--color-popover-foreground: var(--color-zinc-50)',
  '--color-border: var(--color-zinc-800)',
  '--color-input: var(--color-zinc-800)',
  '--color-ring: var(--color-zinc-500)',
  '--color-muted: var(--color-zinc-900)',
  '--color-muted-foreground: var(--color-zinc-400)',
  '--color-accent: var(--color-zinc-900)',
  '--color-accent-foreground: var(--color-zinc-50)',
  '--color-primary: var(--color-zinc-50)',
  '--color-primary-foreground: var(--color-zinc-950)',
  '--color-secondary: var(--color-zinc-900)',
  '--color-secondary-foreground: var(--color-zinc-50)',
  '--color-destructive: var(--color-red-500)',
  '--color-destructive-foreground: var(--color-red-50)',
  '--primary: var(--color-primary)',
  '--color-background-subtle: var(--color-zinc-900)',
  '--color-foreground-secondary: var(--color-zinc-400)',
  '--color-foreground-muted: var(--color-zinc-500)',
  '--color-border-hover: var(--color-zinc-700)',
  '--color-border-active: var(--color-zinc-600)',
  '--color-secondary-hover: var(--color-zinc-800)',
  '--color-secondary-active: var(--color-zinc-700)',
  '--color-primary-hover: var(--color-zinc-200)',
  '--color-primary-soft: color-mix(in srgb, var(--color-primary) 60%, transparent)',
  '--color-primary-mute: color-mix(in srgb, var(--color-primary) 30%, transparent)',
  '--color-ghost-hover: var(--color-zinc-900)',
  '--color-ghost-active: var(--color-zinc-800)',
  '--color-sidebar: var(--color-zinc-950)',
  '--color-sidebar-accent: var(--color-zinc-900)',
  '--color-success: var(--color-green-500)',
  '--color-warning: var(--color-amber-500)',
  '--color-error-base: var(--color-red-500)',
  '--color-error-text: var(--color-red-400)',
  '--color-error-bg: color-mix(in srgb, var(--color-red-500) 15%, transparent)',
  '--color-error-text-hover: var(--color-red-300)',
  '--color-error-bg-hover: color-mix(in srgb, var(--color-red-500) 22%, transparent)',
  '--color-error-border: color-mix(in srgb, var(--color-red-500) 35%, transparent)',
  '--color-error-border-hover: color-mix(in srgb, var(--color-red-500) 45%, transparent)',
  '--color-error-active: color-mix(in srgb, var(--color-red-500) 25%, transparent)',
  '--color-success-base: var(--color-green-500)',
  '--color-success-text-hover: var(--color-green-400)',
  '--color-success-bg: color-mix(in srgb, var(--color-green-500) 15%, transparent)',
  '--color-success-bg-hover: color-mix(in srgb, var(--color-green-500) 22%, transparent)',
  '--color-warning-base: var(--color-amber-500)',
  '--color-warning-text-hover: var(--color-amber-400)',
  '--color-warning-bg: color-mix(in srgb, var(--color-amber-500) 15%, transparent)',
  '--color-warning-bg-hover: color-mix(in srgb, var(--color-amber-500) 22%, transparent)',
  '--color-warning-active: color-mix(in srgb, var(--color-amber-500) 25%, transparent)'
]

/** Mirrors `legacy-vars.css` :root so `var(--color-text-1)` etc. resolve under the scope. */
const legacyBridgeLight = [
  '/* legacy-vars.css bridge (scoped) */',
  '--color-text-1: var(--color-foreground)',
  '--color-text-2: var(--color-foreground-secondary)',
  '--color-text-3: var(--color-foreground-muted)',
  '--color-text: var(--color-text-1)',
  '--color-text-secondary: var(--color-text-2)',
  '--color-text-soft: var(--color-text-2)',
  '--color-text-light: var(--color-foreground)',
  '--color-background-soft: color-mix(in srgb, var(--color-background) 96%, var(--color-foreground) 4%)',
  '--color-background-mute: color-mix(in srgb, var(--color-background) 92%, var(--color-foreground) 8%)',
  '--color-background-opacity: color-mix(in srgb, var(--color-background) 88%, transparent)',
  '--color-border-soft: color-mix(in srgb, var(--color-border) 60%, transparent)',
  '--color-border-mute: color-mix(in srgb, var(--color-border) 30%, transparent)',
  '--color-error: var(--color-error-base)',
  '--color-link: #1677ff',
  '--color-primary-bg: var(--color-primary-soft)',
  '--color-fill-secondary: var(--color-background-soft)',
  '--color-fill-2: var(--color-background-soft)',
  '--color-bg-base: var(--color-background)',
  '--color-bg-1: var(--color-background-soft)',
  '--color-code-background: #e3e3e3',
  '--color-inline-code-background: rgba(0, 0, 0, 0.06)',
  '--color-inline-code-text: rgb(218, 97, 92)',
  '--color-hover: var(--color-background-mute)',
  '--color-active: var(--color-background-soft)',
  '--color-frame-border: #ddd',
  '--color-group-background: var(--color-background-soft)',
  '--color-reference: #cfe1ff',
  '--color-reference-text: #000000',
  '--color-reference-background: #f1f7ff',
  '--color-list-item: #fff',
  '--color-list-item-hover: #fafafa',
  '--color-highlight: initial',
  '--color-background-highlight: rgba(255, 255, 0, 0.5)',
  '--color-background-highlight-accent: rgba(255, 150, 50, 0.5)',
  '--navbar-background-mac: rgba(255, 255, 255, 0.55)',
  '--navbar-background: rgb(244, 244, 244)',
  '--modal-background: var(--color-card)',
  '--chat-background: transparent',
  '--chat-background-user: rgba(0, 0, 0, 0.045)',
  '--chat-background-assistant: transparent',
  '--chat-text-user: var(--color-text)',
  '--list-item-border-radius: 10px',
  '--color-gray-1: #8e8e93',
  '--color-gray-2: #aeaeb2',
  '--color-gray-3: #c7c7cc',
  '--color-icon-white: var(--color-black)',
  '--color-primary-1: var(--color-brand-50)',
  '--color-primary-6: var(--color-primary)',
  '--color-status-success: var(--color-success)',
  '--color-status-error: var(--color-error)',
  '--color-status-warning: var(--color-warning)'
]

const legacyBridgeDark = [
  '--color-code-background: #323232',
  '--color-inline-code-background: #323232',
  '--color-inline-code-text: rgb(218, 97, 92)',
  '--color-hover: color-mix(in srgb, var(--color-background) 82%, var(--color-foreground) 18%)',
  '--color-active: color-mix(in srgb, var(--color-background) 74%, var(--color-foreground) 26%)',
  '--color-frame-border: #333',
  '--color-reference: #404040',
  '--color-reference-text: #ffffff',
  '--color-reference-background: #0b0e12',
  '--color-list-item: rgba(255, 255, 255, 0.1)',
  '--color-list-item-hover: rgba(255, 255, 255, 0.05)',
  '--color-highlight: rgba(0, 0, 0, 1)',
  '--color-background-highlight: rgba(255, 255, 0, 0.9)',
  '--color-background-highlight-accent: rgba(255, 150, 50, 0.9)',
  '--navbar-background-mac: rgba(20, 20, 20, 0.55)',
  '--navbar-background: #1f1f1f',
  '--modal-background: #111111',
  '--chat-background-user: rgba(255, 255, 255, 0.08)',
  '--chat-text-user: var(--color-black)',
  '--color-gray-1: #515c67',
  '--color-gray-2: #414853',
  '--color-gray-3: #32363f',
  '--color-icon-white: var(--color-white)',
  '--color-link: #338cff'
]

function emitDecls(lines) {
  return lines.flatMap((line) => {
    if (line.startsWith('/*')) return [`    ${line}`]
    return [`    ${line};`]
  })
}

const src = await fetchText(THEME_URL)
const inner = extractThemeDefaultBlock(src)
const keyframes = extractKeyframesFromInner(inner)
const decls = declarationsFromInner(inner).map(fixThemeFunctions)

const header = `/**
 * Tailwind CSS v${TW_VERSION} default @theme tokens + Cherry radius extensions +
 * neutral semantic palette + legacy-vars bridge. Scoped to .scope-tailwind-default-theme only.
 *
 * Regenerate: node scripts/generate-tailwind-default-scope-css.mjs
 */
`

const body = [
  header,
  ...keyframes.map((k) => `${k}\n`),
  '',
  '@layer components {',
  '  .scope-tailwind-default-theme {',
  ...emitDecls(decls),
  ...emitDecls(cherryRadius),
  ...emitDecls(brandAsZinc),
  ...emitDecls(semanticLight),
  ...emitDecls(legacyBridgeLight),
  '  }',
  '',
  '  .dark .scope-tailwind-default-theme {',
  ...emitDecls(semanticDark),
  ...emitDecls(legacyBridgeDark),
  '  }',
  '}',
  ''
].join('\n')

fs.mkdirSync(new URL('.', OUT), { recursive: true })
fs.writeFileSync(OUT, body)
console.log('Wrote', OUT.pathname, `(${fs.statSync(OUT).size} bytes)`)
