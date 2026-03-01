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

// ── 微博热搜数据 ────────────────────────────────────

const HOT_ITEMS: Array<{
  title: string; desc: string; reads: string;
  badge?: 'hot' | 'boil' | 'new'; portrait?: string;
  isPlayer?: boolean;
}> = [
  { title: '影后秦悦加盟花少', desc: '十年来首次参加综艺，据传要求极高', reads: '3.2亿', badge: 'boil', portrait: '/characters/qinyue.jpg' },
  { title: '苏蔓秦悦同框', desc: '十年宿敌同住一屋？够吃21天的瓜', reads: '2.8亿', badge: 'hot', portrait: '/characters/suman.jpg' },
  { title: '陈宇轩生活白痴', desc: '顶流歌手被曝连泡面都不会煮', reads: '1.9亿', badge: 'hot', portrait: '/characters/chenyuxuan.jpg' },
  { title: '陆子昂国民男友', desc: '最年轻男嘉宾，和新晋小花年龄最接近', reads: '1.5亿', badge: 'new', portrait: '/characters/luziang.jpg' },
  { title: '沈哲远花少', desc: '金牌主持人坐镇，据说私下非常温柔', reads: '1.1亿', portrait: '/characters/shenzheyuan.jpg' },
  { title: '李慕白主动管钱', desc: '55岁老艺术家自告奋勇当财务，靠谱吗？', reads: '8600万', portrait: '/characters/limubai.jpg' },
  { title: '花少第七位嘉宾是谁', desc: '新晋小花即将公布，今年最大黑马', reads: '6.7亿', badge: 'boil', isPlayer: true },
]

const BADGE_MAP = {
  hot: { cls: 'hs-wb-badge-hot', text: '热' },
  boil: { cls: 'hs-wb-badge-boil', text: '沸' },
  new: { cls: 'hs-wb-badge-new', text: '新' },
}

// ── Opening Screen ──────────────────────────────────

