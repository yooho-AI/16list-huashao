/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供全部类型定义 + 角色/场景/道具/章节/事件/结局常量
 * [POS]: UI 薄层，叙事内容在 script.md
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 时间系统 ─────────────────────────────────────────

export type TimePeriod = '清晨' | '午间' | '午后' | '夜晚'

export const PERIODS: TimePeriod[] = ['清晨', '午间', '午后', '夜晚']

export const MAX_DAYS = 21
export const MAX_ACTION_POINTS = 3

// ── 属性元数据 ───────────────────────────────────────

export interface StatMeta {
  label: string
  key: string
  min: number
  max: number
  initial: number
  color: string
  icon: string
  category: 'relation' | 'status' | 'skill'
  unit?: string
}

export const GLOBAL_STATS: StatMeta[] = [
  { label: '团队凝聚力', key: 'cohesion', min: 0, max: 100, initial: 50, color: '#FF7EB3', icon: '🤝', category: 'status' },
  { label: '个人艺能感', key: 'charisma', min: 0, max: 100, initial: 40, color: '#FFD700', icon: '🎤', category: 'skill' },
  { label: '旅行生存技能', key: 'survival', min: 0, max: 100, initial: 35, color: '#4ECDC4', icon: '🧭', category: 'skill' },
  { label: '个人人气', key: 'popularity', min: 0, max: 99999, initial: 500, color: '#FF6B6B', icon: '🔥', category: 'status', unit: '万' },
  { label: '身心状态', key: 'wellbeing', min: 0, max: 100, initial: 80, color: '#A78BFA', icon: '💜', category: 'status' },
]

// ── 角色 ─────────────────────────────────────────────

export interface CharacterStats {
  favor: number
}

export interface Character {
  id: string
  name: string
  age: number
  title: string
  portrait: string
  themeColor: string
  shortDesc: string
  personality: string
  tags: string[]
  initialStats: CharacterStats
}

const CHARACTER_LIST: Character[] = [
  {
    id: 'qinyue',
    name: '秦悦',
    age: 42,
    title: '影后',
    portrait: '/characters/qinyue.jpg',
    themeColor: '#8B4789',
    shortDesc: '资历最深的影后级人物，气场强大，对品质有极高要求',
    personality: '威严而不失优雅，眼光犀利，对后辈既严格又暗含欣赏。与苏蔓有奖项旧怨，表面和睦实则暗流涌动。',
    tags: ['影后', '气场女王', '严厉前辈'],
    initialStats: { favor: 40 },
  },
  {
    id: 'suman',
    name: '苏蔓',
    age: 35,
    title: '视后',
    portrait: '/characters/suman.jpg',
    themeColor: '#2DB5A0',
    shortDesc: '情商极高的视后，表面八面玲珑，内心暗藏锋芒',
    personality: '善于察言观色，总是微笑待人，但与秦悦之间存在多年的奖项竞争宿怨。对新人会刻意亲近，试探立场。',
    tags: ['视后', '高情商', '表面温和'],
    initialStats: { favor: 50 },
  },
  {
    id: 'chenyuxuan',
    name: '陈宇轩',
    age: 28,
    title: '顶流歌手',
    portrait: '/characters/chenyuxuan.jpg',
    themeColor: '#4A90D9',
    shortDesc: '人气超高的顶流歌手，生活自理能力堪忧',
    personality: '台上光芒万丈，台下却是个大男孩，不会做饭不会看地图，需要人照顾。性格直率，容易因小事闹情绪。',
    tags: ['顶流', '大男孩', '需要照顾'],
    initialStats: { favor: 45 },
  },
  {
    id: 'luziang',
    name: '陆子昂',
    age: 25,
    title: '新锐演员',
    portrait: '/characters/luziang.jpg',
    themeColor: '#FF8C42',
    shortDesc: '阳光暖男，与你年龄相仿，节目组有意炒CP',
    personality: '温暖阳光、主动体贴，总会在你需要时出现。节目组刻意安排你们同框，关系暧昧而微妙。',
    tags: ['暖男', '潜在CP', '阳光少年'],
    initialStats: { favor: 55 },
  },
  {
    id: 'shenzheyuan',
    name: '沈哲远',
    age: 38,
    title: '资深主持人',
    portrait: '/characters/shenzheyuan.jpg',
    themeColor: '#5B7FBD',
    shortDesc: '成熟稳重的资深主持人，对你多有提点',
    personality: '阅历丰富，擅长控场和化解尴尬。对你有一种长辈式的欣赏和照顾，偶尔流露出超越导师的微妙情感。',
    tags: ['主持人', '导师', '成熟稳重'],
    initialStats: { favor: 50 },
  },
  {
    id: 'limubai',
    name: '李慕白',
    age: 55,
    title: '老艺术家',
    portrait: '/characters/limubai.jpg',
    themeColor: '#C49A6C',
    shortDesc: '德高望重的老艺术家，负责管钱却粗心大意',
    personality: '为人和蔼可亲、德艺双馨，但生活中迷糊粗心。主动揽下管钱重任却状况百出，是团队的开心果和意外制造者。',
    tags: ['老艺术家', '管钱人', '迷糊可爱'],
    initialStats: { favor: 60 },
  },
]

