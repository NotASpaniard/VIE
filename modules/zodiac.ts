import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
  EmbedBuilder, Message, SlashCommandBuilder
} from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import * as ui from '../lib/ui.js';
import { ZODIAC, STAT_LABEL, type ZodiacStat } from '../lib/zodiac.js';

const store = getStore();
const STATS: ZodiacStat[] = ['atk', 'hp', 'hunt', 'def', 'luck'];

function zodiacEmbed(userId: string): EmbedBuilder {
  const eggs = store.getUser(userId).categorizedInventory.eggs;
  const owned = store.countZodiacOwned(userId);
  const b = store.getZodiacBonuses(userId);
  const lines = ZODIAC.map((z) => {
    const qty = eggs[z.egg] || 0;
    const mark = qty > 0 ? `✅×${qty}` : '⬜';
    return `${z.emoji} **${z.chi}** ${mark} · +${z.buff.val} ${STAT_LABEL[z.buff.stat]} / −${z.weak.val} ${STAT_LABEL[z.weak.stat]}`;
  });
  const bonusTxt = STATS.map((s) => `${STAT_LABEL[s]} ${b[s] >= 0 ? '+' : ''}${b[s]}`).join(' · ');
  return ui.brand('🐉 Trứng 12 Con Giáp', `Sưu tập đủ **12 con giáp** rồi **Hợp Thể** thành trứng thần thoại để ấp!\n\n${lines.join('\n')}`)
    .addFields(
      { name: '📊 Chỉ số cộng dồn (đang sở hữu)', value: bonusTxt, inline: false },
      { name: '🔮 Tiến trình', value: `**${owned}/12** con giáp`, inline: false }
    )
    .setFooter({ text: owned >= 12 ? 'Nhấn Hợp Thể để hợp nhất!' : 'VIE · v buy <egg_id> để mua (giá tăng dần mỗi lần)' });
}

function fuseRow(userId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const canFuse = store.countZodiacOwned(userId) >= 12;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('zodiac_fuse').setLabel('Hợp Thể').setEmoji('🔮').setStyle(ButtonStyle.Success).setDisabled(disabled || !canFuse)
  );
}

function attachFuse(msg: Message, userId: string): void {
  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000, idle: 60000 });
  collector.on('collect', async (i) => {
    if (i.user.id !== userId) { await i.reply({ content: 'Đây không phải bộ sưu tập của bạn.', ephemeral: true }); return; }
    await i.deferUpdate();
    const res = store.fuseZodiac(userId);
    if (!res.success) {
      await msg.edit({ embeds: [zodiacEmbed(userId).setColor(ui.COLORS.warning)], components: [fuseRow(userId)] });
      await i.followUp({ content: `⚠️ ${res.message}`, ephemeral: true });
      return;
    }
    collector.stop('fused');
    await msg.edit({
      embeds: [ui.ok('🔮 Hợp Thể Thành Công!', res.message).setColor(ui.COLORS.gold)],
      components: [fuseRow(userId, true)]
    });
  });
}

async function showZodiac(userId: string, send: (payload: any) => Promise<Message>): Promise<void> {
  const msg = await send({ embeds: [zodiacEmbed(userId)], components: [fuseRow(userId)] });
  attachFuse(msg, userId);
}

export const prefixZodiac: PrefixCommand = {
  name: 'zodiac',
  description: 'Xem trứng 12 con giáp & hợp thể',
  async execute(message, args) {
    if (args[0]?.toLowerCase() === 'fuse') {
      const res = store.fuseZodiac(message.author.id);
      await message.reply({ embeds: [res.success ? ui.ok('🔮 Hợp Thể Thành Công!', res.message).setColor(ui.COLORS.gold) : ui.err(res.message)] });
      return;
    }
    await showZodiac(message.author.id, (p) => (message.channel as any).send(p));
  }
};

export const slashZodiac: SlashCommand = {
  data: new SlashCommandBuilder().setName('zodiac').setDescription('Xem trứng 12 con giáp & hợp thể'),
  async execute(interaction) {
    await interaction.reply({ embeds: [zodiacEmbed(interaction.user.id)], components: [fuseRow(interaction.user.id)] });
    const msg = await interaction.fetchReply() as any;
    attachFuse(msg, interaction.user.id);
  }
};

export const prefixes: PrefixCommand[] = [prefixZodiac];
