import { EmbedBuilder, SlashCommandBuilder, User } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import * as ui from '../lib/ui.js';
import { getIcon } from '../lib/icons.js';

const store = getStore();
type R = { embed: EmbedBuilder; ok: boolean };

function guildBonus(userId: string, base: number): { final: number; pct: number } {
  const g = store.getUserGuild(userId);
  if (!g) return { final: base, pct: 0 };
  const b = store.getGuildRankBuffs(g.guildRank.level);
  return { final: base + Math.floor((base * b.incomeBonus) / 100), pct: b.incomeBonus };
}

function balanceRank(bal: number): string {
  if (bal >= 1_000_000) return '👑 Đại gia';
  if (bal >= 500_000) return '💎 Phú gia';
  if (bal >= 100_000) return '🏆 Thương gia';
  if (bal >= 50_000) return '💼 Tiểu thương';
  if (bal >= 10_000) return '🪙 Có của';
  return '🌾 Thường dân';
}

// ---------------- Hành động dùng chung ----------------
function actWork(userId: string, gid: string | null): R {
  const cd = store.checkCooldown(userId, 'work');
  if (!cd.canUse) return { ok: false, embed: ui.warn(`${getIcon(gid, 'cooldown')} Cần chờ **${cd.remainingMinutes} phút** nữa mới làm việc tiếp.`).setTitle('💼 Làm Việc') };
  const user = store.getUser(userId);
  const base = 100 + Math.floor(Math.random() * 900);
  const levelBonus = user.level * 5;
  const gb = guildBonus(userId, base + levelBonus);
  user.balance += gb.final;
  store.setCooldown(userId, 'work', 60);
  const xp = store.addXP(userId, 10);
  store.save();
  return {
    ok: true,
    embed: ui.ok('💼 Làm Việc').addFields(
      { name: `${getIcon(gid, 'money')} Thu nhập`, value: ui.fmtV(gb.final), inline: true },
      { name: '📊 Chi tiết', value: `Cơ bản ${ui.fmtNum(base)} · Lv +${levelBonus}${gb.pct ? ` · Guild +${gb.pct}%` : ''}`, inline: true },
      { name: `${getIcon(gid, 'cooldown')} Hồi`, value: '1 giờ', inline: true },
      { name: `${getIcon(gid, 'xp')} Kinh nghiệm`, value: xp.message, inline: false }
    )
  };
}

function actDaily(userId: string, gid: string | null): R {
  const cd = store.checkCooldown(userId, 'daily');
  if (!cd.canUse) {
    const h = Math.floor(cd.remainingMinutes / 60), m = cd.remainingMinutes % 60;
    return { ok: false, embed: ui.warn(`${getIcon(gid, 'cooldown')} Cần chờ **${h} giờ ${m} phút** nữa mới nhận daily.`).setTitle('🎁 Daily') };
  }
  const user = store.getUser(userId);
  const now = new Date();
  const today = now.toDateString();
  if (user.lastDaily === today) return { ok: false, embed: ui.warn('Bạn đã nhận daily hôm nay rồi!').setTitle('🎁 Daily') };
  let streak = user.dailyStreak || 0;
  if (user.lastDaily) {
    const diff = Math.floor((now.getTime() - new Date(user.lastDaily).getTime()) / 86400000);
    if (diff > 1) streak = 0;
  }
  streak += 1;
  user.dailyStreak = streak;
  user.lastDaily = today;
  const gb = guildBonus(userId, 500 + streak * 50);
  user.balance += gb.final;
  store.setCooldown(userId, 'daily', 1440);
  const xp = store.addXP(userId, 25);
  store.save();
  return {
    ok: true,
    embed: ui.ok(`${getIcon(gid, 'gift')} Quà Hàng Ngày`).setColor(ui.COLORS.gold).addFields(
      { name: `${getIcon(gid, 'money')} Phần thưởng`, value: ui.fmtV(gb.final), inline: true },
      { name: '🔥 Chuỗi ngày', value: `${streak} ngày${gb.pct ? ` · Guild +${gb.pct}%` : ''}`, inline: true },
      { name: `${getIcon(gid, 'cooldown')} Hồi`, value: '24 giờ', inline: true },
      { name: `${getIcon(gid, 'xp')} Kinh nghiệm`, value: xp.message, inline: false }
    )
  };
}

