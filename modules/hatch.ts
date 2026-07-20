import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as ui from '../lib/ui.js';
import { getIcon } from '../lib/icons.js';

const store = getStore();
const loadConfig = () => JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));

function hatchStatusEmbed(userId: string, gid: string | null): EmbedBuilder {
  const user = store.getUser(userId);
  const cfg = loadConfig();
  const planted = user.hatchery.plantedEgg;

  let status = '🪺 Chưa có trứng nào đang ấp.';
  if (planted?.type) {
    const eggConfig = cfg.eggs[planted.type];
    if (!eggConfig) {
      status = '⚠️ Trứng đang ấp không còn hợp lệ (config đã đổi). Hãy thu thập để dọn.';
    } else {
      const now = Date.now();
      if (now < (planted.harvestAt ?? 0)) {
        const total = (planted.harvestAt! - planted.plantedAt!) || 1;
        const elapsed = now - planted.plantedAt!;
        const remainMin = Math.ceil((planted.harvestAt! - now) / 60000);
        status = `${eggConfig.emoji} **${eggConfig.name}** đang ấp\n${ui.bar(elapsed, total)}  ${Math.floor((elapsed / total) * 100)}%\n${getIcon(gid, 'cooldown')} Còn ~${remainMin} phút`;
      } else {
        status = `${ui.E.check} ${eggConfig.emoji} **${eggConfig.name}** đã nở! Dùng \`v hatch collect\` để thu.`;
      }
    }
  }

  const available = Object.entries(cfg.eggs)
    .filter(([, c]: [string, any]) => user.hatchery.level >= c.levelRequired)
    .map(([k, c]: [string, any]) => `${c.emoji} \`${k}\` — ${c.name}`)
    .join('\n');

  return ui.brand(`${getIcon(gid, 'egg')} Trại Ấp Trứng Thần Thú`)
    .addFields(
      { name: '🏗️ Cấp trại', value: `Level ${user.hatchery.level}`, inline: true },
      { name: '📦 Trạng thái', value: status, inline: false },
      { name: '🐣 Có thể ấp', value: available || 'Nâng cấp trại để mở khoá thêm.', inline: false }
    )
    .setFooter({ text: 'VIE · v hatch place/collect/upgrade' });
}

export const slashHatch: SlashCommand = {
  data: new SlashCommandBuilder().setName('hatch').setDescription('Xem trạng thái trại ấp trứng'),
  async execute(interaction) { await interaction.reply({ embeds: [hatchStatusEmbed(interaction.user.id, interaction.guildId)] }); }
};

export const prefixHatch: PrefixCommand = {
  name: 'hatch',
  description: 'Xem trạng thái trại ấp trứng',
  async execute(message) { await message.reply({ embeds: [hatchStatusEmbed(message.author.id, message.guildId)] }); }
};

export const prefixHatchPlace: PrefixCommand = {
  name: 'hatch_place',
  description: 'Đặt trứng ấp: v hatch place <tên_trứng>',
  async execute(message, args) {
    const eggType = args[0]?.toLowerCase();
    if (!eggType) { await message.reply({ embeds: [ui.err('Cú pháp: `v hatch place <rong_xanh|phuong_hoang|ky_lan|bach_ho|huyen_vu>`')] }); return; }
    const result = store.plantEgg(message.author.id, eggType);
    if (!result.success) { await message.reply({ embeds: [ui.err(result.message)] }); return; }
    await message.reply({ embeds: [ui.ok('🥚 Đặt Trứng Ấp', result.message)] });
  }
};

export const prefixHatchCollect: PrefixCommand = {
  name: 'hatch_collect',
  description: 'Thu thập thần thú',
  async execute(message) {
    const result = store.hatchEgg(message.author.id);
    if (!result.success) { await message.reply({ embeds: [ui.err(result.message)] }); return; }
    const xp = store.addXP(message.author.id, 20);
    await message.reply({ embeds: [ui.ok('🐉 Thu Thập Thần Thú', `${result.message}\n${xp.message}`).setColor(ui.COLORS.gold)] });
  }
};

export const prefixHatchUpgrade: PrefixCommand = {
  name: 'hatch_upgrade',
  description: 'Nâng cấp trại ấp trứng',
  async execute(message) {
    const result = store.upgradeHatchery(message.author.id);
    if (!result.success) { await message.reply({ embeds: [ui.err(result.message)] }); return; }
    await message.reply({ embeds: [ui.ok('🏗️ Nâng Cấp Trại', result.message)] });
  }
};

export const prefixHatchMain: PrefixCommand = {
  name: 'hatch',
  description: 'Quản lý trại ấp trứng: hatch/place/collect/upgrade',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'place') await prefixHatchPlace.execute(message, args.slice(1));
    else if (sub === 'collect') await prefixHatchCollect.execute(message, []);
    else if (sub === 'upgrade') await prefixHatchUpgrade.execute(message, []);
    else await prefixHatch.execute(message, []);
  }
};

// ===================== SLASH =====================
export const slashHatchPlace: SlashCommand = {
  data: new SlashCommandBuilder().setName('hatch_place').setDescription('Đặt trứng ấp')
    .addStringOption((o) => o.setName('egg_type').setDescription('Loại trứng').setRequired(true)
      .addChoices(
        { name: 'Rồng Xanh', value: 'rong_xanh' }, { name: 'Phượng Hoàng', value: 'phuong_hoang' },
        { name: 'Kỳ Lân', value: 'ky_lan' }, { name: 'Bạch Hổ', value: 'bach_ho' }, { name: 'Huyền Vũ', value: 'huyen_vu' }
      )),
  async execute(interaction) {
    const result = store.plantEgg(interaction.user.id, interaction.options.getString('egg_type', true));
    if (!result.success) { await interaction.reply({ embeds: [ui.err(result.message)], ephemeral: true }); return; }
    await interaction.reply({ embeds: [ui.ok('🥚 Đặt Trứng Ấp', result.message)] });
  }
};

export const slashHatchCollect: SlashCommand = {
  data: new SlashCommandBuilder().setName('hatch_collect').setDescription('Thu thập thần thú đã nở'),
  async execute(interaction) {
    const result = store.hatchEgg(interaction.user.id);
    if (!result.success) { await interaction.reply({ embeds: [ui.err(result.message)], ephemeral: true }); return; }
    const xp = store.addXP(interaction.user.id, 20);
    await interaction.reply({ embeds: [ui.ok('🐉 Thu Thập Thần Thú', `${result.message}\n${xp.message}`).setColor(ui.COLORS.gold)] });
  }
};

export const slashHatchUpgrade: SlashCommand = {
  data: new SlashCommandBuilder().setName('hatch_upgrade').setDescription('Nâng cấp trại ấp trứng'),
  async execute(interaction) {
    const result = store.upgradeHatchery(interaction.user.id);
    if (!result.success) { await interaction.reply({ embeds: [ui.err(result.message)], ephemeral: true }); return; }
    await interaction.reply({ embeds: [ui.ok('🏗️ Nâng Cấp Trại', result.message)] });
  }
};

export const slashHatchMain: SlashCommand = {
  data: new SlashCommandBuilder().setName('hatch_main').setDescription('Xem trạng thái trại ấp trứng'),
  async execute(interaction) { await interaction.reply({ embeds: [hatchStatusEmbed(interaction.user.id, interaction.guildId)] }); }
};

export const slashes: SlashCommand[] = [slashHatch, slashHatchPlace, slashHatchCollect, slashHatchUpgrade, slashHatchMain];
export const prefixes: PrefixCommand[] = [prefixHatchMain];
