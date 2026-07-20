import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { getEnv } from '../lib/env.js';
import * as ui from '../lib/ui.js';

function helpEmbed(): EmbedBuilder {
  const p = getEnv().PREFIX;
  return ui.brand('🏯 Bảng Lệnh VIE', `Prefix: \`${p}\` · hoặc dùng lệnh gạch chéo \`/\`\nMMORPG Thần Thoại Việt Nam — kiếm V, săn quái, ấp trứng, đấu ải.`)
    .addFields(
      { name: '💰 Kinh Tế', value: '`work` `daily` `weekly` · `cash` `profile` · `give @u <V>` · `top` · `bet <V>` · `inv`', inline: false },
      { name: '⚔️ Săn Quái', value: '`hunt` · `hunt equip <vũ_khí>` · `hunt inv` · `hunt use <bùa>`', inline: false },
      { name: '🥚 Ấp Trứng', value: '`hatch` · `hatch place <trứng>` · `hatch collect` · `hatch upgrade`', inline: false },
      { name: '🏯 Đấu Ải (turn-based)', value: '`dungeon` · `dungeon enter <nhan|thien|ma>` · `dungeon stats`', inline: false },
      { name: '🛒 Cửa Hàng', value: '`shop` · `shop <eggs|weapons|dungeon|roles>` · `buy <id> [sl]` · `sell <id> [sl]`', inline: false },
      { name: '🎮 Giải Trí', value: '`blackjack <V>` (Hit/Stand) · `baucua <cửa> <V>` · `xocdia <chẵn|lẻ> <V>`', inline: false },
      { name: '🏰 Guild', value: '`guild create <tên>` · `guild add/remove @u` · `guild daily` · `guild info` · `guild donate <V>`', inline: false },
      { name: '🎉 Khác', value: '`ga <giờ> <win> <nội dung>` · `quest` · `info`', inline: false }
    )
    .setFooter({ text: 'VIE · Thần Thoại Việt Nam · gõ /help hoặc v help' });
}

// ===================== BASIC CMDS =====================
// Slash: /help  (đặt tên slashHelp vì loader bỏ qua đúng key "slash")
export const slashHelp: SlashCommand = {
  data: new SlashCommandBuilder().setName('help').setDescription('Hướng dẫn sử dụng bot VIE'),
  async execute(interaction) { await interaction.reply({ embeds: [helpEmbed()], ephemeral: true }); }
};

export const prefixHelp: PrefixCommand = {
  name: 'help',
  description: 'Bảng lệnh VIE',
  async execute(message) { await message.reply({ embeds: [helpEmbed()] }); }
};

const store = getStore();

// v cash
export const prefix: PrefixCommand = {
  name: 'cash',
  description: 'Check số dư người dùng',
  async execute(message) {
    const profile = store.getUser(message.author.id);
    await message.reply(`Số dư của ${message.author} là ${profile.balance} V.`);
  }
};

// v info
export const prefixInfo: PrefixCommand = {
  name: 'info',
  description: 'Hiển thị thông tin server',
  async execute(message) {
    const g = message.guild!;
    const embed = new EmbedBuilder()
      .setTitle(`Thông tin server: ${g.name}`)
      .setColor('#1a237e')
      .addFields(
        { name: 'ID', value: g.id, inline: true },
        { name: 'Thành viên', value: `${g.memberCount}`, inline: true }
      );
    await message.reply({ embeds: [embed] });
  }
};

// v give <@user> <amount>
export const prefixGive: PrefixCommand = {
  name: 'give',
  description: 'Chuyển tiền cho người dùng khác',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = Number(args.filter((a) => !a.startsWith('<@')).at(-1));
    if (!target || !Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: v give <@user> <số tiền>');
      return;
    }
    const from = store.getUser(message.author.id);
    if (from.balance < amount) {
      await message.reply('Không đủ số dư.');
      return;
    }
    from.balance -= amount;
    const to = store.getUser(target.id);
    to.balance += amount;
    store.save();
    await message.reply(`Đã chuyển ${amount} V cho ${target}.`);
  }
};