function actWeekly(userId: string, gid: string | null): R {
  const cd = store.checkCooldown(userId, 'weekly');
  if (!cd.canUse) {
    const d = Math.floor(cd.remainingMinutes / 1440), h = Math.floor((cd.remainingMinutes % 1440) / 60);
    return { ok: false, embed: ui.warn(`${getIcon(gid, 'cooldown')} Cần chờ **${d} ngày ${h} giờ** nữa mới nhận quà tuần.`).setTitle('🎁 Quà Tuần') };
  }
  const user = store.getUser(userId);
  const base = 1000 + user.level * 200;
  const rbonus = Math.floor(Math.random() * 1000);
  const gb = guildBonus(userId, base + rbonus);
  user.balance += gb.final;
  store.setCooldown(userId, 'weekly', 10080);
  const xp = store.addXP(userId, 50);
  store.save();
  return {
    ok: true,
    embed: ui.ok(`${getIcon(gid, 'gift')} Quà Hàng Tuần`).setColor(ui.COLORS.gold).addFields(
      { name: `${getIcon(gid, 'money')} Phần thưởng`, value: ui.fmtV(gb.final), inline: true },
      { name: '📊 Chi tiết', value: `Cơ bản ${ui.fmtNum(base)} · Bonus +${ui.fmtNum(rbonus)}${gb.pct ? ` · Guild +${gb.pct}%` : ''}`, inline: true },
      { name: `${getIcon(gid, 'cooldown')} Hồi`, value: '7 ngày', inline: true },
      { name: `${getIcon(gid, 'xp')} Kinh nghiệm`, value: xp.message, inline: false }
    )
  };
}

function actBet(userId: string, rawAmount: number, gid: string | null): R {
  const amount = Math.floor(rawAmount);
  if (!Number.isFinite(amount) || amount < 10) return { ok: false, embed: ui.err('Cược tối thiểu 10 V (số nguyên).') };
  const user = store.getUser(userId);
  if (user.balance < amount) return { ok: false, embed: ui.err('Bạn không đủ V để cược.') };
  user.balance -= amount;
  const won = Math.random() < 0.5;
  const winnings = won ? Math.floor(amount * 1.8) : 0;
  user.balance += winnings;
  store.save();
  const profit = winnings - amount;
  return {
    ok: true,
    embed: ui.baseEmbed().setColor(won ? ui.COLORS.success : ui.COLORS.danger).setTitle('🎲 Đặt Cược 50/50')
      .setDescription(won ? '🎉 **THẮNG!**' : '💥 **THUA!**')
      .addFields(
        { name: '💵 Cược', value: ui.fmtV(amount), inline: true },
        { name: '📈 Lãi/Lỗ', value: ui.fmtDelta(profit), inline: true },
        { name: `${getIcon(gid, 'money')} Số dư`, value: ui.fmtV(user.balance), inline: true }
      )
  };
}

function actCash(userId: string, gid: string | null): R {
  const user = store.getUser(userId);
  const g = store.getUserGuild(userId);
  const e = ui.brand(`${getIcon(gid, 'money')} Ví Của Bạn`).addFields(
    { name: '💵 Số dư', value: ui.fmtV(user.balance), inline: true },
    { name: '🏅 Hạng của cải', value: balanceRank(user.balance), inline: true },
    { name: '⭐ Level', value: `${user.level}`, inline: true }
  );
  if (g) e.addFields({ name: '🏰 Guild', value: `${g.name} · Hạng ${g.guildRank.level}`, inline: false });
  return { ok: true, embed: e };
}

