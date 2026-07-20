import { Client, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore, type GiveawayRecord } from '../store/store.js';

const REACTION = '🎉'; // emoji chuẩn -> hoạt động ở mọi server (không phụ thuộc custom emoji)
const store = getStore();

function hasGiveawayPermission(member: any): boolean {
  return Boolean(
    member?.permissions.has(PermissionFlagsBits.Administrator) ||
    member?.roles.cache.some((role: any) => role.name === 'Giveaway')
  );
}

// Rút thăm người thắng từ reaction 🎉, lọc bot + role yêu cầu.
async function drawWinners(msg: any, rec: GiveawayRecord): Promise<string[]> {
  const reaction = msg.reactions.cache.get(REACTION);
  if (!reaction) return [];
  const users = await reaction.users.fetch();
  let pool = users.filter((u: any) => !u.bot);

  if (rec.requiredRole && msg.guild) {
    const filtered: any[] = [];
    for (const u of pool.values()) {
      try {
        const m = await msg.guild.members.fetch(u.id);
        if (m.roles.cache.has(rec.requiredRole)) filtered.push(u);
      } catch { /* rời server -> bỏ qua */ }
    }
    pool = filtered as any;
  }

  const arr = Array.from(pool.values ? pool.values() : pool) as any[];
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(1, rec.winners)).map((u) => u.id);
}

async function fetchGiveawayMessage(client: Client, rec: GiveawayRecord): Promise<any | null> {
  try {
    const channel = await client.channels.fetch(rec.channelId);
    if (!channel || !(channel as any).messages) return null;
    return await (channel as TextChannel).messages.fetch(rec.messageId);
  } catch {
    return null;
  }
}

// Kết thúc giveaway: rút thăm, sửa embed, thông báo. Dùng chung cho auto-end / end / reroll.
export async function endGiveaway(client: Client, rec: GiveawayRecord, isReroll = false): Promise<void> {
  const msg = await fetchGiveawayMessage(client, rec);
  if (!msg) { store.markGiveawayEnded(rec.messageId); return; }

  const winnerIds = await drawWinners(msg, rec);
  if (!isReroll) store.markGiveawayEnded(rec.messageId);

  const winnerText = winnerIds.length
    ? winnerIds.map((id) => `<@${id}>`).join(', ')
    : 'Không có ai tham gia hợp lệ 😢';

  const resultEmbed = new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY ${isReroll ? 'REROLL' : 'KẾT THÚC'} 🎉`)
    .setDescription(`**Phần thưởng:** ${rec.prize}\n**Người thắng:** ${winnerText}\n\nChúc mừng! 🎊`)
    .setColor('#f46026')
    .setFooter({ text: `Tổ chức bởi` })
    .setTimestamp();

  try { await msg.edit({ embeds: [resultEmbed] }); } catch { /* ignore */ }
  if (winnerIds.length) {
    try { await (msg.channel as TextChannel).send(`🎉 Chúc mừng ${winnerText} đã thắng **${rec.prize}**!`); } catch { /* ignore */ }
  }
}

function scheduleGiveaway(client: Client, rec: GiveawayRecord): void {
  const delay = rec.endTime - Date.now();
  if (delay <= 0) { void endGiveaway(client, rec); return; }
  // setTimeout tối đa ~24.8 ngày; nếu dài hơn thì hẹn lại từng chặng.
  const MAX = 2_000_000_000;
  if (delay > MAX) {
    setTimeout(() => scheduleGiveaway(client, rec), MAX);
  } else {
    setTimeout(() => { void endGiveaway(client, rec); }, delay);
  }
}

// Gọi khi bot khởi động: khôi phục timer cho các giveaway chưa kết thúc.
export function restoreGiveaways(client: Client): void {
  const active = store.getActiveGiveaways();
  for (const rec of active) scheduleGiveaway(client, rec);
  if (active.length) console.log(`Khôi phục ${active.length} giveaway đang diễn ra.`);
}

export const slashGiveaway: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Tạo giveaway (dùng prefix v ga để đầy đủ tuỳ chọn)'),
  async execute(interaction) {
    await interaction.reply({ content: 'Dùng lệnh prefix: `v ga <số giờ> <số người win> [role] <nội dung>`', ephemeral: true });
  }
};

export const prefixGiveaway: PrefixCommand = {
  name: 'ga',
  description: 'Tạo giveaway mới (chỉ role Giveaway/Admin)',
  async execute(message, args) {
    if (!hasGiveawayPermission(message.member)) {
      await message.reply('❌ Bạn không có quyền sử dụng lệnh này.');
      return;
    }
    if (args.length < 3) {
      await message.reply('Cú pháp: `v ga <số giờ> <số người win> <nội dung>` hoặc `v ga <số giờ> <số người win> <@role> <nội dung>`');
      return;
    }

    const hours = parseFloat(args[0]);
    const winners = parseInt(args[1]);
    if (!Number.isFinite(hours) || isNaN(winners) || hours <= 0 || winners <= 0) {
      await message.reply('❌ Số giờ và số người thắng phải là số dương.');
      return;
    }
    if (hours > 720) { await message.reply('❌ Thời gian tối đa 720 giờ (30 ngày).'); return; }
    if (winners > 20) { await message.reply('❌ Tối đa 20 người thắng.'); return; }

    let requiredRole: string | null = null;
    let content = '';
    if (args.length >= 4 && args[2].startsWith('<@&') && args[2].endsWith('>')) {
      requiredRole = args[2].replace(/[<@&>]/g, '');
      content = args.slice(3).join(' ');
    } else {
      content = args.slice(2).join(' ');
    }
    if (!content) { await message.reply('❌ Nội dung giveaway không được để trống.'); return; }

    const endTime = Date.now() + hours * 3600000;
    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setAuthor({ name: 'Lửa Việt', iconURL: message.guild?.iconURL() || undefined })
      .setDescription(
        `## ${content}\n\n` +
        `Nhấn ${REACTION} để tham gia!\n` +
        `⏳ Kết thúc: <t:${Math.floor(endTime / 1000)}:R>\n` +
        `🏆 Số giải: ${winners}\n` +
        (requiredRole ? `📋 Yêu cầu role: <@&${requiredRole}>\n` : '') +
        `👤 Tổ chức bởi: <@${message.author.id}>`
      )
      .setColor('#f46026')
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: `Kết thúc lúc` })
      .setTimestamp(new Date(endTime));

    const giveawayMessage = await (message.channel as TextChannel).send({ embeds: [embed] });
    try { await giveawayMessage.react(REACTION); } catch { /* ignore */ }

    const rec: GiveawayRecord = {
      messageId: giveawayMessage.id,
      channelId: giveawayMessage.channelId,
      guildId: message.guild!.id,
      hostId: message.author.id,
      prize: content,
      winners,
      requiredRole,
      endTime,
      ended: false
    };
    store.addGiveaway(rec);
    scheduleGiveaway(message.client, rec);

    await message.reply(`✅ Đã tạo giveaway! ID: \`${giveawayMessage.id}\``);
  }
};