export function buildCharacters(_playerName: string): Record<string, Character> {
  const map: Record<string, Character> = {}
  for (const c of CHARACTER_LIST) map[c.id] = { ...c }
  return map
}

export function getAvailableCharacters(
  _day: number,
  characters: Record<string, Character>,
): Record<string, Character> {
  return { ...characters }
}

// ── 场景 ─────────────────────────────────────────────

export interface Scene {
  id: string
  name: string
  icon: string
  background: string
  atmosphere: string
  description: string
  tags: string[]
}

export const SCENES: Record<string, Scene> = {
  guesthouse: {
    id: 'guesthouse',
    name: '民宿小院',
    icon: '🏠',
    background: '/scenes/guesthouse.jpg',
    atmosphere: '温馨而略带局促的异国小院，晾衣绳上挂着花花绿绿的衣物',
    description: '花少团的临时大本营。三间大小不一的房间，一个公共厨房，一个能看到远山的小阳台。这里是每天出发前的集合点，也是深夜心事的倾诉地。',
    tags: ['休息', '社交', '争执'],
  },
  market: {
    id: 'market',
    name: '街头集市',
    icon: '🛍️',
    background: '/scenes/market.jpg',
    atmosphere: '色彩缤纷的异国集市，空气中弥漫着香料和烤肉的味道',
    description: '狭窄蜿蜒的巷弄里摆满了手工艺品和当地美食。这里是穷游省钱的战场，也是展示砍价才艺的舞台。运气好的话，还能找到街头卖艺赚旅费的好地点。',
    tags: ['购物', '卖艺', '省钱'],
  },
  seaside: {
    id: 'seaside',
    name: '海滨栈道',
    icon: '🌊',
    background: '/scenes/seaside.jpg',
    atmosphere: '金色夕阳洒在湛蓝海面上，海风轻拂，栈道上三两行人',
    description: '沿着海岸线延伸的木质栈道，一侧是无边大海，一侧是彩色房屋。黄昏时分最美，是录vlog和"不经意"制造浪漫场景的绝佳地点。',
    tags: ['散步', 'vlog', '约会'],
  },
  ruins: {
    id: 'ruins',
    name: '古城遗迹',
    icon: '🏛️',
    background: '/scenes/ruins.jpg',
    atmosphere: '千年石柱矗立在蓝天下，历史的厚重感扑面而来',
    description: '气势恢宏的古代遗迹，断壁残垣间诉说着千年兴衰。节目组最爱在这里设置团队挑战任务，也是出片率最高的拍摄地点。',
    tags: ['打卡', '拍摄', '挑战'],
  },
  restaurant: {
    id: 'restaurant',
    name: '露天餐厅',
    icon: '🍽️',
    background: '/scenes/restaurant.jpg',
    atmosphere: '藤蔓缠绕的露天座位，烛光摇曳，远处传来手风琴声',
    description: '团队每晚固定的聚餐地点。头顶星空，脚下石板路，烛光映照着每个人的表情。这里是"家庭会议"的主战场，也是真心话大冒险的舞台。',
    tags: ['聚餐', '会议', '联谊'],
  },
  transit: {
    id: 'transit',
    name: '交通枢纽',
    icon: '🚌',
    background: '/scenes/transit.jpg',
    atmosphere: '嘈杂忙碌的异国车站，看不懂的外文指示牌，匆匆的人群',
    description: '每次转移目的地都要经过的混乱地带。语言不通、标识不清、时刻表看不懂——旅行生存技能在这里接受最严酷的考验。',
    tags: ['赶路', '迷路', '冒险'],
  },
}

