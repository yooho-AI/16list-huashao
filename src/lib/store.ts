/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+双轨解析+链式反应+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat, type Message as StreamMessage } from './stream'
import {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type GlobalResources,
  PERIODS,
  MAX_DAYS,
  MAX_ACTION_POINTS,
  GLOBAL_STATS,
  SCENES,
  ITEMS,
  CHAPTERS,
  FORCED_EVENTS,
  STORY_INFO,
  buildCharacters,
} from './data'
import { parseStoryParagraph } from './parser'
import {
  trackGameStart,
  trackPlayerCreate,
  trackTimeAdvance,
  trackChapterEnter,
  trackEndingReached,
  trackSceneUnlock,
  trackWellbeingCrisis,
} from './analytics'

// ── Re-export data.ts ────────────────────────────────
export {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type GlobalResources,
  type TimePeriod,
  PERIODS,
  MAX_DAYS,
  MAX_ACTION_POINTS,
  GLOBAL_STATS,
  SCENES,
  ITEMS,
  CHAPTERS,
  FORCED_EVENTS,
  ENDINGS,
  ENDING_TYPE_MAP,
  STORY_INFO,
  QUICK_ACTIONS,
} from './data'
export { parseStoryParagraph } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'huashao-save-v1'
const HISTORY_COMPRESS_THRESHOLD = 15

function getCurrentChapter(day: number) {
  return CHAPTERS.find((c) => day >= c.dayRange[0] && day <= c.dayRange[1]) || CHAPTERS[0]
}

// ── State / Actions ──────────────────────────────────

interface GameState {
  gameStarted: boolean
  playerName: string
  characters: Record<string, Character>

  currentDay: number
  currentPeriodIndex: number
  actionPoints: number

  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  globalResources: GlobalResources
  currentChapter: number
  triggeredEvents: string[]
  inventory: Record<string, number>

  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string

  endingType: string | null

  activeTab: 'dialogue' | 'scene' | 'character'
  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (name: string) => void
  initGame: () => void
  selectCharacter: (charId: string) => void
  selectScene: (sceneId: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
  sendMessage: (content: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ── Dual-track parseStatChanges ──────────────────────

interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ key: string; delta: number }>
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>,
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  const GLOBAL_ALIASES: Record<string, string> = {
    '团队凝聚力': 'cohesion', '凝聚力': 'cohesion',
    '个人艺能感': 'charisma', '艺能感': 'charisma',
    '旅行生存技能': 'survival', '生存技能': 'survival',
    '个人人气': 'popularity', '人气': 'popularity', '人气值': 'popularity',
    '身心状态': 'wellbeing', '身心': 'wellbeing',
  }

  // Track 1: Character stat changes — 【角色名 好感+N】
  const charRegex = /[【\[]([^\]】]+?)\s+(好感度?|好感)([+-])(\d+)[】\]]/g
  let match
  while ((match = charRegex.exec(content))) {
    const [, charName, , sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const charId = nameToId[charName]
    if (charId) {
      charChanges.push({ charId, stat: 'favor', delta })
    }
  }

  // Track 2: Global stat changes — 【凝聚力+10】
  const globalRegex = /[【\[]([^\s\]】+-]+?)([+-])(\d+)[万]?[】\]]/g
  let gMatch
  while ((gMatch = globalRegex.exec(content))) {
    const [, label, sign, numStr] = gMatch
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const globalKey = GLOBAL_ALIASES[label]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
    }
  }

  return { charChanges, globalChanges }
}

// ── buildSystemPrompt — Script-through ───────────────

function buildStatsSnapshot(state: GameState): string {
  const globals = GLOBAL_STATS.map(
    (m) => `${m.icon} ${m.label}: ${state.globalResources[m.key as keyof GlobalResources]}${m.unit ? m.unit : ''}`,
  ).join('\n')

  const npcs = Object.entries(state.characterStats)
    .map(([charId, stats]) => {
      const char = state.characters[charId]
      if (!char) return ''
      return `${char.name}: 好感度 ${stats.favor}/100`
    })
    .filter(Boolean)
    .join('\n')

  return `全局属性:\n${globals}\n\nNPC好感:\n${npcs}`
}

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentDay)
  const scene = SCENES[state.currentScene]
  const period = PERIODS[state.currentPeriodIndex] || PERIODS[0]

  return `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「${state.playerName}」（新晋小花）
第${state.currentDay}天 · ${period}
第${chapter.id}章「${chapter.name}」— ${chapter.subtitle}
当前场景：${scene?.name || '未知'}
${char ? `当前交互角色：${char.name}（${char.title}）` : ''}
行动力：${state.actionPoints}/${MAX_ACTION_POINTS}

## 当前数值
${buildStatsSnapshot(state)}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
  const item = ITEMS.find((i) => i.id === k)
  return item ? `${item.icon} ${item.name} x${v}` : ''
}).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}

## 历史摘要
${state.historySummary || '旅程刚刚开始'}

## 输出格式
- 每段回复 200-400 字（关键剧情 500-800 字）
- 角色对话用引号：秦悦微微一笑："小姑娘，未来可期。"
- 数值变化：【团队凝聚力+8】【秦悦 好感+5】【身心状态-10】
- 保持综艺真人秀的叙事风格，镜头感强，穿插旁白和花字
- 严格遵循剧本中的角色性格、隐藏关系和事件触发条件`
}

