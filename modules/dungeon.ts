import { EmbedBuilder } from 'discord.js';
import type { PrefixCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// v dungeon - Xem trạng thái các ải
export const prefixDungeon: PrefixCommand = {
  name: 'dungeon',
  description: 'Xem trạng thái các ải',
  async execute(message) {
    const store = getStore();
    const user = store.getUser(message.author.id);
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    
    const embed = new EmbedBuilder()
      .setTitle('🏯 Tam Giới Ải Đấu')
      .setColor('#1a237e')
      .setDescription('Chọn một trong ba cõi để chinh phục:')
      .addFields(
        {
          name: '🌿 Nhân Giới (Normal)',
          value: `Cooldown: 5 phút\nYêu cầu: Không\nĐộ khó: Thấp (70%)\nPhần thưởng: Trứng thấp, Linh hồn thấp, V 50-150`,
          inline: true
        },
        {
          name: '⚡ Thiên Giới (Challenge)',
          value: `Cooldown: 15 phút\nYêu cầu: 1 Bùa Hộ Mệnh\nĐộ khó: Trung bình (50%)\nPhần thưởng: Trứng trung, Linh hồn trung, V 200-500`,
          inline: true
        },
        {
          name: '🔥 Ma Giới (Insane)',
          value: `Cooldown: 30 phút\nYêu cầu: 1 Linh Đan Cấp Cao + Level 5+\nĐộ khó: Cao (30%)\nPhần thưởng: Trứng cao, Linh hồn cao, V 500-1500`,
          inline: true
        }
      )
      .setFooter({ text: 'Sử dụng: v dungeon enter <nhan|thien|ma>' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v dungeon enter <tier> - Vào ải
export const prefixDungeonEnter: PrefixCommand = {
  name: 'dungeon_enter',
  description: 'Vào ải: v dungeon enter <nhan|thien|ma>',
  async execute(message, args) {
    const tier = args[0]?.toLowerCase();
    if (!tier || !['nhan', 'thien', 'ma'].includes(tier)) {
      await message.reply('Cú pháp: v dungeon enter <nhan|thien|ma>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    
    // Kiểm tra cooldown
    const cooldownKey = `dungeon_${tier}`;
    const cooldownCheck = store.checkCooldown(message.author.id, cooldownKey as any);
    
    if (!cooldownCheck.canUse) {
      await message.reply(`⏰ Bạn cần chờ ${cooldownCheck.remainingMinutes} phút nữa mới có thể vào ${tier} giới.`);
      return;
    }
    
    // Lấy config cho tier
    const tierConfig = gameConfig.dungeon_tiers[`${tier}_gioi`];
    if (!tierConfig) {
      await message.reply('Cõi không hợp lệ.');
      return;
    }
    
    // Kiểm tra yêu cầu
    if (tierConfig.requirements.includes('bua_ho_menh')) {
      if (!store.getItemQuantity(message.author.id, 'dungeonGear', 'bua_ho_menh')) {
        await message.reply('Cần 1 Bùa Hộ Mệnh để vào Thiên Giới. Hãy craft từ 5 Linh Hồn Thấp.');
        return;
      }
    }
    
    if (tierConfig.requirements.includes('linh_dan_cao_cap')) {
      if (!store.getItemQuantity(message.author.id, 'dungeonGear', 'linh_dan_cao_cap')) {
        await message.reply('Cần 1 Linh Đan Cấp Cao để vào Ma Giới. Hãy craft từ 10 Linh Hồn Cao.');
        return;
      }
    }
    
    if (tierConfig.requirements.includes('level_5')) {
      if (user.level < 5) {
        await message.reply('Cần Level 5+ để vào Ma Giới.');
        return;
      }
    }
    
    // Thực hiện vào ải
    const result = store.enterDungeon(message.author.id, tier);
    
    if (!result.success) {
      await message.reply(result.message);
      return;
    }
    
    // Set cooldown
    store.setCooldown(message.author.id, cooldownKey as any, tierConfig.cooldown);
    
    // Cộng XP
    const xpResult = store.addXP(message.author.id, 20);
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle(`${tierConfig.emoji} ${tierConfig.name}`)
      .setColor(tier === 'nhan' ? '#4fc3f7' : tier === 'thien' ? '#ff6f00' : '#1a237e')
      .setDescription(result.message)
      .addFields(
        { name: '💰 Phần thưởng', value: result.rewards || 'Không có', inline: true },
        { name: '⏰ Cooldown', value: `${tierConfig.cooldown} phút`, inline: true },
        { name: '📈 XP', value: xpResult.message, inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v dungeon stats - Thống kê cá nhân
export const prefixDungeonStats: PrefixCommand = {
  name: 'dungeon_stats',
  description: 'Thống kê cá nhân',
  async execute(message) {
    const store = getStore();
    const user = store.getUser(message.author.id);
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Thống Kê Ải Đấu')
      .setColor('#1a237e')
      .addFields(
        { name: '🏆 Tổng lần chinh phục', value: `${user.dungeonStats?.totalClears || 0}`, inline: true },
        { name: '✅ Tỷ lệ thành công', value: `${user.dungeonStats?.successRate || 0}%`, inline: true },
        { name: '💰 Tổng V kiếm được', value: `${user.dungeonStats?.totalEarned || 0} V`, inline: true },
        { name: '🐉 Trứng thu thập', value: `${user.dungeonStats?.eggsCollected || 0}`, inline: true },
        { name: '👻 Linh hồn thu thập', value: `${user.dungeonStats?.soulsCollected || 0}`, inline: true },
        { name: '💎 Ngọc linh thu thập', value: `${user.dungeonStats?.ngocLinhCollected || 0}`, inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v dungeon leaderboard - BXH
export const prefixDungeonLeaderboard: PrefixCommand = {
  name: 'dungeon_leaderboard',
  description: 'Bảng xếp hạng chinh phục ải',
  async execute(message) {
    const store = getStore();
    const users = Object.values((store as any).db.users) as any[];
    
    const leaderboard = users
      .filter(u => u.dungeonStats?.totalClears > 0)
      .sort((a, b) => (b.dungeonStats?.totalClears || 0) - (a.dungeonStats?.totalClears || 0))
      .slice(0, 10);
    
    const lines = leaderboard.map((u, i) => 
      `${i + 1}. <@${u.userId}> - ${u.dungeonStats?.totalClears || 0} lần chinh phục`
    );
    
    const embed = new EmbedBuilder()
      .setTitle('🏆 Bảng Xếp Hạng Ải Đấu')
      .setColor('#ff6f00')
      .setDescription(lines.join('\n') || 'Chưa có ai chinh phục ải nào.')
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// Main dungeon command handler
export const prefixDungeonMain: PrefixCommand = {
  name: 'dungeon',
  description: 'Quản lý ải đấu: dungeon/enter/stats/leaderboard',
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    
    if (subcommand === 'enter') {
      await prefixDungeonEnter.execute(message, args.slice(1));
    } else if (subcommand === 'stats') {
      await prefixDungeonStats.execute(message, []);
    } else if (subcommand === 'leaderboard') {
      await prefixDungeonLeaderboard.execute(message, []);
    } else {
      // Default: show dungeon status
      await prefixDungeon.execute(message, []);
    }
  }
};

export const prefixes: PrefixCommand[] = [prefixDungeonMain];
