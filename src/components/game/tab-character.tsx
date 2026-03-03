/**
 * [INPUT]: 依赖 store.ts 状态（角色/属性/全局资源）
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物Tab：立绘 + 全局属性 + NPC好感 + SVG关系图 + 角色网格 + 全屏档案
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatCircleDots } from '@phosphor-icons/react'
import {
  useGameStore,
  GLOBAL_STATS,
  type Character,
  type GlobalResources,
} from '@/lib/store'
import CharacterChat from './character-chat'

const P = 'hs'

// ── Relation Graph (SVG) ────────────────────────────

function RelationGraph({
  characters,
  characterStats,
  playerName,
  onSelect,
}: {
  characters: Record<string, Character>
  characterStats: Record<string, { favor: number }>
  playerName: string
  onSelect: (id: string) => void
}) {
  const entries = Object.entries(characters)
  const cx = 150
  const cy = 150
  const radius = 110

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}>
      {/* Center node */}
      <circle cx={cx} cy={cy} r={28} fill="var(--bg-card)" stroke="var(--primary)" strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--primary)" fontSize={12} fontWeight={600}>
        {playerName || '我'}
      </text>

      {entries.map(([id, char], i) => {
        const angle = (i / entries.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        const favor = characterStats[id]?.favor || 0
        const relation = favor >= 80 ? '挚友' : favor >= 60 ? '好友' : favor >= 40 ? '友好' : '陌生'

        return (
          <g key={id} onClick={() => onSelect(id)} style={{ cursor: 'pointer' }}>
            {/* Connection line */}
            <line
              x1={cx} y1={cy} x2={nx} y2={ny}
              stroke={char.themeColor}
              strokeWidth={1.5}
              opacity={0.4}
            />
            {/* Relation label */}
            <text
              x={(cx + nx) / 2}
              y={(cy + ny) / 2 - 6}
              textAnchor="middle"
              fill={char.themeColor}
              fontSize={9}
              fontWeight={500}
            >
              {relation}
            </text>
            {/* NPC node */}
            <circle cx={nx} cy={ny} r={22} fill="var(--bg-card)" stroke={char.themeColor} strokeWidth={2} />
            <clipPath id={`clip-${id}`}>
              <circle cx={nx} cy={ny} r={20} />
            </clipPath>
            <image
              href={char.portrait}
              x={nx - 20} y={ny - 20}
              width={40} height={40}
              clipPath={`url(#clip-${id})`}
              preserveAspectRatio="xMidYMin slice"
            />
          </g>
        )
      })}
    </svg>
  )
}

// ── Character Dossier (Full-screen) ─────────────────