// ── Chain Reactions ──────────────────────────────────

function applyChainReactions(state: GameState): void {
  const g = state.globalResources

  // 团魂燃烧：凝聚力≥80 → 全员好感+3
  if (g.cohesion >= 80) {
    for (const charId of Object.keys(state.characterStats)) {
      state.characterStats[charId].favor = Math.min(100, state.characterStats[charId].favor + 3)
    }
  }

  // 濒临崩溃：身心状态≤30 → 艺能感效果减半（在sendMessage中处理显示）
  if (g.wellbeing <= 30) {
    trackWellbeingCrisis(g.wellbeing)
  }

  // 流量担当：人气≥5000万 → 凝聚力小幅提升
  if (g.popularity >= 5000 && g.cohesion < 90) {
    g.cohesion = Math.min(100, g.cohesion + 2)
  }
}

// ── Store ────────────────────────────────────────────

const initialInventory: Record<string, number> = {}
for (const item of ITEMS) initialInventory[item.id] = item.quantity

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
    gameStarted: false,
    playerName: '',
    characters: {},

    currentDay: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,

    currentScene: 'guesthouse',
    currentCharacter: null,
    characterStats: {},
    unlockedScenes: ['guesthouse', 'market'],

    globalResources: {
      cohesion: 50,
      charisma: 40,
      survival: 35,
      popularity: 500,
      wellbeing: 80,
    },
    currentChapter: 1,
    triggeredEvents: [],
    inventory: { ...initialInventory },

    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',

    endingType: null,

    activeTab: 'dialogue',
    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

    setPlayerInfo: (name) => {
      set((s) => {
        s.playerName = name
      })
    },

    initGame: () => {
      const state = get()
      trackGameStart()
      trackPlayerCreate(state.playerName)

      set((s) => {
        s.gameStarted = true
        s.characters = buildCharacters(s.playerName)

        const stats: Record<string, CharacterStats> = {}
        for (const [id, char] of Object.entries(s.characters)) {
          stats[id] = { ...char.initialStats }
        }
        s.characterStats = stats

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `欢迎来到《花儿与少年：星光之旅》！\n\n你是刚凭热播剧崭露头角的新晋小花「${s.playerName}」，即将与六位前辈踏上21天的异国穷游之旅。\n\n摄像机24小时开启——你的每个选择，都将决定你的星途与人生。`,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          day: 1,
          period: '清晨',
          title: '星光之旅开启',
          content: `${s.playerName}正式加入花少团，旅程从此刻开始。`,
        })
      })
    },

    selectCharacter: (charId) => {
      set((s) => {
        s.currentCharacter = charId
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (sceneId) => {
      const state = get()
      if (!state.unlockedScenes.includes(sceneId)) return
      if (state.currentScene === sceneId) return

      trackSceneUnlock(sceneId)

      set((s) => {
        s.currentScene = sceneId
        s.activeTab = 'dialogue'

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${SCENES[sceneId].name}。${SCENES[sceneId].atmosphere}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId,
        })
      })
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (content) => {
      const state = get()
      if (state.isTyping || state.endingType) return

      // Push user message
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'user',
          content,
          timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
      })

      // Compress history if needed
      const currentState = get()
      if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD) {
        const oldMessages = currentState.messages.slice(0, -10)
        const summary = oldMessages
          .filter((m) => m.role !== 'system' || m.type)
          .map((m) => `[${m.role}] ${m.content.slice(0, 80)}`)
          .join('\n')

        set((s) => {
          s.historySummary = (s.historySummary + '\n' + summary).slice(-2000)
          s.messages = s.messages.slice(-10)
        })
      }

      // Build prompt and stream
      const promptState = get()
      const systemPrompt = buildSystemPrompt(promptState)
      const recentMessages = promptState.messages
        .filter((m) => !m.type)
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      let fullContent = ''

      try {
        const chatMessages: StreamMessage[] = [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ]

        await streamChat(
          chatMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => {
              s.streamingContent = fullContent
            })
          },
          () => {},
        )

        // Parse stat changes
        const afterState = get()
        const { charChanges, globalChanges } = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, char] of Object.entries(afterState.characters)) {
            if (char.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        set((s) => {
          // Apply character stat changes
          for (const change of charChanges) {
            if (s.characterStats[change.charId]) {
              const curr = s.characterStats[change.charId][change.stat as keyof CharacterStats] as number
              const meta = { min: 0, max: 100 }
              ;(s.characterStats[change.charId] as Record<string, number>)[change.stat] =
                Math.max(meta.min, Math.min(meta.max, curr + change.delta))
            }
          }

          // Apply global stat changes
          for (const change of globalChanges) {
            const key = change.key as keyof GlobalResources
            const meta = GLOBAL_STATS.find((m) => m.key === key)
            if (meta) {
              s.globalResources[key] = Math.max(
                meta.min,
                Math.min(meta.max, s.globalResources[key] + change.delta),
              )
            }
          }

          // Chain reactions
          applyChainReactions(s)

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
            character: detectedChar || undefined,
          })

          // Record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period,
            title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
            content: fullContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Check ending
        checkEndingImpl(get(), set)
      } catch (err) {
        set((s) => {
          s.isTyping = false
          s.streamingContent = ''
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `请求失败: ${err instanceof Error ? err.message : '未知错误'}`,
            timestamp: Date.now(),
          })
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentPeriodIndex += 1

        // Cross-day boundary
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay += 1
          s.actionPoints = MAX_ACTION_POINTS

          // Natural decay/growth per day
          s.globalResources.wellbeing = Math.max(0, s.globalResources.wellbeing - 5)
          s.globalResources.popularity = Math.max(0, s.globalResources.popularity + 50)

          const period = PERIODS[0]
          trackTimeAdvance(s.currentDay, period)

          // Day-change rich message
          const chapter = getCurrentChapter(s.currentDay)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentDay}天 · ${period}`,
            timestamp: Date.now(),
            type: 'day-change',
            dayInfo: { day: s.currentDay, period, chapter: chapter.name },
          })

          // Chapter progression
          if (chapter.id !== s.currentChapter) {
            s.currentChapter = chapter.id
            trackChapterEnter(chapter.id)

            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `— 第${chapter.id}章「${chapter.name}」${chapter.subtitle} —`,
              timestamp: Date.now(),
            })
          }

          // Record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period,
            title: `进入第${s.currentDay}天`,
            content: `${getCurrentChapter(s.currentDay).name} · ${period}`,
          })

          // Unlock scenes based on progress
          if (s.currentDay >= 3 && !s.unlockedScenes.includes('seaside')) {
            s.unlockedScenes.push('seaside')
            trackSceneUnlock('seaside')
          }
          if (s.currentDay >= 5 && !s.unlockedScenes.includes('ruins')) {
            s.unlockedScenes.push('ruins')
            trackSceneUnlock('ruins')
          }
          if (s.currentDay >= 2 && !s.unlockedScenes.includes('restaurant')) {
            s.unlockedScenes.push('restaurant')
            trackSceneUnlock('restaurant')
          }
          if (s.currentDay >= 7 && !s.unlockedScenes.includes('transit')) {
            s.unlockedScenes.push('transit')
            trackSceneUnlock('transit')
          }
        } else {
          const period = PERIODS[s.currentPeriodIndex]
          trackTimeAdvance(s.currentDay, period)
        }

        // Check forced events
        const currentPeriod = PERIODS[s.currentPeriodIndex]
        for (const event of FORCED_EVENTS) {
          if (s.triggeredEvents.includes(event.id)) continue
          if (event.day !== 0 && event.day !== s.currentDay) continue
          if (event.period !== currentPeriod) continue

          // Check conditions
          let condMet = true
          if (event.condition) {
            const g = s.globalResources
            if (event.condition.includes('charisma >= 60') && g.charisma < 60) condMet = false
            if (event.condition.includes('cohesion <= 40') && g.cohesion > 40) condMet = false
            if (event.condition.includes('wellbeing <= 35') && g.wellbeing > 35) condMet = false
          }

          if (condMet) {
            s.triggeredEvents.push(event.id)
            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `📢 ${event.title}\n${event.description}`,
              timestamp: Date.now(),
            })
            s.storyRecords.push({
              id: `sr-${Date.now()}-evt`,
              day: s.currentDay,
              period: currentPeriod,
              title: event.title,
              content: event.description,
            })
          }
        }

        // Check ending at MAX_DAYS
        if (s.currentDay > MAX_DAYS) {
          // Will be handled by checkEnding
        }
      })

      // Check ending after state update
      const state = get()
      checkEndingImpl(state, set)
    },

    useItem: (itemId) => {
      set((s) => {
        const count = s.inventory[itemId]
        if (!count || count <= 0) return

        s.inventory[itemId] -= 1
        const item = ITEMS.find((i) => i.id === itemId)
        if (!item) return

        // Apply item effects
        switch (itemId) {
          case 'emergency-fund':
            s.globalResources.cohesion = Math.min(100, s.globalResources.cohesion + 10)
            break
          case 'translator':
            s.globalResources.survival = Math.min(100, s.globalResources.survival + 15)
            break
          case 'first-aid':
            s.globalResources.wellbeing = Math.min(100, s.globalResources.wellbeing + 20)
            break
          case 'selfie-stick':
            s.globalResources.popularity += 100
            break
          case 'energy-drink':
            s.globalResources.wellbeing = Math.min(100, s.globalResources.wellbeing + 15)
            break
          case 'travel-guide':
            s.globalResources.survival = Math.min(100, s.globalResources.survival + 10)
            break
        }

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `${item.icon} 使用了「${item.name}」— ${item.effect}`,
          timestamp: Date.now(),
        })
      })
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.playerName = ''
        s.characters = {}
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'guesthouse'
        s.currentCharacter = null
        s.characterStats = {}
        s.unlockedScenes = ['guesthouse', 'market']
        s.globalResources = { cohesion: 50, charisma: 40, survival: 35, popularity: 500, wellbeing: 80 }
        s.currentChapter = 1
        s.triggeredEvents = []
        s.inventory = { ...initialInventory }
        s.messages = []
        s.historySummary = ''
        s.isTyping = false
        s.streamingContent = ''
        s.endingType = null
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
    },

    saveGame: () => {
      const state = get()
      const save = {
        playerName: state.playerName,
        currentDay: state.currentDay,
        currentPeriodIndex: state.currentPeriodIndex,
        actionPoints: state.actionPoints,
        currentScene: state.currentScene,
        currentCharacter: state.currentCharacter,
        characterStats: state.characterStats,
        unlockedScenes: state.unlockedScenes,
        globalResources: state.globalResources,
        currentChapter: state.currentChapter,
        triggeredEvents: state.triggeredEvents,
        inventory: state.inventory,
        messages: state.messages.slice(-30),
        historySummary: state.historySummary,
        storyRecords: state.storyRecords.slice(-50),
        endingType: state.endingType,
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save))
      } catch { /* 静默 */ }
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const save = JSON.parse(raw)

        set((s) => {
          s.gameStarted = true
          s.playerName = save.playerName
          s.characters = buildCharacters(save.playerName)
          s.currentDay = save.currentDay
          s.currentPeriodIndex = save.currentPeriodIndex
          s.actionPoints = save.actionPoints
          s.currentScene = save.currentScene
          s.currentCharacter = save.currentCharacter
          s.characterStats = save.characterStats
          s.unlockedScenes = save.unlockedScenes
          s.globalResources = save.globalResources
          s.currentChapter = save.currentChapter
          s.triggeredEvents = save.triggeredEvents
          s.inventory = save.inventory
          s.messages = save.messages || []
          s.historySummary = save.historySummary || ''
          s.storyRecords = save.storyRecords || []
          s.endingType = save.endingType
        })
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        return !!localStorage.getItem(SAVE_KEY)
      } catch {
        return false
      }
    },

    clearSave: () => {
      try {
        localStorage.removeItem(SAVE_KEY)
      } catch { /* 静默 */ }
    },
  })),
)

// ── Ending check (extracted) ─────────────────────────

function checkEndingImpl(
  state: GameState,
  set: (fn: (s: GameState) => void) => void,
) {
  if (state.endingType) return
  const g = state.globalResources
  const stats = state.characterStats
  const favorValues = Object.values(stats).map((s) => s.favor)
  const highFavorCount = favorValues.filter((f) => f >= 80).length
  const allAbove70 = favorValues.every((f) => f >= 70)

  let ending: string | null = null

  // BE priority
  if (g.wellbeing <= 10) {
    ending = 'breakdown'
  } else if (g.popularity <= 500 && g.cohesion <= 30) {
    ending = 'blacklisted'
  }
  // TE
  else if (g.popularity >= 8000 && g.cohesion <= 50) {
    ending = 'controversial-star'
  } else if (
    (stats.luziang?.favor >= 90 || stats.shenzheyuan?.favor >= 90) &&
    favorValues.filter((f) => f >= 60).length < 4
  ) {
    ending = 'cp-viral'
  }
  // HE
  else if (
    state.currentDay > MAX_DAYS &&
    g.popularity >= 10000 &&
    g.cohesion >= 75 &&
    highFavorCount >= 3 &&
    g.wellbeing >= 50
  ) {
    ending = 'starlight'
  } else if (
    state.currentDay > MAX_DAYS &&
    g.cohesion >= 90 &&
    allAbove70
  ) {
    ending = 'team-darling'
  }
  // NE
  else if (state.currentDay > MAX_DAYS) {
    ending = 'invisible'
  }

  if (ending) {
    trackEndingReached(ending)
    set((s) => {
      s.endingType = ending
    })
  }
}