const WEAPON_NAME: Record<string, string> = {
  kiem_go: 'Kiếm Gỗ', kiem_sat: 'Kiếm Sắt', kiem_bac: 'Kiếm Bạc',
  kiem_vang: 'Kiếm Vàng', kiem_than: 'Kiếm Thần', dep_to_ong: '🏆 Dép Tổ Ong'
};

// Tiến trình XP trong level hiện tại (level = floor(√(xp/100)) -> cần L²·100 XP để đạt level L)
function xpProgress(level: number, xp: number) {
  const cur = level <= 1 ? 0 : level * level * 100;
  const next = (level + 1) * (level + 1) * 100;
  const inLevel = Math.max(0, xp - cur);
  const span = Math.max(1, next - cur);
  const pct = Math.min(100, Math.round((inLevel / span) * 100));
  return { inLevel, span, pct, remain: Math.max(0, span - inLevel), bar: ui.bar(inLevel, span, 16) };
}

function actProfile(target: User, gid: string | null): R {
  const user = store.getUser(target.id);
  const g = store.getUserGuild(target.id);
  const xp = xpProgress(user.level, user.xp);

  let hatch = 'Trống';
  const p = user.hatchery.plantedEgg;
  if (p?.type) {
    hatch = Date.now() < (p.harvestAt ?? 0)
      ? `🥚 ${p.type} · còn ${Math.ceil(((p.harvestAt ?? 0) - Date.now()) / 60000)}′`
      : `🐉 ${p.type} đã nở!`;
  }

  const weapon = user.equippedItems.weapon ? (WEAPON_NAME[user.equippedItems.weapon] || user.equippedItems.weapon) : '—';
  const ds = user.dungeonStats;
  const petCount = Object.values(user.categorizedInventory.pets).reduce((a, b) => a + b, 0);
  // forceStatic: true -> ép PNG tĩnh (avatar động .gif không render trong thumbnail embed)
  const avatar = target.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });

  const rb = store.getShopRoleBuffs(target.id);
  const buffLines: string[] = [];
  if (rb.huntSuccess) buffLines.push(`+${rb.huntSuccess}% săn`);
  if (rb.dungeonDamagePct) buffLines.push(`+${rb.dungeonDamagePct}% sát thương ải`);
  if (rb.hatchTimeMult < 1) buffLines.push(`−${Math.round((1 - rb.hatchTimeMult) * 100)}% ấp`);

  const e = ui.baseEmbed()
    .setAuthor({ name: `${target.displayName || target.username} · ${balanceRank(user.balance)}`, iconURL: avatar })
    .setThumbnail(avatar)
    .setTitle(`${getIcon(gid, 'level')} Level ${user.level}`)
    .setDescription(
      `\`${xp.bar}\` **${xp.pct}%**\n` +
      `${getIcon(gid, 'xp')} **${ui.fmtNum(xp.inLevel)} / ${ui.fmtNum(xp.span)} XP** — còn ${ui.fmtNum(xp.remain)} để lên **Lv${user.level + 1}**`
    )
    // inline: true -> các ô xếp thành HÀNG NGANG (3 ô/hàng) cho gọn, không dồn một cột
    .addFields(
      { name: `${getIcon(gid, 'money')} Số dư`, value: ui.fmtV(user.balance), inline: true },
      { name: `${getIcon(gid, 'sword')} Vũ khí`, value: weapon, inline: true },
      { name: `${getIcon(gid, 'egg')} Trại ấp`, value: `Lv${user.hatchery.level} · ${hatch}`, inline: true },
      { name: '🐉 Thần thú', value: `${petCount}`, inline: true },
      { name: `${getIcon(gid, 'trophy')} Ải`, value: ds?.totalClears ? `${ds.totalClears} lần · ${ds.successRate || 0}%` : '—', inline: true },
      { name: '🎭 Chức nghiệp', value: buffLines.join(' · ') || '—', inline: true }
    );

  if (g) {
    const b = store.getGuildRankBuffs(g.guildRank.level);
    e.addFields({ name: '🏰 Guild', value: `**${g.name}** · Hạng ${g.guildRank.level} · +${b.incomeBonus}% thu nhập · −${b.cooldownReduction}% hồi · +${b.xpBonus}% XP`, inline: false });
  }
  return { ok: true, embed: e };
}