function CharacterDossier({
  char,
  favor,
  onClose,
}: {
  char: Character
  favor: number
  onClose: () => void
}) {
  const favorStage = favor >= 80 ? '挚友' : favor >= 60 ? '好友' : favor >= 40 ? '友好' : '初识'

  return (
    <motion.div
      className={`${P}-dossier`}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer',
        }}
      >
        ✕
      </button>

      {/* Portrait */}
      <motion.div
        style={{ height: '50vh', overflow: 'hidden', position: 'relative' }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={char.portrait}
          alt={char.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(transparent, var(--bg-base))',
        }} />
      </motion.div>

      {/* Info */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: char.themeColor }}>
            {char.name}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {char.title} · {char.age}岁
          </span>
        </div>

        {/* Favor stage */}
        <div style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 12,
          background: `${char.themeColor}20`, color: char.themeColor,
          fontSize: 12, fontWeight: 600, marginBottom: 12,
        }}>
          {favorStage} · 好感 {favor}/100
        </div>

        {/* Favor bar */}
        <div style={{
          height: 6, borderRadius: 3, background: 'var(--bg-input)',
          overflow: 'hidden', marginBottom: 16,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${favor}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ height: '100%', borderRadius: 3, background: char.themeColor }}
          />
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {char.tags.map((tag) => (
            <span key={tag} style={{
              padding: '3px 10px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-secondary)',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p style={{
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
          marginBottom: 16,
        }}>
          {char.shortDesc}
        </p>

        {/* Personality */}
        <div style={{
          padding: 12, borderRadius: 12, background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            性格特征
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {char.personality}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Component ──────────────────────────────────

export default function TabCharacter() {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const globalResources = useGameStore((s) => s.globalResources)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const playerName = useGameStore((s) => s.playerName)

  const [dossierChar, setDossierChar] = useState<string | null>(null)
  const [chatChar, setChatChar] = useState<string | null>(null)

  const selectedChar = currentCharacter ? characters[currentCharacter] : null

  const handleNodeSelect = (id: string) => {
    selectCharacter(id)
    setDossierChar(id)
  }

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 当前角色立绘 ── */}
      {selectedChar && (
        <div
          style={{
            borderRadius: 16, overflow: 'hidden', marginBottom: 16,
            position: 'relative', aspectRatio: '9/16', maxHeight: 320,
          }}
          onClick={() => setDossierChar(currentCharacter)}
        >
          <img
            src={selectedChar.portrait}
            alt={selectedChar.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 12px 12px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: selectedChar.themeColor }}>
              {selectedChar.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {selectedChar.title} · {selectedChar.age}岁
            </div>
          </div>
        </div>
      )}

      {/* ── 全局属性面板 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        📊 旅程数据
      </h4>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20,
      }}>
        {GLOBAL_STATS.map((stat) => {
          const value = globalResources[stat.key as keyof GlobalResources]
          const pct = stat.max > 100 ? Math.min(100, (value / stat.max) * 100) : value
          return (
            <div key={stat.key} style={{
              padding: 10, borderRadius: 12, background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {stat.icon} {stat.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>
                  {value}{stat.unit || ''}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-input)' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: stat.color,
                  width: `${pct}%`, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── NPC 好感度 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        💗 嘉宾好感
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {Object.entries(characters).map(([id, char], i) => {
          const favor = characterStats[id]?.favor || 0
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onClick={() => handleNodeSelect(id)}
            >
              <img
                src={char.portrait}
                alt={char.name}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center top',
                  border: `2px solid ${char.themeColor}44`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: char.themeColor }}>
                    {char.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {favor}/100
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-input)' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: char.themeColor,
                    width: `${favor}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── 关系图 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🕸️ 关系网络
      </h4>
      <div style={{
        padding: 12, borderRadius: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <RelationGraph
          characters={characters}
          characterStats={characterStats}
          playerName={playerName}
          onSelect={handleNodeSelect}
        />
      </div>

      {/* ── 角色网格 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🎬 花少团成员
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {Object.entries(characters).map(([id, char]) => (
          <button
            key={id}
            onClick={() => handleNodeSelect(id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 8, borderRadius: 12,
              background: currentCharacter === id ? `${char.themeColor}15` : 'var(--bg-card)',
              border: `1px solid ${currentCharacter === id ? char.themeColor + '44' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            {/* 聊天按钮 */}
            <div
              onClick={(e) => { e.stopPropagation(); setChatChar(id) }}
              style={{
                position: 'absolute', top: 6, left: 6,
                width: 28, height: 28, borderRadius: '50%',
                background: `${char.themeColor}18`,
                border: `1px solid ${char.themeColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 1,
              }}
            >
              <ChatCircleDots size={16} weight="fill" color={char.themeColor} />
            </div>
            <img
              src={char.portrait}
              alt={char.name}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                objectFit: 'cover', objectPosition: 'center top',
                border: `2px solid ${char.themeColor}44`,
                marginBottom: 6,
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 500, color: char.themeColor }}>
              {char.name}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {char.title}
            </span>
          </button>
        ))}
      </div>

      <div style={{ height: 16 }} />

      {/* ── Character Dossier ── */}
      <AnimatePresence>
        {dossierChar && characters[dossierChar] && (
          <CharacterDossier
            char={characters[dossierChar]}
            favor={characterStats[dossierChar]?.favor || 0}
            onClose={() => setDossierChar(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Character Chat ── */}
      <AnimatePresence>
        {chatChar && characters[chatChar] && (
          <CharacterChat charId={chatChar} onClose={() => setChatChar(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