export const prefixReroll: PrefixCommand = {
  name: 'reroll',
  description: 'Chọn lại người thắng cuộc (chỉ role Giveaway/Admin)',
  async execute(message, args) {
    if (!hasGiveawayPermission(message.member)) { await message.reply('❌ Bạn không có quyền sử dụng lệnh này.'); return; }
    if (args.length < 1) { await message.reply('Cú pháp: `v reroll <id_message>`'); return; }

    const rec = store.getGiveaway(args[0]);
    if (!rec) { await message.reply('❌ Không tìm thấy giveaway với ID này.'); return; }
    await endGiveaway(message.client, rec, true);
    await message.reply('✅ Đã reroll giveaway!');
  }
};

export const prefixEndGiveaway: PrefixCommand = {
  name: 'end',
  description: 'Kết thúc giveaway sớm (chỉ role Giveaway/Admin)',
  async execute(message, args) {
    if (!hasGiveawayPermission(message.member)) { await message.reply('❌ Bạn không có quyền sử dụng lệnh này.'); return; }
    if (args.length < 1) { await message.reply('Cú pháp: `v end <id_message>`'); return; }

    const rec = store.getGiveaway(args[0]);
    if (!rec) { await message.reply('❌ Không tìm thấy giveaway với ID này.'); return; }
    if (rec.ended) { await message.reply('❌ Giveaway này đã kết thúc rồi.'); return; }
    await endGiveaway(message.client, rec, false);
    await message.reply('✅ Đã kết thúc giveaway!');
  }
};

export const prefixGiveawayList: PrefixCommand = {
  name: 'glist',
  description: 'Xem các giveaway đang diễn ra (chỉ role Giveaway/Admin)',
  async execute(message) {
    if (!hasGiveawayPermission(message.member)) { await message.reply('❌ Bạn không có quyền sử dụng lệnh này.'); return; }

    const active = store.getActiveGiveaways();
    const embed = new EmbedBuilder()
      .setTitle('📋 Danh Sách Giveaway Đang Diễn Ra')
      .setColor('#FFA500')
      .setTimestamp();
    if (!active.length) {
      embed.setDescription('Hiện tại chưa có giveaway nào đang diễn ra.');
    } else {
      embed.setDescription(
        active.map((g) => `• **${g.prize}** — ${g.winners} giải — kết thúc <t:${Math.floor(g.endTime / 1000)}:R> — ID: \`${g.messageId}\``).join('\n')
      );
    }
    await message.reply({ embeds: [embed] });
  }
};

export const prefixes: PrefixCommand[] = [prefixGiveaway, prefixReroll, prefixEndGiveaway, prefixGiveawayList];
