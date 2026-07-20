import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, Message,
  PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder
} from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import * as ui from '../lib/ui.js';
import { ICONS, ICON_BY_KEY, DEFAULT_PALETTE, getIcon } from '../lib/icons.js';

const store = getStore();

/** Chuyển chuỗi emoji thành dạng component hợp lệ (unicode hoặc custom <:name:id>) */
function toEmoji(s: string): any {
  const m = /^<(a?):([\w~]+):(\d+)>$/.exec(s);
  if (m) return { id: m[3], name: m[2], animated: m[1] === 'a' };
  return s;
}

// ---------- Ô 1: icon đang dùng ----------
function panelEmbed(guildId: string): EmbedBuilder {
  const lines = ICONS.map((i) => `${getIcon(guildId, i.key)} **${i.label}** — ${i.where}`);
  return ui.brand('🎨 Tuỳ Chỉnh Icon', 'Icon áp dụng cho toàn bộ giao diện bot trong server này.')
    .addFields(
      { name: '🖼️ Icon đang dùng & nơi sử dụng', value: lines.join('\n') },
      { name: '✏️ Chỉnh icon', value: 'Chọn icon ở menu bên dưới → chọn **Icon mặc định** hoặc **Icon server** → chọn emoji mới.' }
    );
}

// ---------- Ô 2: menu chọn icon cần chỉnh ----------
function pickRow(guildId: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cst:pick')
    .setPlaceholder('✏️ Chọn icon cần chỉnh…')
    .addOptions(ICONS.map((i) => ({
      label: i.label,
      description: i.where.slice(0, 95),
      value: i.key,
      emoji: toEmoji(getIcon(guildId, i.key))
    })));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

// ---------- Bước 2: 2 lựa chọn nguồn icon ----------
function detailEmbed(guildId: string, key: string): EmbedBuilder {
  const def = ICON_BY_KEY[key];
  return ui.brand(`✏️ Chỉnh icon: ${def.label}`,
    `Đang dùng: ${getIcon(guildId, key)}\nDùng ở: ${def.where}\n\nChọn nguồn emoji:`);
}

function sourceRow(key: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cst:src:default:${key}`).setLabel('Icon mặc định').setEmoji('🌐').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`cst:src:server:${key}`).setLabel('Icon server').setEmoji('🏠').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cst:reset:${key}`).setLabel('Về mặc định').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cst:back').setLabel('Quay lại').setStyle(ButtonStyle.Secondary)
  );
}

// ---------- Bước 3: danh sách emoji để chọn (hiện ảnh, ẩn id) + phân trang ----------
const PAGE_SIZE = 25; // giới hạn select menu của Discord

function sourceOptions(source: 'default' | 'server', guild: Guild): any[] {
  if (source === 'default') return DEFAULT_PALETTE.map((p) => ({ label: p.name, value: p.e, emoji: p.e }));
  return [...guild.emojis.cache.values()].map((e) => ({
    label: (e.name ?? 'emoji').slice(0, 100),   // chỉ hiện TÊN, ẩn id
    value: e.toString(),                         // <:name:id> — người dùng không thấy
    emoji: { id: e.id, name: e.name ?? undefined, animated: Boolean(e.animated) }
  }));
}