// ── 道具 ─────────────────────────────────────────────

export interface GameItem {
  id: string
  name: string
  icon: string
  description: string
  effect: string
  quantity: number
}

export const ITEMS: GameItem[] = [
  { id: 'emergency-fund', name: '备用金', icon: '💰', description: '藏在行李箱夹层的应急现金', effect: '经费危机时可救急，团队凝聚力+10', quantity: 1 },
  { id: 'translator', name: '翻译APP', icon: '📱', description: '支持实时翻译的手机应用', effect: '使用后旅行生存技能临时+15', quantity: 2 },
  { id: 'travel-guide', name: '旅行攻略', icon: '📖', description: '出发前做的详细功课笔记', effect: '降低迷路概率，任务成功率+20%', quantity: 1 },
  { id: 'first-aid', name: '急救药包', icon: '💊', description: '感冒药、创可贴、止痛片', effect: '身心状态+20', quantity: 2 },
  { id: 'selfie-stick', name: '自拍杆', icon: '🤳', description: '延长杆+补光灯一体式神器', effect: '录制vlog时个人人气+100万', quantity: 1 },
  { id: 'energy-drink', name: '能量饮料', icon: '⚡', description: '提神醒脑的功能饮料', effect: '身心状态+15，但连续使用效果递减', quantity: 3 },
]

// ── 章节 ─────────────────────────────────────────────

export interface Chapter {
  id: number
  name: string
  subtitle: string
  dayRange: [number, number]
}

export const CHAPTERS: Chapter[] = [
  { id: 1, name: '初识磨合', subtitle: '在陌生中寻找位置', dayRange: [1, 7] },
  { id: 2, name: '风波考验', subtitle: '暴风雨中见真章', dayRange: [8, 14] },
  { id: 3, name: '蜕变绽放', subtitle: '星光不问赶路人', dayRange: [15, 21] },
]

// ── 强制事件 ─────────────────────────────────────────

export interface ForcedEvent {
  id: string
  title: string
  day: number
  period: TimePeriod
  condition?: string
  description: string
}

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'room-allocation',
    title: '房间分配风波',
    day: 1,
    period: '夜晚',
    description: '民宿只有三间房：大床房、双人房、四人上下铺。七个人，怎么分？',
  },
  {
    id: 'budget-crisis',
    title: '经费危机',
    day: 7,
    period: '午间',
    description: '李慕白不慎遗失部分现金，剩余经费无法支撑原定行程。',
  },
  {
    id: 'cp-seaside',
    title: 'CP暧昧升温',
    day: 10,
    period: '午后',
    condition: 'charisma >= 60',
    description: '陆子昂邀你一起在海边录制日落vlog，动作亲密自然。',
  },
  {
    id: 'hot-search',
    title: '热搜风暴',
    day: 5,
    period: '清晨',
    condition: 'cohesion <= 40',
    description: '#小花耍大牌# 登上热搜，节目片段被恶意剪辑。',
  },
  {
    id: 'truth-dare',
    title: '真心话大冒险',
    day: 15,
    period: '夜晚',
    description: '露天餐厅的烛光晚宴上，有人提议玩真心话大冒险。',
  },
  {
    id: 'breakdown-warning',
    title: '崩溃倒计时',
    day: 0,
    period: '夜晚',
    condition: 'wellbeing <= 35',
    description: '身心状态告急。你需要在48小时内完成自我调整，否则可能崩溃退出。',
  },
  {
    id: 'farewell-dinner',
    title: '告别晚宴',
    day: 21,
    period: '夜晚',
    description: '旅程最后一晚，烛光下大家轮流讲述最难忘的时刻。',
  },
]

// ── 结局 ─────────────────────────────────────────────

export interface Ending {
  id: string
  title: string
  type: 'BE' | 'TE' | 'HE' | 'NE'
  emoji: string
  description: string
  condition: string
}

