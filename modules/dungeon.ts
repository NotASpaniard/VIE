import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
  EmbedBuilder, Message, SlashCommandBuilder
} from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import * as ui from '../lib/ui.js';
import { getIcon } from '../lib/icons.js';

const store = getStore();
const activeFights = new Set<string>(); // userId đang trong trận

const TIERS = ['nhan', 'thien', 'ma'] as const;
type Tier = (typeof TIERS)[number];

const TIER_META: Record<Tier, { label: string; color: number; emoji: string }> = {
  nhan: { label: 'Nhân Giới', color: ui.COLORS.nhan, emoji: '🌿' },
  thien: { label: 'Thiên Giới', color: ui.COLORS.thien, emoji: '⚡' },
  ma: { label: 'Ma Giới', color: ui.COLORS.ma, emoji: '🔥' }
};

const BOSS: Record<Tier, { name: string; emoji: string; hp: number; atk: number }> = {
  nhan: { name: 'Yêu Vương Nhân Giới', emoji: '🐗', hp: 130, atk: 12 },
  thien: { name: 'Thiên Tướng Hộ Pháp', emoji: '⚡', hp: 230, atk: 20 },
  ma: { name: 'Ma Chúa Hắc Ám', emoji: '👹', hp: 360, atk: 30 }
};

const WEAPON_ATK: Record<string, number> = {
  kiem_go: 0, kiem_sat: 10, kiem_bac: 20, kiem_vang: 30, kiem_than: 50, dep_to_ong: 99
};

function playerStats(user: any) {
  const wb = user.equippedItems?.weapon ? (WEAPON_ATK[user.equippedItems.weapon] ?? 0) : 0;
  const roleBuff = store.getShopRoleBuffs(user.userId); // Phá Ải Sư: +% sát thương
  const zb = store.getZodiacBonuses(user.userId);       // bonus con giáp
  const baseAtk = 14 + Math.floor(wb / 3);
  return {
    maxHp: Math.max(30, 100 + user.level * 10 + zb.hp),
    atk: Math.max(4, Math.floor(baseAtk * (1 + roleBuff.dungeonDamagePct / 100)) + zb.atk),
    def: Math.max(0, Math.min(60, zb.def)),   // % giảm sát thương nhận (trần 60%)
    luck: Math.max(0, Math.min(40, zb.luck)), // % cộng thêm tỷ lệ chí mạng (trần 40%)
    weapon: user.equippedItems?.weapon || null
  };
}

const rnd = (n: number) => Math.floor(Math.random() * (n + 1)); // 0..n

type Fight = {
  php: number; pmax: number; patk: number; pdef: number; pluck: number;
  bhp: number; bmax: number; batk: number;
  bossName: string; bossEmoji: string;
  tier: Tier; turn: number; combo: number; log: string[];
};

function comboMult(combo: number): number { return 1 + Math.min(combo, 5) * 0.1; } // tối đa x1.5

function emo(s: string): any {
  const m = /^<(a?):([\w~]+):(\d+)>$/.exec(s);
  return m ? { id: m[3], name: m[2], animated: m[1] === 'a' } : s;
}

function buttons(disabled: boolean, potions: number, gid: string | null): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('dg:atk').setLabel('Đánh').setEmoji(emo(getIcon(gid, 'sword'))).setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg:def').setLabel('Thủ').setEmoji(emo(getIcon(gid, 'shield'))).setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg:dodge').setLabel('Né').setEmoji(emo(getIcon(gid, 'run'))).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('dg:potion').setLabel(`Potion (${potions})`).setEmoji(emo(getIcon(gid, 'potion'))).setStyle(ButtonStyle.Success).setDisabled(disabled || potions <= 0)
  );
}