// v bxh
export const prefixBxh: PrefixCommand = {
  name: 'bxh',
  description: 'Bảng xếp hạng giàu nhất',
  async execute(message) {
    const top = store.getTopBalances(10);
    const desc = top
      .map((u, i) => `${i + 1}. <@${u.userId}> — ${u.balance} V`)
      .join('\n');
    const embed = new EmbedBuilder().setTitle('BXH Giàu Nhất').setDescription(desc || 'Trống');
    await message.reply({ embeds: [embed] });
  }
};


// v quest (daily 3 quest + refresh confirm -2000 V)
export const prefixQuest: PrefixCommand = {
  name: 'quest',
  description: 'Nhiệm vụ hằng ngày',
  async execute(message) {
    const quests = store.getDailyQuests(message.author.id);
    const rows = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`quest_refresh:${message.author.id}`).setLabel('Làm Mới').setStyle(ButtonStyle.Secondary)
    );
    const lines = quests.map((q, idx) => `Nhiệm vụ ${idx + 1}: ${q.desc} — Thưởng ${q.reward} V — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
    await message.reply({ content: lines.join('\n') + '\nNhấn "Làm Mới" nếu nhiệm vụ quá khó (mất 2000 V).', components: [rows] });
  }
};

// ===================== SLASH COMMANDS =====================

// /info - Thông tin server
export const slashInfo: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Hiển thị thông tin server'),
  async execute(interaction) {
    const g = interaction.guild!;
    const embed = new EmbedBuilder()
      .setTitle(`Thông tin server: ${g.name}`)
      .setColor('#1a237e')
      .addFields(
        { name: 'ID', value: g.id, inline: true },
        { name: 'Thành viên', value: `${g.memberCount}`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};

// /give - Chuyển tiền cho người dùng khác
export const slashGive: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Chuyển tiền cho người dùng khác')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Người dùng nhận tiền')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Số tiền chuyển')
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'Không thể chuyển tiền cho chính mình.', ephemeral: true });
      return;
    }
    
    const from = store.getUser(interaction.user.id);
    if (from.balance < amount) {
      await interaction.reply({ content: 'Không đủ số dư.', ephemeral: true });
      return;
    }
    
    from.balance -= amount;
    const to = store.getUser(target.id);
    to.balance += amount;
    store.save();
    
    await interaction.reply(`Đã chuyển ${amount} V cho ${target}.`);
  }
};

// /bxh - Bảng xếp hạng giàu nhất
export const slashBxh: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('bxh')
    .setDescription('Bảng xếp hạng giàu nhất'),
  async execute(interaction) {
    const top = store.getTopBalances(10);
    const desc = top
      .map((u, i) => `${i + 1}. <@${u.userId}> — ${u.balance} V`)
      .join('\n');
    const embed = new EmbedBuilder()
      .setTitle('BXH Giàu Nhất')
      .setDescription(desc || 'Trống')
      .setColor('#FFD700');
    await interaction.reply({ embeds: [embed] });
  }
};

// /quest - Nhiệm vụ hằng ngày
export const slashQuest: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Nhiệm vụ hằng ngày'),
  async execute(interaction) {
    const quests = store.getDailyQuests(interaction.user.id);
    const rows = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`quest_refresh:${interaction.user.id}`)
        .setLabel('Làm Mới')
        .setStyle(ButtonStyle.Secondary)
    );
    const lines = quests.map((q, idx) => `Nhiệm vụ ${idx + 1}: ${q.desc} — Thưởng ${q.reward} V — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
    await interaction.reply({ 
      content: lines.join('\n') + '\nNhấn "Làm Mới" nếu nhiệm vụ quá khó (mất 2000 V).', 
      components: [rows] 
    });
  }
};

// Đăng ký thêm các lệnh prefix phụ trong file
export const prefixes: PrefixCommand[] = [prefixHelp, prefixInfo, prefixGive, prefixBxh, prefixQuest];


