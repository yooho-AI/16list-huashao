/**
 * [INPUT]: 依赖 store.ts 状态，styles/*.css
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 根组件: 三阶段开场(登机牌→嘉宾闪切→艺名输入) + GameScreen + EndingModal + MenuOverlay
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

// ── 角色闪切数据 ────────────────────────────────────

const CAST = [
  { name: '秦悦', title: '影后', portrait: '/characters/qinyue.jpg' },
  { name: '苏蔓', title: '视后', portrait: '/characters/suman.jpg' },
  { name: '陈宇轩', title: '顶流歌手', portrait: '/characters/chenyuxuan.jpg' },
  { name: '陆子昂', title: '新锐演员', portrait: '/characters/luziang.jpg' },
  { name: '沈哲远', title: '资深主持人', portrait: '/characters/shenzheyuan.jpg' },
  { name: '李慕白', title: '老艺术家', portrait: '/characters/limubai.jpg' },
]

// ── Opening Screen ──────────────────────────────────

function OpeningScreen({ onStart }: { onStart: (name: string) => void }) {
  const [phase, setPhase] = useState<'splash' | 'montage' | 'input'>('splash')
  const [montageIndex, setMontageIndex] = useState(0)
  const [name, setName] = useState('')
  const hasSave = useGameStore((s) => s.hasSave)
  const loadGame = useGameStore((s) => s.loadGame)

  // Splash → Montage transition
  const handleBoard = useCallback(() => {
    initBGM()
    setPhase('montage')
  }, [])

  // Continue saved game
  const handleContinue = useCallback(() => {
    initBGM()
    trackGameContinue()
    loadGame()
  }, [loadGame])

  // Montage auto-advance
  useEffect(() => {
    if (phase !== 'montage') return
    const timer = setInterval(() => {
      setMontageIndex((i) => {
        if (i >= CAST.length - 1) {
          setPhase('input')
          return i
        }
        return i + 1
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [phase])

  // ── Phase 1: Boarding Pass ──
  if (phase === 'splash') {
    return (
      <div className="hs-boarding-pass">
        <div className="hs-boarding-pass-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`hs-star hs-star-${i % 4}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${60 + Math.random() * 40}%`,
                width: 3 + Math.random() * 4,
                height: 3 + Math.random() * 4,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="hs-pass-card">
          <div className="hs-pass-header">BOARDING PASS</div>
          <div className="hs-pass-airline">花儿与少年</div>
          <div className="hs-pass-subtitle">星光之旅 · STARLIGHT JOURNEY</div>
          <div className="hs-pass-divider" />
          <div className="hs-pass-route">
            <div className="hs-pass-point">
              <span className="hs-pass-label">FROM</span>
              <span className="hs-pass-value">现实</span>
            </div>
            <div className="hs-pass-arrow">✈️</div>
            <div className="hs-pass-point">
              <span className="hs-pass-label">TO</span>
              <span className="hs-pass-value">星光之旅</span>
            </div>
          </div>
          <div className="hs-pass-info">
            <div className="hs-pass-info-item">
              <span className="hs-pass-info-label">FLIGHT</span>
              <span className="hs-pass-info-value">HS-2026</span>
            </div>
            <div className="hs-pass-info-item">
              <span className="hs-pass-info-label">SEAT</span>
              <span className="hs-pass-info-value">VIP-01</span>
            </div>
            <div className="hs-pass-info-item">
              <span className="hs-pass-info-label">GATE</span>
              <span className="hs-pass-info-value">★</span>
            </div>
          </div>
          <div className="hs-pass-barcode">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="hs-pass-bar" style={{ height: 20 + Math.random() * 15 }} />
            ))}
          </div>
        </div>

        <button className="hs-pass-cta" onClick={handleBoard}>
          ✈️ 登机
        </button>

        {hasSave() && (
          <button className="hs-name-input-btn-secondary" onClick={handleContinue}>
            📖 继续旅程
          </button>
        )}
      </div>
    )
  }

  // ── Phase 2: Cast Montage ──
  if (phase === 'montage') {
    const cast = CAST[montageIndex]
    return (
      <div className="hs-montage">
        <AnimatePresence mode="wait">
          <motion.div
            key={montageIndex}
            className={`hs-montage-portrait ${montageIndex % 2 === 0 ? 'hs-slide-left' : 'hs-slide-right'}`}
            initial={{ opacity: 0, x: montageIndex % 2 === 0 ? -60 : 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: montageIndex % 2 === 0 ? 60 : -60 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={cast.portrait}
              alt={cast.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
            <div className="hs-montage-overlay">
              <div className="hs-montage-name">{cast.name}</div>
              <div className="hs-montage-title">{cast.title}</div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="hs-montage-dots">
          {CAST.map((_, i) => (
            <div key={i} className={`hs-montage-dot ${i === montageIndex ? 'hs-montage-dot-active' : ''}`} />
          ))}
        </div>
      </div>
    )
  }

  // ── Phase 3: Name Input ──
  return (
    <div className="hs-name-input">
      <div className="hs-name-input-particles">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`hs-star hs-star-${i % 4}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${60 + Math.random() * 40}%`,
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      <div className="hs-name-input-inner">
        <div className="hs-name-input-prompt">即将登上花少团的舞台</div>
        <div className="hs-name-input-heading">输入你的艺名</div>
        <input
          className="hs-name-input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字"
          maxLength={8}
          autoFocus
        />
        <button
          className="hs-name-input-btn"
          disabled={!name.trim()}
          onClick={() => onStart(name.trim())}
        >
          开始旅程 ✨
        </button>
      </div>
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
