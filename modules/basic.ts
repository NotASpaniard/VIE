import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { getEnv } from '../lib/env.js';

// ===================== BASIC CMDS =====================
// Slash: /help
export const slash: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hướng dẫn sử dụng bot VIE'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏯 Hướng dẫn sử dụng bot VIE')
      .setDescription('Danh sách các lệnh và chức năng của bot')
      .setColor('#1a237e')
      .addFields(
        { 
          name: '⚙️ Prefix Commands', 
          value: `Sử dụng prefix: \`${getEnv().PREFIX}\``,
          inline: false
        },
        { 
          name: '💰 Lệnh Kinh Tế (Economy)', 
          value: [
            '• `v work` - Làm việc kiếm V (30 phút)',
            '• `v daily` - Nhận thưởng hàng ngày',
            '• `v weekly` - Quà hàng tuần (7 ngày)',
            '• `v bet <số tiền>` - Đặt cược may rủi 50/50',
            '• `v cash` - Kiểm tra số dư tài khoản',
            '• `v profile [@user]` - Xem profile đầy đủ',
            '• `v give <@user> <số tiền>` - Chuyển tiền cho người khác',
            '• `v bxh` - Xem bảng xếp hạng giàu có',
            '• `v quest` - Xem và làm nhiệm vụ hàng ngày',
            '• `v inventory` / `v inv` - Xem túi đồ phân loại'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🏰 Lệnh Guild', 
          value: [
            '• `/guildowner <@user> <tên guild> <role>` - Quản lý chủ guild',
            '• `v guild create <tên>` - Tạo guild mới',
            '• `v guild add/remove/list` - Quản lý thành viên guild',
            '• `v guild daily` - Nhận thưởng guild hàng ngày',
            '• `v guild bxh` - Bảng xếp hạng guild',
            '• `v guild inv` - Xem kho guild',
            '• `v guild quest` - Nhiệm vụ guild',
            '• `v guild info` - Thông tin guild rank & buff',
            '• `v guild donate <số tiền>` - Đóng góp nâng cấp guild rank'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🥚 Lệnh Ấp Trứng (Hatch)', 
          value: [
            '• `v hatch` - Xem trạng thái trại ấp trứng',
            '• `v hatch place <tên_trứng>` - Đặt ấp trứng',
            '• `v hatch collect` - Thu thập trứng đã nở',
            '• `v hatch upgrade` - Nâng cấp trại'
          ].join('\n'),
          inline: false
        },
        { 
          name: '⚔️ Lệnh Săn Quái (Hunt)', 
          value: [
            '• `v hunt` - Săn quái thần thoại (2 phút)',
            '• `v hunt equip <vũ_khí>` - Trang bị vũ khí',
            '• `v hunt inventory` - Xem đồ săn quái',
            '• `v hunt use <bùa_phép>` - Dùng bùa phép'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🏯 Lệnh Đi Ải (Dungeon)', 
          value: [
            '• `v dungeon` - Xem trạng thái các ải',
            '• `v dungeon enter <nhan|thien|ma>` - Vào ải',
            '• `v dungeon stats` - Thống kê cá nhân',
            '• `v dungeon leaderboard` - BXH chinh phục ải'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🛒 Lệnh Cửa Hàng (Shop)', 
          value: [
            '• `v shop` - Xem tất cả cửa hàng',
            '• `v shop eggs` - Cửa hàng trứng thần',
            '• `v shop weapons` - Cửa hàng binh khí',
            '• `v shop dungeon` - Cửa hàng phù chú',
            '• `v shop roles` - Cửa hàng chức nghiệp',
            '• `v buy <item_id> [số lượng]` - Mua item',
            '• `v sell <item_id> [số lượng]` - Bán item'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🎮 Giải trí (Entertainment)', 
          value: [
            '• `v blackjack <số tiền>` - Chơi Blackjack (x2, Blackjack x2.5)',
            '• `v baucua <bầu|cua|tôm|cá|gà|nai> <số tiền>` - Chơi Bầu Cua',
            '• `v xocdia <chẵn|lẻ> <số tiền>` - Chơi Xóc Đĩa (x1.95)'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: '🏯 Bot VIE - Sức mạnh biển cả!' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
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
export const prefixes: PrefixCommand[] = [prefixInfo, prefixGive, prefixBxh, prefixQuest];


