/**
 * [INPUT]: marked (Markdown渲染)，无项目内依赖（避免循环引用 data.ts）
 * [OUTPUT]: parseStoryParagraph (narrative + statHtml + charColor), extractChoices (cleanContent + choices)
 * [POS]: lib AI 回复解析层，Markdown 渲染 + charColor 驱动气泡左边框 + 选项提取
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { marked } from 'marked'

// ── 角色名 → 主题色（手动同步 data.ts，不 import 避免循环依赖） ──

const CHARACTER_COLORS: Record<string, string> = {
  '秦悦': '#8B4789',
  '苏蔓': '#2DB5A0',
  '陈宇轩': '#4A90D9',
  '陆子昂': '#FF8C42',
  '沈哲远': '#5B7FBD',
  '李慕白': '#C49A6C',
}

// ── 数值标签 → 颜色 ──

const STAT_COLORS: Record<string, string> = {
  '团队凝聚力': '#FF7EB3',
  '凝聚力': '#FF7EB3',
  '个人艺能感': '#FFD700',
  '艺能感': '#FFD700',
  '旅行生存技能': '#4ECDC4',
  '生存技能': '#4ECDC4',
  '个人人气': '#FF6B6B',
  '人气': '#FF6B6B',
  '人气值': '#FF6B6B',
  '身心状态': '#A78BFA',
  '身心': '#A78BFA',
  '好感度': '#FF7EB3',
  '好感': '#FF7EB3',
}

// ── 工具函数 ──

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colorizeStats(line: string): string {
  let html = line

  // 属性名着色
  for (const [label, color] of Object.entries(STAT_COLORS)) {
    html = html.replaceAll(
      label,
      `<span class="stat-change" style="color:${color};font-weight:600">${label}</span>`,
    )
  }

  // 角色名着色
  for (const [name] of Object.entries(CHARACTER_COLORS)) {
    html = html.replaceAll(
      name,
      `<span class="char-name">${name}</span>`,
    )
  }

  // 数值变化着色（+绿 -红）
  html = html.replace(
    /(\+\d+[万%]?)/g,
    '<span class="stat-up">$1</span>',
  )
  html = html.replace(
    /(-\d+[万%]?)/g,
    '<span class="stat-down">$1</span>',
  )

  return html
}

function colorizeCharNames(html: string): string {
  let result = html
  for (const [name] of Object.entries(CHARACTER_COLORS)) {
    result = result.replaceAll(
      name,
      `<span class="char-name">${name}</span>`,
    )
  }
  return result
}

// ── 选项提取 ──

// Normalize a line: strip markdown bold/italic wrapping, leading dashes/bullets
function normalizeLine(line: string): string {
  let s = line.trim()
  // strip leading "- " or "* " bullets
  s = s.replace(/^[-*]\s+/, '')
  // strip markdown bold/italic wrapping: **text** → text, *text* → text
  s = s.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
  return s.trim()
}

// Match a numbered choice line, return extracted text or null
function matchChoiceLine(raw: string): string | null {
  const line = normalizeLine(raw)
  // Patterns: "1. text", "1、text", "1．text", "1) text", "(1) text", "① text"
  // Also: "A. text", "A、text", "A) text"
  const patterns = [
    /^[1-4][\.、．\)]\s*(.+)/,           // 1. / 1、/ 1．/ 1)
    /^\([1-4]\)\s*(.+)/,                  // (1)
    /^[A-Da-d][\.、．\)]\s*(.+)/,        // A. / A、/ A)
    /^\([A-Da-d]\)\s*(.+)/,              // (A)
    /^[①②③④]\s*(.+)/,                   // ①②③④
  ]
  for (const pat of patterns) {
    const m = line.match(pat)
    if (m) return m[1].replace(/\*{1,2}/g, '').trim()
  }
  return null
}

export function extractChoices(content: string): {
  cleanContent: string
  choices: string[]
} {
  const lines = content.split('\n')

  // Strategy 1: Scan from end, skip trailing non-choice lines (commentary etc.)
  // Allow up to 3 trailing non-choice/non-empty lines after choices
  let choices: string[] = []
  let choiceStartIdx = lines.length
  let skippedTrailing = 0
  const MAX_TRAILING_SKIP = 3

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()

    // skip empty lines
    if (!trimmed) {
      if (choices.length > 0) continue
      continue
    }

    const choiceText = matchChoiceLine(trimmed)
    if (choiceText) {
      choices.unshift(choiceText)
      choiceStartIdx = i
      skippedTrailing = 0 // reset: we found a choice
    } else if (choices.length === 0 && skippedTrailing < MAX_TRAILING_SKIP) {
      // Haven't found any choice yet; this might be trailing commentary
      skippedTrailing++
      continue
    } else {
      break
    }
  }

  // Strategy 2: If end-scan failed, forward-scan the last 20 lines
  // looking for a block of 2+ consecutive numbered lines
  if (choices.length < 2) {
    choices = []
    choiceStartIdx = lines.length
    const scanStart = Math.max(0, lines.length - 20)
    let blockStart = -1
    const blockChoices: string[] = []

    for (let i = scanStart; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed) continue
      const choiceText = matchChoiceLine(trimmed)
      if (choiceText) {
        if (blockStart < 0) blockStart = i
        blockChoices.push(choiceText)
      } else if (blockChoices.length >= 2) {
        // We have a valid block, stop
        break
      } else {
        // Reset
        blockStart = -1
        blockChoices.length = 0
      }
    }

    if (blockChoices.length >= 2) {
      choices = blockChoices
      choiceStartIdx = blockStart
    }
  }

  if (choices.length < 2) return { cleanContent: content, choices: [] }

  // Also remove header line like "你的选择：" or "**选项：**"
  let cutIdx = choiceStartIdx
  if (cutIdx > 0) {
    const prevLine = lines[cutIdx - 1].trim()
    if (/选择|选项|你可以|接下来|你的行动/.test(prevLine)) {
      cutIdx -= 1
    }
  }

  // Skip empty line before header
  if (cutIdx > 0 && !lines[cutIdx - 1].trim()) {
    cutIdx -= 1
  }

  return {
    cleanContent: lines.slice(0, cutIdx).join('\n').trim(),
    choices,
  }
}

// ── 主解析函数 ──

export function parseStoryParagraph(content: string): {
  narrative: string
  statHtml: string
  charColor: string | null
} {
  const lines = content.split('\n')
  const narrativeLines: string[] = []
  const statParts: string[] = []
  let charColor: string | null = null

  for (const raw of lines) {
    const line = raw.trim()

    // Preserve empty lines for markdown paragraph breaks
    if (!line) { narrativeLines.push(''); continue }

    // 纯数值变化行：【好感度+10 信任度-5】
    if (/^[【\[][^】\]]*[+-]\d+[^】\]]*[】\]]$/.test(line)) {
      statParts.push(colorizeStats(line))
      continue
    }

    // 获得物品
    if (line.startsWith('【获得') || line.startsWith('[获得')) {
      statParts.push(`<div class="item-gain">${escapeHtml(line)}</div>`)
      continue
    }

    // Detect charColor from 【角色名】 pattern
    if (!charColor) {
      const charMatch = line.match(/^[【\[]([^\]】]+)[】\]]/)
      if (charMatch) {
        charColor = CHARACTER_COLORS[charMatch[1]] || null
      }
    }

    narrativeLines.push(raw)
  }

  // Render narrative through marked (Markdown → HTML)
  const rawNarrative = narrativeLines.join('\n').trim()
  const html = rawNarrative ? (marked.parse(rawNarrative, { breaks: true, gfm: true }) as string) : ''

  // Apply character name coloring on rendered HTML
  const narrative = colorizeCharNames(html)

  // Fallback: detect charColor from any character name in content
  if (!charColor) {
    for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
      if (content.includes(name)) {
        charColor = color
        break
      }
    }
  }

  return {
    narrative,
    statHtml: statParts.length > 0
      ? `<div class="stat-changes">${statParts.join('')}</div>`
      : '',
    charColor,
  }
}