function OpeningScreen({ onStart }: { onStart: (name: string) => void }) {
  const [phase, setPhase] = useState<'landing' | 'chat' | 'hotsearch' | 'makeup'>('landing')
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

  // ── Phase 0: 首屏标题 ──
  if (phase === 'landing') {
    const stars = Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: 1.5 + Math.random() * 2,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
    }))
    return (
      <div className="hs-landing">
        <video
          className="hs-landing-video"
          src="/video/landing.mp4"
          autoPlay muted loop playsInline
          poster="/video/landing-poster.jpg"
        />
        <div className="hs-landing-overlay" />
        <div className="hs-landing-bg" />
        <div className="hs-landing-stars">
          {stars.map((s, i) => (
            <div
              key={i}
              className="hs-landing-star"
              style={{
                left: s.left, top: s.top,
                width: s.width, height: s.width,
                animationDelay: s.animationDelay,
                animationDuration: s.animationDuration,
              }}
            />
          ))}
        </div>
        <div className="hs-landing-content">
          <div className="hs-landing-emoji">✨</div>
          <div className="hs-landing-logo">花儿与少年</div>
          <div className="hs-landing-sub">星 光 之 旅</div>
          <div className="hs-landing-actions">
            <button
              className="hs-landing-start"
              onClick={() => { initBGM(); setPhase('chat') }}
            >
              开始游戏
            </button>
            {hasSave() && (
              <button className="hs-landing-continue" onClick={handleContinue}>
                继续游戏
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Phase 1: 微信聊天 ──
  if (phase === 'chat') {
    return (
      <div className="hs-wechat">
        {/* 微信导航栏 */}
        <div className="hs-wx-nav">
          <div className="hs-wx-nav-back">‹</div>
          <div className="hs-wx-nav-title">经纪人·姐姐</div>
          <div className="hs-wx-nav-more">⋯</div>
        </div>

        {/* 聊天区域 */}
        <div className="hs-wx-chat">
          {/* 时间戳 */}
          <div className="hs-wx-timestamp"><span>23:47</span></div>

          {/* 消息 */}
          {CHAT_MESSAGES.slice(0, chatIndex).map((msg, i) => (
            <motion.div
              key={i}
              className="hs-wx-msg-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 30 }}
            >
              {i === 0 && <div className="hs-wx-avatar">👩</div>}
              {i !== 0 && <div style={{ width: 40, flexShrink: 0 }} />}
              <div className={`hs-wx-bubble ${msg.warn ? 'hs-wx-bubble-warn' : ''}`}>
                {msg.warn ? '⚠️ ' : ''}{msg.text}
              </div>
            </motion.div>
          ))}

          {/* 打字指示器 */}
          {!chatDone && chatIndex < CHAT_MESSAGES.length && (
            <div className="hs-wx-msg-row">
              {chatIndex === 0 && <div className="hs-wx-avatar">👩</div>}
              {chatIndex !== 0 && <div style={{ width: 40, flexShrink: 0 }} />}
              <div className="hs-wx-typing">
                <div className="hs-wx-typing-dot" />
                <div className="hs-wx-typing-dot" />
                <div className="hs-wx-typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* 底部输入栏（装饰） */}
        <div className="hs-wx-input-bar">
          <span className="hs-wx-input-icon">🎤</span>
          <div className="hs-wx-input-field" />
          <span className="hs-wx-input-icon">😊</span>
          <span className="hs-wx-input-icon">＋</span>
        </div>

        {/* 消息结束后浮出CTA */}
        {chatDone && (
          <motion.div
            className="hs-wx-cta-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="hs-wx-cta"
              onClick={() => setPhase('hotsearch')}
            >
              去微博看嘉宾名单
            </button>
          </motion.div>
        )}
      </div>
    )
  }

  // ── Phase 2: 微博热搜 ──
  if (phase === 'hotsearch') {
    return (
      <div className="hs-weibo">
        {/* 微博导航 */}
        <div className="hs-wb-nav">
          <div className="hs-wb-search">
            <span className="hs-wb-search-icon">🔍</span>
            花儿与少年 星光之旅
          </div>
        </div>

        {/* Tab栏 */}
        <div className="hs-wb-tabs">
          <button className="hs-wb-tab">综合</button>
          <button className="hs-wb-tab hs-wb-tab-active">热搜</button>
          <button className="hs-wb-tab">视频</button>
          <button className="hs-wb-tab">用户</button>
        </div>

        {/* 热搜榜标题 */}
        <div className="hs-wb-list-header">
          <span className="hs-wb-list-title">微博热搜</span>
          <span className="hs-wb-list-time">刚刚更新</span>
        </div>

        {/* 热搜列表 */}
        <div className="hs-wb-feed">
          {HOT_ITEMS.slice(0, hotIndex).map((item, i) => {
            const rankCls = i < 1 ? 'hs-wb-rank-top' : i < 3 ? 'hs-wb-rank-mid' : 'hs-wb-rank-low'
            return (
              <motion.div
                key={i}
                className={`hs-wb-item ${item.isPlayer ? 'hs-wb-item-player' : ''}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, type: 'spring', stiffness: 350, damping: 30 }}
              >
                <div className={`hs-wb-rank ${rankCls}`}>{i + 1}</div>
                <div className="hs-wb-item-body">
                  <div className="hs-wb-item-title">
                    {item.title}
                    {item.badge && (
                      <span className={`hs-wb-badge ${BADGE_MAP[item.badge].cls}`}>
                        {BADGE_MAP[item.badge].text}
                      </span>
                    )}
                  </div>
                  <div className="hs-wb-item-desc">{item.desc}</div>
                  <div className="hs-wb-item-meta">{item.reads}阅读</div>
                </div>
                {item.portrait && (
                  <img className="hs-wb-item-portrait" src={item.portrait} alt="" />
                )}
              </motion.div>
            )
          })}

          {/* 加载指示 */}
          {!hotDone && hotIndex < HOT_ITEMS.length && (
            <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>
              加载中...
            </div>
          )}
        </div>

        {/* CTA */}
        {hotDone && (
          <motion.div
            className="hs-wb-cta-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="hs-wb-cta"
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
