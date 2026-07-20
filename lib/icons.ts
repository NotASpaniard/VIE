import { getStore } from '../store/store.js';

// ============================================================
//  Registry icon có thể tuỳ chỉnh bằng /custom.
//  Chỉ đăng ký những icon THỰC SỰ được dùng trong giao diện,
//  để bảng /custom luôn phản ánh đúng chỗ dùng.
// ============================================================
export type IconDef = { key: string; def: string; label: string; where: string };

export const ICONS: IconDef[] = [
  { key: 'money', def: '💰', label: 'Tiền V', where: 'Số dư & thu nhập (work, daily, cash, profile)' },
  { key: 'xp', def: '✨', label: 'Kinh nghiệm', where: 'Dòng XP (work, daily, profile, thắng ải)' },
  { key: 'level', def: '⭐', label: 'Level', where: 'Tiêu đề profile' },
  { key: 'heart', def: '❤️', label: 'Thanh máu', where: 'Đấu ải — máu boss & người chơi' },
  { key: 'sword', def: '⚔️', label: 'Tấn công', where: 'Nút Đánh khi đấu ải, ô vũ khí' },
  { key: 'shield', def: '🛡️', label: 'Phòng thủ', where: 'Nút Thủ khi đấu ải' },
  { key: 'run', def: '🏃', label: 'Né tránh', where: 'Nút Né khi đấu ải' },
  { key: 'potion', def: '🧪', label: 'Hồi máu', where: 'Nút Potion khi đấu ải' },
  { key: 'trophy', def: '🏆', label: 'Chiến thắng', where: 'Thắng ải, bảng xếp hạng' },
  { key: 'skull', def: '💀', label: 'Thất bại', where: 'Thua khi đấu ải' },
  { key: 'egg', def: '🥚', label: 'Trứng', where: 'Trại ấp trứng, bộ sưu tập con giáp' },
  { key: 'bag', def: '🎒', label: 'Túi đồ', where: 'Lệnh inventory / inv' },
  { key: 'cooldown', def: '⏳', label: 'Thời gian hồi', where: 'Thông báo còn phải chờ' },
  { key: 'gift', def: '🎁', label: 'Phần thưởng', where: 'Quà ngày/tuần, thưởng sau khi thắng ải' }
];

export const ICON_BY_KEY: Record<string, IconDef> = Object.fromEntries(ICONS.map((i) => [i.key, i]));

// Bảng emoji mặc định để chọn (tối đa 25 vì giới hạn select menu của Discord)
export const DEFAULT_PALETTE: { e: string; name: string }[] = [
  { e: '💰', name: 'Túi tiền' }, { e: '🪙', name: 'Đồng xu' }, { e: '💎', name: 'Kim cương' },
  { e: '✨', name: 'Lấp lánh' }, { e: '⭐', name: 'Ngôi sao' }, { e: '🌟', name: 'Sao sáng' },
  { e: '❤️', name: 'Trái tim' }, { e: '🔥', name: 'Lửa' }, { e: '⚔️', name: 'Song kiếm' },
  { e: '🗡️', name: 'Dao găm' }, { e: '🛡️', name: 'Khiên' }, { e: '🏹', name: 'Cung tên' },
  { e: '🏃', name: 'Chạy' }, { e: '💨', name: 'Gió' }, { e: '🧪', name: 'Bình thuốc' },
  { e: '💊', name: 'Viên thuốc' }, { e: '🏆', name: 'Cúp' }, { e: '👑', name: 'Vương miện' },
  { e: '💀', name: 'Đầu lâu' }, { e: '🥚', name: 'Trứng' }, { e: '🐉', name: 'Rồng' },
  { e: '🎒', name: 'Ba lô' }, { e: '⏳', name: 'Đồng hồ cát' }, { e: '🎁', name: 'Hộp quà' },
  { e: '🎉', name: 'Pháo giấy' }
];

/** Lấy icon đã tuỳ chỉnh của server, không có thì dùng mặc định. */
export function getIcon(guildId: string | null | undefined, key: string): string {
  const def = ICON_BY_KEY[key]?.def ?? '';
  if (!guildId) return def;
  return getStore().getIconOverride(guildId, key) ?? def;
}