function actInventory(userId: string, gid: string | null): R {
  const inv = store.getUser(userId).categorizedInventory;
  const fmt = (items: Record<string, number>) => {
    const en = Object.entries(items);
    return en.length ? en.map(([k, v]) => `\`${k}\` ×${v}`).join('\n') : '—';
  };
  return {
    ok: true,
    embed: ui.brand(`${getIcon(gid, 'bag')} Túi Đồ`).setColor(0x8b5a2b).addFields(
      { name: `${getIcon(gid, 'egg')} Trứng`, value: fmt(inv.eggs), inline: true },
      { name: '🐉 Thần thú', value: fmt(inv.pets), inline: true },
      { name: '⚔️ Vũ khí', value: fmt(inv.weapons), inline: true },
      { name: '👻 Linh hồn', value: fmt(inv.monsterItems), inline: true },
      { name: '🔮 Phù chú/Đan', value: fmt(inv.dungeonGear), inline: true },
      { name: '💎 Chiến lợi', value: fmt(inv.dungeonLoot), inline: true },
      { name: '📦 Khác', value: fmt(inv.misc), inline: false }
    )
  };
}

function actLeaderboard(viewerId: string, gid: string | null): R {
  const users = store.getAllUsers().slice().sort((a, b) => b.balance - a.balance);
  const top = users.slice(0, 10);
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``;
  const desc = top.map((u, i) => `${medal(i)} <@${u.userId}> — **${ui.fmtV(u.balance)}**`).join('\n');
  const e = ui.brand(`${getIcon(gid, 'trophy')} Bảng Xếp Hạng Giàu Có`, desc || 'Chưa có dữ liệu.').setColor(ui.COLORS.gold);
  const rank = users.findIndex((u) => u.userId === viewerId) + 1;
  if (rank > 0) e.setFooter({ text: `VIE · Vị trí của bạn: #${rank}` });
  return { ok: true, embed: e };
}

function actGive(fromId: string, targetId: string, amount: number): R {
  if (targetId === fromId) return { ok: false, embed: ui.err('Không thể chuyển V cho chính mình.') };
  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, embed: ui.err('Số tiền không hợp lệ.') };
  const from = store.getUser(fromId);
  if (from.balance < amt) return { ok: false, embed: ui.err('Bạn không đủ V để chuyển.') };
  from.balance -= amt;
  store.getUser(targetId).balance += amt;
  store.save();
  return {
    ok: true,
    embed: ui.ok('💸 Chuyển Tiền', `Đã chuyển **${ui.fmtV(amt)}** cho <@${targetId}>.`)
      .addFields({ name: '💵 Số dư còn lại', value: ui.fmtV(from.balance), inline: true })
  };
}

// ---------------- SLASH ----------------
async function slashRun(interaction: any, r: R) {
  await interaction.reply({ embeds: [r.embed], ephemeral: !r.ok });
}