function renderFight(f: Fight, gid: string | null): EmbedBuilder {
  const meta = TIER_META[f.tier];
  const hp = getIcon(gid, 'heart');
  const comboTxt = f.combo > 0 ? `  ·  🔥 Combo **x${comboMult(f.combo).toFixed(1)}**` : '';
  return ui.baseEmbed()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${meta.label} — Lượt ${f.turn}`)
    .setDescription(
      `${f.bossEmoji} **${f.bossName}**\n${hp} ${ui.hpBar(f.bhp, f.bmax)}\n\n` +
      `🧙 **Bạn**${comboTxt}\n${hp} ${ui.hpBar(f.php, f.pmax)}`
    )
    .addFields({ name: '📜 Diễn biến', value: f.log.slice(-4).map((l) => `${ui.E.dot} ${l}`).join('\n') || '—' });
}

async function startCombat(msg: Message, userId: string, tier: Tier): Promise<void> {
  const gid = msg.guildId;
  const user = store.getUser(userId);
  const ps = playerStats(user);
  const boss = BOSS[tier];
  const f: Fight = {
    php: ps.maxHp, pmax: ps.maxHp, patk: ps.atk, pdef: ps.def, pluck: ps.luck,
    bhp: boss.hp, bmax: boss.hp, batk: boss.atk,
    bossName: boss.name, bossEmoji: boss.emoji,
    tier, turn: 1, combo: 0, log: ['⚔️ Trận chiến bắt đầu!']
  };

  const potions = () => store.getItemQuantity(userId, 'dungeonGear', 'linh_dan_cao_cap');
  await msg.edit({ embeds: [renderFight(f, gid)], components: [buttons(false, potions(), gid)] });

  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000, idle: 75000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: 'Đây không phải trận của bạn.', ephemeral: true });
      return;
    }
    const action = i.customId.split(':')[1];

    // Potion không có -> từ chối, không tính lượt
    if (action === 'potion' && potions() <= 0) {
      await i.reply({ content: 'Bạn không có Linh Đan Cấp Cao để hồi máu.', ephemeral: true });
      return;
    }
    await i.deferUpdate();

    // Đòn boss lượt này: ngẫu nhiên, thỉnh thoảng bất ngờ tung đòn mạnh (không báo trước)
    const heavy = Math.random() < 0.18;
    const baseIncoming = heavy ? Math.round(f.batk * 2) + rnd(10) : f.batk + rnd(6);
    const rawIncoming = Math.round(baseIncoming * (1 - f.pdef / 100)); // giáp con giáp giảm sát thương
    const charged = heavy; // dùng cho log "đòn mạnh"
    let took = 0;

    if (action === 'atk') {
      if (Math.random() < 0.08) {
        f.combo = 0;
        f.log.push('⚔️ Bạn vung đòn nhưng **HỤT**!');
      } else {
        const crit = Math.random() < (0.22 + f.pluck / 100); // may mắn con giáp tăng chí mạng
        const mult = comboMult(f.combo);
        const dmg = Math.round((f.patk + rnd(10)) * mult * (crit ? 1.9 : 1));
        f.bhp -= dmg; f.combo++;
        f.log.push(`${crit ? '💥 **CHÍ MẠNG!** ' : '⚔️ '}Gây **${dmg}**${mult > 1 ? ` (combo x${mult.toFixed(1)})` : ''}.`);
      }
      if (f.bhp > 0) took = rawIncoming; // tấn công để hở -> ăn trọn đòn
    } else if (action === 'def') {
      const chip = Math.round(f.patk * 0.35);
      f.bhp -= chip;
      if (f.bhp > 0) {
        if (Math.random() < (charged ? 0.35 : 0.45)) {
          const reflect = Math.round(f.patk * 0.6);
          f.bhp -= reflect;
          f.log.push(`🛡️ **ĐỠ & PHẢN ĐÒN ${reflect}!** Chặn hoàn toàn.`);
        } else {
          took = Math.round(rawIncoming * 0.2);
          f.log.push(`🛡️ Thủ: chặn 80%, chịu **${took}**${charged ? ' (đòn mạnh!)' : ''} · phản ${chip}.`);
        }
      } else {
        f.log.push(`🛡️ Phản ${chip} — hạ gục boss!`);
      }
    } else if (action === 'dodge') {
      if (Math.random() < 0.5) {
        const counter = Math.round(f.patk * 0.7);
        f.bhp -= counter;
        f.log.push(`🏃 **NÉ HOÀN HẢO** + phản ${counter}!`);
      } else {
        took = Math.round(rawIncoming * 1.3);
        f.combo = 0;
        f.log.push(`🏃 Né hụt! Dính **${took}**${charged ? ' đòn mạnh' : ''}.`);
      }
    } else if (action === 'potion') {
      store.removeItemFromInventory(userId, 'dungeonGear', 'linh_dan_cao_cap', 1);
      const heal = Math.floor(f.pmax * 0.4);
      f.php = Math.min(f.pmax, f.php + heal);
      f.combo = 0;
      took = rawIncoming;
      f.log.push(`🧪 Hồi **${heal}** máu${charged ? ' — nhưng dính nguyên đòn mạnh!' : ''}.`);
    }

    // Đòn mạnh bất ngờ khi đang tấn công -> ghi chú để người chơi biết vì sao mất nhiều máu
    if (charged && action === 'atk' && took > 0) f.log.push('💢 Boss bất ngờ tung **đòn mạnh**!');

    if (f.bhp <= 0) { collector.stop('win'); return; }
    if (took > 0) f.php -= took;
    if (f.php <= 0) { collector.stop('lose'); return; }

    f.turn++;
    await msg.edit({ embeds: [renderFight(f, gid)], components: [buttons(false, potions(), gid)] });
  });

  collector.on('end', async (_c, reason) => {
    activeFights.delete(userId);
    const meta = TIER_META[tier];
    try {
      if (reason === 'win') {
        const r = store.grantDungeonRewards(userId, tier);
        store.recordDungeonResult(userId, true);
        const xp = store.addXP(userId, 25);
        const embed = ui.ok(`${getIcon(gid, 'trophy')} Chiến thắng ${meta.label}!`,
          `Bạn đã hạ gục **${f.bossName}** sau ${f.turn} lượt!`)
          .setColor(ui.COLORS.gold)
          .addFields(
            { name: `${getIcon(gid, 'gift')} Phần thưởng`, value: r.lines.join('\n'), inline: false },
            { name: `${getIcon(gid, 'xp')} Kinh nghiệm`, value: xp.message, inline: false }
          );
        await msg.edit({ embeds: [embed], components: [buttons(true, 0, gid)] });
      } else if (reason === 'lose') {
        store.recordDungeonResult(userId, false);
        await msg.edit({
          embeds: [ui.err(`Bạn đã gục ngã trước **${f.bossName}**...`).setTitle(`${getIcon(gid, 'skull')} Thất bại tại ${meta.label}`)],
          components: [buttons(true, 0, gid)]
        });
      } else {
        // hết giờ / rời trận
        store.recordDungeonResult(userId, false);
        await msg.edit({
          embeds: [ui.warn('Bạn đã bỏ dở trận đấu (hết thời gian). Vé vào ải đã mất.').setTitle(`${ui.E.run} Rút lui khỏi ${meta.label}`)],
          components: [buttons(true, 0, gid)]
        });
      }
    } catch { /* message có thể đã bị xoá */ }
  });
}

// Điều phối vào ải cho cả prefix lẫn slash
async function beginEnter(userId: string, tier: string, getMsg: (payload: any) => Promise<Message>, reject: (embed: EmbedBuilder) => Promise<void>): Promise<void> {
  if (!TIERS.includes(tier as Tier)) { await reject(ui.err('Cõi không hợp lệ. Chọn: nhan / thien / ma.')); return; }
  const t = tier as Tier;

  if (activeFights.has(userId)) { await reject(ui.warn('Bạn đang trong một trận đấu khác. Hãy hoàn thành trước đã.')); return; }

  const cd = store.checkCooldown(userId, `dungeon_${t}` as any);
  if (!cd.canUse) { await reject(ui.warn(`Bạn cần chờ **${cd.remainingMinutes} phút** nữa mới vào lại ${TIER_META[t].label}.`)); return; }

  const entry = store.checkDungeonEntry(userId, t);
  if (!entry.ok) { await reject(ui.err(entry.message!)); return; }

  // Tiêu vé + đặt cooldown NGAY khi bắt đầu (chống rời trận để né cooldown)
  const cfg = store.getDungeonTier(t);
  store.consumeDungeonEntry(userId, t);
  store.setCooldown(userId, `dungeon_${t}` as any, cfg.cooldown);
  activeFights.add(userId);

  const loading = ui.baseEmbed().setColor(TIER_META[t].color).setTitle(`${TIER_META[t].emoji} Tiến vào ${TIER_META[t].label}...`).setDescription('Chuẩn bị chiến đấu!');
  const msg = await getMsg({ embeds: [loading] });
  await startCombat(msg, userId, t);
}

// ===================== STATUS / STATS / BXH =====================
function statusEmbed(): EmbedBuilder {
  return ui.brand('🏯 Tam Giới Ải Đấu', 'Chinh phục boss theo lượt: **Đánh · Thủ · Né · Potion**.')
    .addFields(
      { name: '🌿 Nhân Giới', value: `CD 5′ · Dễ\nYêu cầu: —\nThưởng: V 50–150, trứng/linh hồn thấp`, inline: true },
      { name: '⚡ Thiên Giới', value: `CD 15′ · Vừa\nYêu cầu: 1 Bùa Hộ Mệnh\nThưởng: V 200–500, trứng/linh hồn trung`, inline: true },
      { name: '🔥 Ma Giới', value: `CD 30′ · Khó\nYêu cầu: Linh Đan Cấp Cao + Lv5\nThưởng: V 500–1500, loot cao + Dép Tổ Ong`, inline: true }
    )
    .setFooter({ text: 'VIE · Dùng: v dungeon enter <nhan|thien|ma>' });
}

function statsEmbed(user: any): EmbedBuilder {
  const s = user.dungeonStats || {};
  return ui.brand('📊 Thống Kê Ải Đấu')
    .addFields(
      { name: '🏆 Chinh phục', value: `${s.totalClears || 0}`, inline: true },
      { name: '🎯 Số lần đánh', value: `${s.attempts || 0}`, inline: true },
      { name: '✅ Tỷ lệ thắng', value: `${s.successRate || 0}%`, inline: true },
      { name: '💰 Tổng V kiếm', value: ui.fmtV(s.totalEarned || 0), inline: true },
      { name: '🥚 Trứng', value: `${s.eggsCollected || 0}`, inline: true },
      { name: '👻 Linh hồn', value: `${s.soulsCollected || 0}`, inline: true }
    );
}

function leaderboardEmbed(): EmbedBuilder {
  const users = Object.values((store as any).db.users) as any[];
  const top = users
    .filter((u) => u.dungeonStats?.totalClears > 0)
    .sort((a, b) => (b.dungeonStats?.totalClears || 0) - (a.dungeonStats?.totalClears || 0))
    .slice(0, 10);
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``;
  const desc = top.map((u, i) => `${medal(i)} <@${u.userId}> — **${u.dungeonStats.totalClears}** lần`).join('\n');
  return ui.brand('🏆 BXH Chinh Phục Ải', desc || 'Chưa có ai chinh phục ải nào.').setColor(ui.COLORS.gold);
}

// ===================== PREFIX =====================
export const prefixDungeonMain: PrefixCommand = {
  name: 'dungeon',
  description: 'Ải đấu: dungeon / enter / stats / leaderboard',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'enter') {
      await beginEnter(
        message.author.id,
        args[1]?.toLowerCase() ?? '',
        (payload) => (message.channel as any).send(payload),
        async (embed) => { await message.reply({ embeds: [embed] }); }
      );
    } else if (sub === 'stats') {
      await message.reply({ embeds: [statsEmbed(store.getUser(message.author.id))] });
    } else if (sub === 'leaderboard' || sub === 'bxh') {
      await message.reply({ embeds: [leaderboardEmbed()] });
    } else {
      await message.reply({ embeds: [statusEmbed()] });
    }
  }
};

// ===================== SLASH =====================
export const slashDungeonEnter: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('dungeon_enter')
    .setDescription('Vào ải đấu (chiến đấu theo lượt)')
    .addStringOption((o) => o.setName('tier').setDescription('Cõi muốn vào').setRequired(true)
      .addChoices({ name: 'Nhân Giới', value: 'nhan' }, { name: 'Thiên Giới', value: 'thien' }, { name: 'Ma Giới', value: 'ma' })),
  async execute(interaction) {
    const tier = interaction.options.getString('tier', true);
    await beginEnter(
      interaction.user.id,
      tier,
      async (payload) => { await interaction.reply(payload); return interaction.fetchReply() as any; },
      async (embed) => {
        if (interaction.replied || interaction.deferred) await interaction.editReply({ embeds: [embed] });
        else await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    );
  }
};

export const slashDungeonMain: SlashCommand = {
  data: new SlashCommandBuilder().setName('dungeon_main').setDescription('Xem trạng thái các ải'),
  async execute(interaction) { await interaction.reply({ embeds: [statusEmbed()] }); }
};

export const slashDungeonStats: SlashCommand = {
  data: new SlashCommandBuilder().setName('dungeon_stats').setDescription('Thống kê cá nhân ải đấu'),
  async execute(interaction) { await interaction.reply({ embeds: [statsEmbed(store.getUser(interaction.user.id))] }); }
};

export const slashDungeonLeaderboard: SlashCommand = {
  data: new SlashCommandBuilder().setName('dungeon_leaderboard').setDescription('Bảng xếp hạng chinh phục ải'),
  async execute(interaction) { await interaction.reply({ embeds: [leaderboardEmbed()] }); }
};

export const slashes: SlashCommand[] = [slashDungeonEnter, slashDungeonStats, slashDungeonLeaderboard, slashDungeonMain];
export const prefixes: PrefixCommand[] = [prefixDungeonMain];
