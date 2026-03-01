/**
 * [INPUT]: 依赖 store.ts 状态，styles/*.css
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 根组件: 三幕开场(经纪人消息→热搜速览→化妆间通告单) + GameScreen + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, ENDINGS, ENDING_TYPE_MAP, STORY_INFO } from '@/lib/store'
import { trackGameStart, trackGameContinue } from '@/lib/analytics'
import { initBGM } from '@/lib/bgm'
import AppShell from '@/components/game/app-shell'
import './styles/globals.css'
import './styles/opening.css'
import './styles/rich-cards.css'

// ── 经纪人消息数据 ──────────────────────────────────

const CHAT_MESSAGES = [
  { text: '宝贝你在吗！！！', warn: false },
  { text: '花少节目组打电话来了', warn: false },
  { text: '你被选为第七位嘉宾！！！', warn: false },
  { text: '六位前辈全是大咖，你是最小的', warn: false },
  { text: '21天异国穷游，全程跟拍', warn: false },
  { text: '记住：少说话，多微笑，千万别站错队', warn: true },
]

// ── 热搜数据 ────────────────────────────────────────

const HOT_ITEMS = [
  { tag: '#影后秦悦加盟花少#', text: '十年来首次参加综艺，据传要求极高', portrait: '/characters/qinyue.jpg', rank: 1 },
  { tag: '#苏蔓秦悦同框#', text: '十年宿敌同住一屋？够吃21天的瓜', portrait: '/characters/suman.jpg', rank: 2 },
  { tag: '#陈宇轩生活白痴#', text: '顶流歌手被曝连泡面都不会煮', portrait: '/characters/chenyuxuan.jpg', rank: 3 },
  { tag: '#陆子昂国民男友#', text: '最年轻男嘉宾，和新晋小花年龄最接近👀', portrait: '/characters/luziang.jpg', rank: 4 },
  { tag: '#沈哲远花少#', text: '金牌主持人坐镇，据说私下非常温柔', portrait: '/characters/shenzheyuan.jpg', rank: 5 },
  { tag: '#李慕白主动管钱#', text: '55岁老艺术家自告奋勇当财务，靠谱吗？', portrait: '/characters/limubai.jpg', rank: 6 },
  { tag: '#花少第七位嘉宾是谁#', text: '新晋小花即将公布，今年最大黑马', portrait: '', rank: 0, isPlayer: true },
]

// ── Opening Screen ──────────────────────────────────

function OpeningScreen({ onStart }: { onStart: (name: string) => void }) {
  const [phase, setPhase] = useState<'chat' | 'hotsearch' | 'makeup'>('chat')
  const [chatIndex, setChatIndex] = useState(0)
  const [chatDone, setChatDone] = useState(false)
  const [hotIndex, setHotIndex] = useState(0)
  const [hotDone, setHotDone] = useState(false)
  const [name, setName] = useState('')
  const hasSave = useGameStore((s) => s.hasSave)
  const loadGame = useGameStore((s) => s.loadGame)

  // Continue saved game
  const handleContinue = useCallback(() => {
    initBGM()
    trackGameContinue()
    loadGame()
  }, [loadGame])

  // Auto-advance chat messages
  useEffect(() => {
    if (phase !== 'chat' || chatDone) return
    if (chatIndex >= CHAT_MESSAGES.length) {
      setChatDone(true)
      return
    }
    const delay = chatIndex === 0 ? 800 : 1200
    const timer = setTimeout(() => setChatIndex((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [phase, chatIndex, chatDone])

  // Auto-advance hot search
  useEffect(() => {
    if (phase !== 'hotsearch' || hotDone) return
    if (hotIndex >= HOT_ITEMS.length) {
      setHotDone(true)
      return
    }
    const delay = hotIndex === 0 ? 600 : 1200
    const timer = setTimeout(() => setHotIndex((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [phase, hotIndex, hotDone])

  // ── Phase 1: 经纪人深夜消息 ──
  if (phase === 'chat') {
    return (
      <div className="hs-phone">
        <div className="hs-phone-status">
          <span className="hs-phone-time">23:47</span>
        </div>

        <div className="hs-phone-chat">
          {/* 发送者头部 */}
          <div className="hs-chat-sender">
            <div className="hs-chat-avatar">👩</div>
            <span className="hs-chat-name">经纪人 · 姐姐</span>
          </div>

          {/* 消息气泡 */}
          {CHAT_MESSAGES.slice(0, chatIndex).map((msg, i) => (
            <motion.div
              key={i}
              className={`hs-chat-bubble ${msg.warn ? 'hs-chat-bubble-warning' : ''}`}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 400, damping: 25 }}
            >
              {msg.warn ? '⚠️ ' : ''}{msg.text}
            </motion.div>
          ))}

          {/* 打字中 */}
          {!chatDone && chatIndex < CHAT_MESSAGES.length && (
            <div className="hs-chat-typing">
              <div className="hs-chat-typing-dot" />
              <div className="hs-chat-typing-dot" />
              <div className="hs-chat-typing-dot" />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {chatDone && (
          <motion.div
            className="hs-phone-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="hs-phone-cta"
              onClick={() => { initBGM(); setPhase('hotsearch') }}
            >
              查看嘉宾名单
            </button>
            {hasSave() && (
              <button className="hs-phone-secondary" onClick={handleContinue}>
                继续录制
              </button>
            )}
          </motion.div>
        )}
      </div>
    )
  }

  // ── Phase 2: 热搜速览 ──
  if (phase === 'hotsearch') {
    return (
      <div className="hs-hotsearch">
        <div className="hs-hot-header">
          <div className="hs-hot-search-bar">花儿与少年 星光之旅</div>
          <span className="hs-hot-label">热搜</span>
        </div>

        <div className="hs-hot-feed">
          {HOT_ITEMS.slice(0, hotIndex).map((item, i) => (
            <motion.div
              key={i}
              className={`hs-hot-card ${item.isPlayer ? 'hs-hot-card-player' : ''}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
            >
              {item.portrait ? (
                <img
                  className="hs-hot-card-portrait"
                  src={item.portrait}
                  alt=""
                />
              ) : (
                <div
                  className="hs-hot-card-portrait"
                  style={{
                    background: 'linear-gradient(135deg, #FF7EB3, #FFD700)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'white',
                  }}
                >
                  ?
                </div>
              )}
              <div className="hs-hot-card-body">
                <div className="hs-hot-card-tag">
                  <span className="hs-fire">🔥</span>
                  {item.tag}
                </div>
                <div className="hs-hot-card-text">{item.text}</div>
                <div className="hs-hot-card-meta">
                  {item.rank > 0 && <span className="hs-hot-badge">热搜 #{item.rank}</span>}
                  <span>{Math.floor(Math.random() * 500 + 100)}万讨论</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* 加载中 */}
          {!hotDone && hotIndex < HOT_ITEMS.length && (
            <div style={{ textAlign: 'center', padding: 12, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
              加载更多...
            </div>
          )}
        </div>

        {hotDone && (
          <motion.div
            className="hs-hot-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="hs-phone-cta"
              onClick={() => setPhase('makeup')}
            >
              查看通告单
            </button>
          </motion.div>
        )}
      </div>
    )
  }

  // ── Phase 3: 化妆间通告单 ──
  return (
    <div className="hs-makeup">
      {/* 镜前灯泡 */}
      <div className="hs-makeup-bulbs">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="hs-makeup-bulb" />
        ))}
      </div>

      {/* 暖光粒子 */}
      <div className="hs-makeup-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="hs-makeup-spark"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${50 + Math.random() * 40}%`,
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* 通告单 */}
      <motion.div
        className="hs-notice-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="hs-notice-header">
          <div className="hs-notice-title">花儿与少年 · 星光之旅</div>
          <div className="hs-notice-subtitle">── 嘉宾通告 ──</div>
        </div>

        <div className="hs-notice-divider" />

        <div className="hs-notice-field">
          <div className="hs-notice-label">艺名</div>
          <input
            className="hs-notice-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="在这里写下你的名字"
            maxLength={8}
            autoFocus
          />
        </div>

        <div className="hs-notice-field">
          <div className="hs-notice-label">身份</div>
          <div className="hs-notice-value">第七位嘉宾 · 新晋小花</div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="hs-notice-field" style={{ flex: 1 }}>
            <div className="hs-notice-label">拍摄地</div>
            <div className="hs-notice-value">异国小镇</div>
          </div>
          <div className="hs-notice-field" style={{ flex: 1 }}>
            <div className="hs-notice-label">周期</div>
            <div className="hs-notice-value">21天</div>
          </div>
        </div>

        <div className="hs-notice-warn">
          <span>⚠️</span>
          <span>全程跟拍，慎言慎行。你的每个选择都将被镜头记录。</span>
        </div>

        <button
          className="hs-notice-cta"
          disabled={!name.trim()}
          onClick={() => onStart(name.trim())}
        >
          确认参演
        </button>
      </motion.div>
    </div>
  )
}

// ── Ending Modal ────────────────────────────────────

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)

  if (!endingType) return null

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const typeInfo = ENDING_TYPE_MAP[ending.type]

  return (
    <motion.div
      className="hs-ending-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="hs-ending-card"
        style={{ background: typeInfo.gradient }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>{ending.emoji}</div>
        <div className="hs-ending-type">{typeInfo.label}</div>
        <div className="hs-ending-title">{ending.title}</div>
        <p className="hs-ending-desc">{ending.description}</p>
        <button
          className="hs-ending-btn"
          onClick={() => { clearSave(); resetGame() }}
        >
          重新开始
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Menu Overlay ────────────────────────────────────

function MenuOverlay({
  show,
  onClose,
}: {
  show: boolean
  onClose: () => void
}) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)
  const [toast, setToast] = useState('')

  if (!show) return null

  const handleSave = () => {
    saveGame()
    setToast('✅ 已保存')
    setTimeout(() => setToast(''), 2000)
  }

  const handleLoad = () => {
    if (loadGame()) {
      onClose()
    }
  }

  const handleReset = () => {
    clearSave()
    resetGame()
    onClose()
  }

  return (
    <motion.div
      className="hs-menu-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="hs-menu-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          {STORY_INFO.title}
        </h3>
        <button className="hs-menu-btn" onClick={handleSave}>💾 保存进度</button>
        <button className="hs-menu-btn" onClick={handleLoad}>📂 读取存档</button>
        <button className="hs-menu-btn hs-menu-danger" onClick={handleReset}>
          🔄 重新开始
        </button>
        <button className="hs-menu-btn" onClick={onClose}>✕ 继续游戏</button>

        {toast && <div className="hs-toast">{toast}</div>}
      </motion.div>
    </motion.div>
  )
}

// ── App Root ────────────────────────────────────────

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const [showMenu, setShowMenu] = useState(false)

  const handleStart = (name: string) => {
    trackGameStart()
    setPlayerInfo(name)
    initGame()
  }

  if (!gameStarted) {
    return <OpeningScreen onStart={handleStart} />
  }

  return (
    <>
      <AppShell onMenuOpen={() => setShowMenu(true)} />
      <EndingModal />
      <AnimatePresence>
        {showMenu && (
          <MenuOverlay show={showMenu} onClose={() => setShowMenu(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