export const ENDINGS: Ending[] = [
  {
    id: 'blacklisted',
    title: '全网黑',
    type: 'BE',
    emoji: '🌑',
    description: '舆论海啸吞没了你的星途。热搜上全是负面词条，广告商纷纷解约，你从万众瞩目变成了人人喊打。',
    condition: '个人人气 ≤ 500万 且 团队凝聚力 ≤ 30',
  },
  {
    id: 'breakdown',
    title: '崩溃退出',
    type: 'BE',
    emoji: '💔',
    description: '身心俱疲的你在镜头前崩溃大哭，宣布退出旅程。虽然获得部分同情，但"不够坚强"的标签将伴随你很久。',
    condition: '身心状态 ≤ 10',
  },
  {
    id: 'controversial-star',
    title: '黑红新星',
    type: 'TE',
    emoji: '🖤',
    description: '你成了最具争议的选手。黑粉和真爱粉一样多，话题度爆表。经纪公司决定走"个性派"路线，前路充满不确定。',
    condition: '个人人气 ≥ 8000万 且 团队凝聚力 ≤ 50',
  },
  {
    id: 'cp-viral',
    title: 'CP出圈',
    type: 'TE',
    emoji: '💕',
    description: '你和他的互动片段全网刷屏，"花少CP"词条霸榜热搜。短期内人气飙升，但被定型的风险也随之而来。',
    condition: '陆子昂好感 ≥ 90 或 沈哲远好感 ≥ 90',
  },
  {
    id: 'starlight',
    title: '星光绽放',
    type: 'HE',
    emoji: '✨',
    description: '从小心翼翼的新人到能独当一面的团队灵魂。秦悦说"未来可期"，苏蔓给了你私人联系方式。你的星光之旅，才刚刚开始。',
    condition: '人气 ≥ 10000万 且 凝聚力 ≥ 75 且 ≥3人好感≥80 且 身心状态 ≥ 50',
  },
  {
    id: 'team-darling',
    title: '团宠花旦',
    type: 'HE',
    emoji: '👑',
    description: '所有人都爱你。你是团队的开心果、润滑剂和最暖心的存在。告别时，每个人都红了眼眶。',
    condition: '凝聚力 ≥ 90 且 所有NPC好感 ≥ 70',
  },
  {
    id: 'invisible',
    title: '旅途小透明',
    type: 'NE',
    emoji: '👻',
    description: '21天的旅程结束了，但你好像从未真正存在过。镜头里你总是背景板，回忆里你是那个"叫什么来着"的人。',
    condition: '以上条件均不满足',
  },
]

export const ENDING_TYPE_MAP: Record<string, { label: string; gradient: string }> = {
  BE: { label: '悲剧结局', gradient: 'linear-gradient(135deg, #1a0a0a, #3d1010)' },
  TE: { label: '转折结局', gradient: 'linear-gradient(135deg, #1a1a0a, #3d3010)' },
  HE: { label: '圆满结局', gradient: 'linear-gradient(135deg, #0a1a1a, #103d30)' },
  NE: { label: '平淡结局', gradient: 'linear-gradient(135deg, #0a0a1a, #101030)' },
}

// ── 故事信息 + 快捷操作 ─────────────────────────────

export const STORY_INFO = {
  title: '花儿与少年：星光之旅',
  subtitle: '21天异国穷游 · 情商与生存的终极考验',
  author: 'AI Interactive',
}

export const QUICK_ACTIONS: string[] = [
  '🎤 展示才艺',
  '🤝 调解矛盾',
  '📸 制造话题',
  '💆 自我调整',
]

// ── 消息类型 ─────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  character?: string
  type?: 'scene-transition' | 'day-change' | 'popularity-surge' | 'crisis-alert'
  sceneId?: string
  dayInfo?: { day: number; period: TimePeriod; chapter: string }
}

// ── 事件记录 ─────────────────────────────────────────

export interface StoryRecord {
  id: string
  day: number
  period: TimePeriod
  title: string
  content: string
}

// ── 全局资源接口 ─────────────────────────────────────

export interface GlobalResources {
  cohesion: number
  charisma: number
  survival: number
  popularity: number
  wellbeing: number
}