function emojiComponents(key: string, source: 'default' | 'server', guild: Guild, page: number): any[] | null {
  const all = sourceOptions(source, guild);
  if (!all.length) return null;
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const p = Math.min(Math.max(0, page), totalPages - 1);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`cst:set:${key}`)
    .setPlaceholder(`${source === 'default' ? '🌐 Emoji mặc định' : '🏠 Emoji server'} — trang ${p + 1}/${totalPages}`)
    .addOptions(all.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE));

  const rows: any[] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];

  if (totalPages > 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`cst:page:${source}:${key}:${p - 1}`).setLabel('Trang trước').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
      new ButtonBuilder().setCustomId('cst:noop').setLabel(`${p + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(`cst:page:${source}:${key}:${p + 1}`).setLabel('Trang sau').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1)
    ));
  }
  return rows;
}

// ---------- Gắn xử lý tương tác ----------
function attach(msg: Message, userId: string, guild: Guild): void {
  const gid = guild.id;
  const collector = msg.createMessageComponentCollector({ time: 600000, idle: 180000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== userId) { await i.reply({ content: 'Bảng này không phải của bạn.', ephemeral: true }); return; }
    const id = i.customId;
    await i.deferUpdate();

    if (id === 'cst:pick' && i.isStringSelectMenu()) {
      const key = i.values[0];
      await msg.edit({ embeds: [detailEmbed(gid, key)], components: [sourceRow(key)] });
      return;
    }

    if (id === 'cst:noop') return;

    if (id.startsWith('cst:src:') || id.startsWith('cst:page:')) {
      const parts = id.split(':');
      const source = parts[2] as 'default' | 'server';
      const key = parts[3];
      const page = parts[4] !== undefined ? Number(parts[4]) : 0;
      const rows = emojiComponents(key, source, guild, page);
      if (!rows) {
        await msg.edit({
          embeds: [detailEmbed(gid, key).setDescription('⚠️ Server chưa có emoji riêng nào. Hãy thêm emoji cho server hoặc dùng icon mặc định.')],
          components: [sourceRow(key)]
        });
        return;
      }
      await msg.edit({ embeds: [detailEmbed(gid, key)], components: [...rows, sourceRow(key)] });
      return;
    }

    if (id.startsWith('cst:set:') && i.isStringSelectMenu()) {
      const key = id.split(':')[2];
      store.setIconOverride(gid, key, i.values[0]);
      await msg.edit({
        embeds: [panelEmbed(gid).setColor(ui.COLORS.success).setDescription(`✅ Đã đổi icon **${ICON_BY_KEY[key].label}** thành ${i.values[0]}`)],
        components: [pickRow(gid)]
      });
      return;
    }

    if (id.startsWith('cst:reset:')) {
      const key = id.split(':')[2];
      store.resetIconOverride(gid, key);
      await msg.edit({
        embeds: [panelEmbed(gid).setColor(ui.COLORS.success).setDescription(`↩️ Đã trả icon **${ICON_BY_KEY[key].label}** về mặc định.`)],
        components: [pickRow(gid)]
      });
      return;
    }

    if (id === 'cst:back') {
      await msg.edit({ embeds: [panelEmbed(gid)], components: [pickRow(gid)] });
    }
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* ignore */ }
  });
}

const NO_PERM = 'Chỉ Quản trị viên (Administrator) mới chỉnh được icon của server.';

export const slashCustom: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('custom')
    .setDescription('Tuỳ chỉnh icon/emoji cho giao diện bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.guild) { await interaction.reply({ embeds: [ui.err('Lệnh này chỉ dùng trong server.')], ephemeral: true }); return; }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ embeds: [ui.err(NO_PERM)], ephemeral: true }); return;
    }
    const gid = interaction.guild.id;
    await interaction.reply({ embeds: [panelEmbed(gid)], components: [pickRow(gid)] });
    const msg = await interaction.fetchReply() as any;
    attach(msg, interaction.user.id, interaction.guild);
  }
};

export const prefixCustom: PrefixCommand = {
  name: 'custom',
  description: 'Tuỳ chỉnh icon/emoji cho giao diện bot (Admin)',
  async execute(message) {
    if (!message.guild) return;
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply({ embeds: [ui.err(NO_PERM)] }); return;
    }
    const gid = message.guild.id;
    const msg = await message.reply({ embeds: [panelEmbed(gid)], components: [pickRow(gid)] });
    attach(msg, message.author.id, message.guild);
  }
};

export const prefixes: PrefixCommand[] = [prefixCustom];
