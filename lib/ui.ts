import { EmbedBuilder } from 'discord.js';

// ============================================================
//  VIE — Design System dùng chung cho toàn bộ embed của bot
//  Mục tiêu: mọi lệnh trông đồng nhất, gọn gàng, có nhịp điệu.
// ============================================================

export const COLORS = {
  brand: 0xe8590c,   // cam lửa (chủ đạo)
  success: 0x2f9e44, // xanh lá
  danger: 0xe03131,  // đỏ
  warning: 0xf08c00, // hổ phách
  gold: 0xf59f00,    // vàng (thưởng/BXH)
  info: 0x4dabf7,    // xanh dương
  neutral: 0x868e96, // xám
  // theo cõi ải
  nhan: 0x37b24d,
  thien: 0x4dabf7,
  ma: 0xe03131
} as const;

export const E = {
  v: '<:v:0>', // placeholder nếu sau này có custom emoji
  coin: '🪙',
  money: '💰',
  xp: '✨',
  level: '⭐',
  up: '⬆️',
  gift: '🎁',
  cooldown: '⏳',
  check: '✅',
  cross: '❌',
  warn: '⚠️',
  bag: '🎒',
  sword: '⚔️',
  shield: '🛡️',
  potion: '🧪',
  run: '🏃',
  heart: '❤️',
  skull: '💀',
  egg: '🥚',
  ghost: '👻',
  gem: '💎',
  trophy: '🏆',
  fire: '🔥',
  star2: '🌟',
  dot: '•'
} as const;

const FOOTER = 'VIE · Thần Thoại Việt Nam';

/** Định dạng tiền tệ V theo kiểu 1.234 V */
export function fmtV(n: number): string {
  return `${Math.round(n).toLocaleString('vi-VN')} V`;
}

/** Định dạng số có phân tách hàng nghìn */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

/** Lãi/lỗ có dấu, kèm màu chữ (dùng cho cờ bạc) */
export function fmtDelta(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmtNum(n)} V`;
}

/** Embed nền chuẩn: màu brand + footer + timestamp */
export function baseEmbed(): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.brand).setFooter({ text: FOOTER }).setTimestamp();
}

export function brand(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed().setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

export function ok(title: string, description?: string): EmbedBuilder {
  return brand(title, description).setColor(COLORS.success);
}

/** Embed lỗi ngắn gọn (dùng cho reply thất bại) */
export function err(message: string): EmbedBuilder {
  return baseEmbed().setColor(COLORS.danger).setDescription(`${E.cross} ${message}`);
}

export function warn(message: string): EmbedBuilder {
  return baseEmbed().setColor(COLORS.warning).setDescription(`${E.warn} ${message}`);
}

/** Thanh tiến trình dạng khối, vd ████████░░░░ */
export function bar(current: number, max: number, len = 12): string {
  const m = max <= 0 ? 1 : max;
  const ratio = Math.max(0, Math.min(1, current / m));
  const filled = Math.round(ratio * len);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, len - filled));
}

/** Thanh máu có % kèm theo */
export function hpBar(current: number, max: number, len = 12): string {
  const cur = Math.max(0, Math.round(current));
  const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
  return `${bar(cur, max, len)}  ${cur}/${Math.round(max)} (${pct}%)`;
}

/** Ghép danh sách dòng có bullet đồng nhất */
export function lines(items: string[]): string {
  return items.map((s) => `${E.dot} ${s}`).join('\n');
}