export const slashWork: SlashCommand = { data: new SlashCommandBuilder().setName('work').setDescription('Làm việc kiếm V (hồi 1 giờ)'), async execute(i) { await slashRun(i, actWork(i.user.id, i.guildId)); } };
export const slashDaily: SlashCommand = { data: new SlashCommandBuilder().setName('daily').setDescription('Nhận quà hàng ngày'), async execute(i) { await slashRun(i, actDaily(i.user.id, i.guildId)); } };
export const slashWeekly: SlashCommand = { data: new SlashCommandBuilder().setName('weekly').setDescription('Nhận quà hàng tuần'), async execute(i) { await slashRun(i, actWeekly(i.user.id, i.guildId)); } };
export const slashCash: SlashCommand = { data: new SlashCommandBuilder().setName('cash').setDescription('Xem số dư V'), async execute(i) { await slashRun(i, actCash(i.user.id, i.guildId)); } };
export const slashInventory: SlashCommand = { data: new SlashCommandBuilder().setName('inventory').setDescription('Xem túi đồ'), async execute(i) { await slashRun(i, actInventory(i.user.id, i.guildId)); } };
export const slashLeaderboard: SlashCommand = { data: new SlashCommandBuilder().setName('leaderboard').setDescription('BXH giàu có'), async execute(i) { await slashRun(i, actLeaderboard(i.user.id, i.guildId)); } };
export const slashBet: SlashCommand = {
  data: new SlashCommandBuilder().setName('bet').setDescription('Cược may rủi 50/50').addIntegerOption((o) => o.setName('amount').setDescription('Số V cược').setRequired(true).setMinValue(10)),
  async execute(i) { await slashRun(i, actBet(i.user.id, i.options.getInteger('amount', true), i.guildId)); }
};
export const slashProfile: SlashCommand = {
  data: new SlashCommandBuilder().setName('profile').setDescription('Xem profile').addUserOption((o) => o.setName('user').setDescription('Người cần xem').setRequired(false)),
  async execute(i) { await slashRun(i, actProfile(i.options.getUser('user') || i.user, i.guildId)); }
};
export const slashGive: SlashCommand = {
  data: new SlashCommandBuilder().setName('give').setDescription('Chuyển V cho người khác')
    .addUserOption((o) => o.setName('user').setDescription('Người nhận').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Số V').setRequired(true).setMinValue(1)),
  async execute(i) { await slashRun(i, actGive(i.user.id, i.options.getUser('user', true).id, i.options.getInteger('amount', true))); }
};

// ---------------- PREFIX ----------------
export const prefixWork: PrefixCommand = { name: 'work', description: 'Làm việc kiếm V', async execute(m) { await m.reply({ embeds: [actWork(m.author.id, m.guildId).embed] }); } };
export const prefixDaily: PrefixCommand = { name: 'daily', description: 'Quà hàng ngày', async execute(m) { await m.reply({ embeds: [actDaily(m.author.id, m.guildId).embed] }); } };
export const prefixWeekly: PrefixCommand = { name: 'weekly', description: 'Quà hàng tuần', async execute(m) { await m.reply({ embeds: [actWeekly(m.author.id, m.guildId).embed] }); } };
export const prefixCash: PrefixCommand = { name: 'cash', description: 'Xem số dư', async execute(m) { await m.reply({ embeds: [actCash(m.author.id, m.guildId).embed] }); } };
export const prefixInventory: PrefixCommand = { name: 'inventory', description: 'Xem túi đồ', async execute(m) { await m.reply({ embeds: [actInventory(m.author.id, m.guildId).embed] }); } };
export const prefixInv: PrefixCommand = { name: 'inv', description: 'Túi đồ (alias)', async execute(m) { await m.reply({ embeds: [actInventory(m.author.id, m.guildId).embed] }); } };
export const prefixBet: PrefixCommand = {
  name: 'bet', description: 'Cược 50/50: v bet <số tiền>',
  async execute(m, args) { await m.reply({ embeds: [actBet(m.author.id, Number(args[0]), m.guildId).embed] }); }
};
export const prefixProfile: PrefixCommand = {
  name: 'profile', description: 'Xem profile',
  async execute(m) { await m.reply({ embeds: [actProfile(m.mentions.users.first() || m.author, m.guildId).embed] }); }
};

export const prefixes: PrefixCommand[] = [prefixWork, prefixDaily, prefixCash, prefixWeekly, prefixBet, prefixProfile, prefixInventory, prefixInv];
