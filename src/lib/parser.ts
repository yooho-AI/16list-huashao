/**
 * [INPUT]: 无外部依赖（不 import data.ts，避免循环依赖）
 * [OUTPUT]: 对外提供 parseStoryParagraph 解析函数
 * [POS]: AI 回复文本解析，角色名着色 + 数值着色
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 角色颜色映射（硬编码，不 import data.ts）──────────

const CHARACTER_COLORS: Record<string, string> = {
  '秦悦': '#8B4789',
  '苏蔓': '#2DB5A0',
  '陈宇轩': '#4A90D9',
  '陆子昂': '#FF8C42',
  '沈哲远': '#5B7FBD',
  '李慕白': '#C49A6C',
}

// ── 属性颜色映射 ────────────────────────────────────

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

// ── 解析函数 ─────────────────────────────────────────

export function parseStoryParagraph(content: string): {
  narrative: string
  statHtml: string
  charColor: string | null
} {
  const lines = content.split('\n')
  const narrativeLines: string[] = []
  const statLines: string[] = []
  let charColor: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // 检测属性变化行
    if (/【.*变化】/.test(trimmed) || /^[【\[]?(属性|数值|状态)/.test(trimmed) || /[+\-]\d+/.test(trimmed)) {
      let html = trimmed

      // 角色名着色
      for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
        html = html.replace(
          new RegExp(name, 'g'),
          `<span style="color:${color};font-weight:600">${name}</span>`,
        )
      }

      // 属性名着色
      for (const [label, color] of Object.entries(STAT_COLORS)) {
        html = html.replace(
          new RegExp(label, 'g'),
          `<span style="color:${color};font-weight:600">${label}</span>`,
        )
      }

      // 数值变化着色（+绿 -红）
      html = html.replace(
        /(\+\d+[万%]?)/g,
        '<span style="color:#4ade80;font-weight:700">$1</span>',
      )
      html = html.replace(
        /(-\d+[万%]?)/g,
        '<span style="color:#f87171;font-weight:700">$1</span>',
      )

      statLines.push(html)
      continue
    }

    narrativeLines.push(trimmed)
  }

  // 检测第一个出现的角色名，提取主题色
  const narrative = narrativeLines.join('\n')
  for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
    if (narrative.includes(name)) {
      charColor = color
      break
    }
  }

  // 叙事部分也做角色名着色
  let narrativeHtml = narrative
  for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
    narrativeHtml = narrativeHtml.replace(
      new RegExp(name, 'g'),
      `<span style="color:${color};font-weight:600">${name}</span>`,
    )
  }

  return {
    narrative: narrativeHtml,
    statHtml: statLines.join('<br/>'),
    charColor,
  }
}
