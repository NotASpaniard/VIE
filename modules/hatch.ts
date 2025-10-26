import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// v hatch - Xem trạng thái trại ấp trứng

// /hatch - Slash command handler
export const slashHatch: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hatch')
    .setDescription('hatch command'),
  async execute(interaction) {
    // TODO: Implement slash command logic
    await interaction.reply({ content: 'Slash command hatch - Coming soon!', ephemeral: true });
  }
};

export const prefixHatch: PrefixCommand = {
  name: 'hatch',
  description: 'Xem trạng thái trại ấp trứng',
  async execute(message, args) {
    const store = getStore();
    const user = store.getUser(message.author.id);
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    
    // Tính thời gian còn lại cho hatch
    let hatchStatus = 'Không có trứng đang ấp';
    let progressBar = '';
    
    if (user.hatchery.plantedEgg.type) {
      const now = Date.now();
      const eggConfig = gameConfig.eggs[user.hatchery.plantedEgg.type];
      
      if (now < user.hatchery.plantedEgg.harvestAt!) {
        const totalTime = user.hatchery.plantedEgg.harvestAt! - user.hatchery.plantedEgg.plantedAt!;
        const elapsed = now - user.hatchery.plantedEgg.plantedAt!;
        const remaining = user.hatchery.plantedEgg.harvestAt! - now;
        const progress = Math.floor((elapsed / totalTime) * 100);
        
        // Tạo progress bar
        const filled = Math.floor(progress / 10);
        progressBar = '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + `] ${progress}%`;
        
        hatchStatus = `🥚 Đang ấp ${eggConfig.emoji} ${eggConfig.name}\n⏰ Còn ${Math.ceil(remaining / 60000)} phút\n${progressBar}`;
      } else {
        hatchStatus = `🐉 ${eggConfig.emoji} ${eggConfig.name} đã nở, có thể thu thập!`;
      }
    }
    
    // Hiển thị các loại trứng có thể ấp
    const availableEggs = Object.entries(gameConfig.eggs)
      .filter(([_, config]: [string, any]) => user.hatchery.level >= config.levelRequired)
      .map(([key, config]: [string, any]) => `${config.emoji} ${config.name} (Level ${config.levelRequired})`)
      .join('\n');
    
    const embed = new EmbedBuilder()
      .setTitle('🥚 Trại Ấp Trứng')
      .setColor('#1a237e')
      .addFields(
        { name: '🏗️ Trại Level', value: `${user.hatchery.level}`, inline: true },
        { name: '🥚 Trạng thái', value: hatchStatus, inline: false },
        { name: '🐉 Có thể ấp', value: availableEggs || 'Cần nâng cấp trại', inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v hatch place <tên_trứng> - Đặt trứng ấp
export const prefixHatchPlace: PrefixCommand = {
  name: 'hatch_place',
  description: 'Đặt trứng ấp: v hatch place <tên_trứng>',
  async execute(message, args) {
    const eggType = args[0]?.toLowerCase();
    if (!eggType) {
      await message.reply('Cú pháp: v hatch place <rong_xanh|phuong_hoang|ky_lan|bach_ho|huyen_vu>');
      return;
    }
    
    const store = getStore();
    const result = store.plantEgg(message.author.id, eggType);
    
    if (!result.success) {
      await message.reply(result.message);
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🥚 Đặt Trứng Ấp')
      .setColor('#4fc3f7')
      .setDescription(result.message)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v hatch collect - Thu thập thần thú
export const prefixHatchCollect: PrefixCommand = {
  name: 'hatch_collect',
  description: 'Thu thập thần thú',
  async execute(message) {
    const store = getStore();
    const result = store.hatchEgg(message.author.id);
    
    if (!result.success) {
      await message.reply(result.message);
      return;
    }
    
    // Cộng XP cho collect
    const xpResult = store.addXP(message.author.id, 20);
    
    const embed = new EmbedBuilder()
      .setTitle('🐉 Thu Thập Thần Thú')
      .setColor('#ff6f00')
      .setDescription(`${result.message}\n${xpResult.message}`)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v hatch upgrade - Nâng cấp trại
export const prefixHatchUpgrade: PrefixCommand = {
  name: 'hatch_upgrade',
  description: 'Nâng cấp trại ấp trứng',
  async execute(message) {
    const store = getStore();
    const result = store.upgradeHatchery(message.author.id);
    
    if (!result.success) {
      await message.reply(result.message);
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🏗️ Nâng Cấp Trại')
      .setColor('#ff6f00')
      .setDescription(result.message)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// Main hatch command handler
export const prefixHatchMain: PrefixCommand = {
  name: 'hatch',
  description: 'Quản lý trại ấp trứng: hatch/place/collect/upgrade',
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    
    if (subcommand === 'place') {
      await prefixHatchPlace.execute(message, args.slice(1));
    } else if (subcommand === 'collect') {
      await prefixHatchCollect.execute(message, []);
    } else if (subcommand === 'upgrade') {
      await prefixHatchUpgrade.execute(message, []);
    } else {
      // Default: show hatch status
      await prefixHatch.execute(message, []);
    }
  }
};

// ===================== SLASH COMMANDS =====================

// /hatch place - Đặt trứng ấp
export const slashHatchPlace: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hatch_place')
    .setDescription('Đặt trứng ấp')
    .addStringOption(option =>
      option.setName('egg_type')
        .setDescription('Loại trứng')
        .setRequired(true)
        .addChoices(
          { name: 'Rồng Xanh', value: 'rong_xanh' },
          { name: 'Phượng Hoàng', value: 'phuong_hoang' },
          { name: 'Kỳ Lân', value: 'ky_lan' },
          { name: 'Bạch Hổ', value: 'bach_ho' },
          { name: 'Huyền Vũ', value: 'huyen_vu' }
        )
    ),
  async execute(interaction) {
    const eggType = interaction.options.getString('egg_type', true);
    
    const store = getStore();
    const result = store.plantEgg(interaction.user.id, eggType);
    
    if (!result.success) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🥚 Đặt Trứng Ấp')
      .setColor('#4fc3f7')
      .setDescription(result.message)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

// /hatch collect - Thu thập thần thú
export const slashHatchCollect: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hatch_collect')
    .setDescription('Thu thập thần thú đã nở'),
  async execute(interaction) {
    const store = getStore();
    const result = store.hatchEgg(interaction.user.id);
    
    if (!result.success) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }
    
    // Cộng XP cho collect
    const xpResult = store.addXP(interaction.user.id, 20);
    
    const embed = new EmbedBuilder()
      .setTitle('🐉 Thu Thập Thần Thú')
      .setColor('#ff6f00')
      .setDescription(`${result.message}\n${xpResult.message}`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

// /hatch upgrade - Nâng cấp trại
export const slashHatchUpgrade: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hatch_upgrade')
    .setDescription('Nâng cấp trại ấp trứng'),
  async execute(interaction) {
    const store = getStore();
    const result = store.upgradeHatchery(interaction.user.id);
    
    if (!result.success) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🏗️ Nâng Cấp Trại')
      .setColor('#ff6f00')
      .setDescription(result.message)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

// /hatch main - Menu chính hatch
export const slashHatchMain: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hatch_main')
    .setDescription('Menu chính ấp trứng'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🥚 Menu Ấp Trứng')
      .setDescription('Chọn hành động ấp trứng:')
      .setColor('#4fc3f7')
      .addFields(
        { name: '📊 Trạng thái', value: '`/hatch` - Xem trạng thái trại ấp trứng', inline: false },
        { name: '🥚 Đặt trứng', value: '`/hatch_place <loại>` - Đặt trứng ấp', inline: false },
        { name: '🐉 Thu thập', value: '`/hatch_collect` - Thu thập thần thú đã nở', inline: false },
        { name: '🏗️ Nâng cấp', value: '`/hatch_upgrade` - Nâng cấp trại', inline: false }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

export const slashes: SlashCommand[] = [slashHatch, slashHatchPlace, slashHatchCollect, slashHatchUpgrade, slashHatchMain];

export const prefixes: PrefixCommand[] = [prefixHatchMain];
