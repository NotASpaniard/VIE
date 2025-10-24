import { EmbedBuilder } from 'discord.js';
import type { PrefixCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

// v work - Làm việc kiếm tiền
export const prefixWork: PrefixCommand = {
  name: 'work',
  description: 'Làm việc kiếm V (cooldown 1 giờ)',
  async execute(message) {
    const store = getStore();
    const cooldownCheck = store.checkCooldown(message.author.id, 'work');
    
    if (!cooldownCheck.canUse) {
      await message.reply(`⏰ Bạn cần chờ ${cooldownCheck.remainingMinutes} phút nữa mới có thể làm việc.`);
      return;
    }
    
    const user = store.getUser(message.author.id);
    
    // Tính reward: 100-999 V + level bonus
    const baseReward = 100 + Math.floor(Math.random() * 900); // 100-999
    const levelBonus = user.level * 5; // +5 V per level
    const totalReward = baseReward + levelBonus;
    
    // Áp dụng guild rank buff
    const userGuild = store.getUserGuild(message.author.id);
    let finalReward = totalReward;
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      const bonus = Math.floor(totalReward * buffs.incomeBonus / 100);
      finalReward += bonus;
    }
    
    user.balance += finalReward;
    store.setCooldown(message.author.id, 'work', 60); // 1 giờ = 60 phút
    
    // Cộng XP
    const xpResult = store.addXP(message.author.id, 10);
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle('💼 Làm Việc')
      .setColor('#1a237e')
      .addFields(
        { name: '💰 Thu nhập', value: `${finalReward} V`, inline: true },
        { name: '📊 Chi tiết', value: `Cơ bản: ${baseReward} V\nLevel bonus: +${levelBonus} V`, inline: true },
        { name: '⏰ Cooldown', value: '1 giờ', inline: true }
      )
      .setTimestamp();
    
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      embed.addFields({ name: '🏆 Guild Bonus', value: `+${buffs.incomeBonus}% thu nhập`, inline: false });
    }
    
    embed.addFields({ name: '🎯 XP', value: xpResult.message, inline: false });
    
    await message.reply({ embeds: [embed] });
  }
};

// v weekly - Quà hàng tuần
export const prefixWeekly: PrefixCommand = {
  name: 'weekly',
  description: 'Nhận quà hàng tuần (cooldown 7 ngày)',
  async execute(message) {
    const store = getStore();
    const cooldownCheck = store.checkCooldown(message.author.id, 'weekly');
    
    if (!cooldownCheck.canUse) {
      const days = Math.floor(cooldownCheck.remainingMinutes / 1440);
      const hours = Math.floor((cooldownCheck.remainingMinutes % 1440) / 60);
      await message.reply(`⏰ Bạn cần chờ ${days} ngày ${hours} giờ nữa mới có thể nhận quà tuần.`);
      return;
    }
    
    const user = store.getUser(message.author.id);
    
    // Reward: 1000-5000 V dựa trên level
    const baseReward = 1000 + (user.level * 200);
    const randomBonus = Math.floor(Math.random() * 1000);
    const totalReward = baseReward + randomBonus;
    
    // Áp dụng guild rank buff
    const userGuild = store.getUserGuild(message.author.id);
    let finalReward = totalReward;
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      const bonus = Math.floor(totalReward * buffs.incomeBonus / 100);
      finalReward += bonus;
    }
    
    user.balance += finalReward;
    store.setCooldown(message.author.id, 'weekly', 10080); // 7 days in minutes
    
    // Cộng XP
    const xpResult = store.addXP(message.author.id, 50);
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle('🎁 Quà Hàng Tuần')
      .setColor('#1a237e')
      .addFields(
        { name: '💰 Phần thưởng', value: `${finalReward} V`, inline: true },
        { name: '📊 Chi tiết', value: `Cơ bản: ${baseReward} V\nBonus: +${randomBonus} V`, inline: true },
        { name: '⏰ Cooldown', value: '7 ngày', inline: true }
      )
      .setTimestamp();
    
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      embed.addFields({ name: '🏆 Guild Bonus', value: `+${buffs.incomeBonus}% thu nhập`, inline: false });
    }
    
    embed.addFields({ name: '🎯 XP', value: xpResult.message, inline: false });
    
    await message.reply({ embeds: [embed] });
  }
};

// v bet <amount> - Đặt cược may rủi
export const prefixBet: PrefixCommand = {
  name: 'bet',
  description: 'Đặt cược may rủi 50/50',
  async execute(message, args) {
    const amount = Number(args[0]);
    if (!Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: v bet <số tiền>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    
    if (user.balance < amount) {
      await message.reply('Không đủ tiền để đặt cược.');
      return;
    }
    
    // Trừ tiền trước
    user.balance -= amount;
    
    // 50/50 chance
    const won = Math.random() < 0.5;
    const winnings = won ? Math.floor(amount * 1.8) : 0; // 80% return if win
    user.balance += winnings;
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle('🎲 Đặt Cược')
      .setColor(won ? '#1a237e' : '#ff6f00')
      .addFields(
        { name: '💰 Cược', value: `${amount} V`, inline: true },
        { name: '🎯 Kết quả', value: won ? 'Thắng!' : 'Thua!', inline: true },
        { name: '💵 Thắng được', value: `${winnings} V`, inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v profile [@user] - Xem profile đầy đủ
export const prefixProfile: PrefixCommand = {
  name: 'profile',
  description: 'Xem profile đầy đủ của user',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const store = getStore();
    const user = store.getUser(target.id);
    const userGuild = store.getUserGuild(target.id);
    
    // Tính thời gian còn lại cho hatchery
    let hatcheryStatus = 'Không có trứng đang ấp';
    if (user.hatchery.plantedEgg.type) {
      const now = Date.now();
      if (now < user.hatchery.plantedEgg.harvestAt!) {
        const remainingMs = user.hatchery.plantedEgg.harvestAt! - now;
        hatcheryStatus = `🥚 Đang ấp ${user.hatchery.plantedEgg.type} (còn ${Math.ceil(remainingMs / 60000)} phút)`;
      } else {
        hatcheryStatus = `🐉 ${user.hatchery.plantedEgg.type} đã nở, có thể thu thập!`;
      }
    }
    
    // Tính XP cần để level up
    const nextLevel = user.level + 1;
    const xpNeeded = Math.pow(nextLevel, 2) * 100;
    const xpProgress = user.xp;
    const xpToNext = xpNeeded - xpProgress;
    
    const embed = new EmbedBuilder()
      .setTitle(`👤 Profile: ${target.displayName || target.username}`)
      .setColor('#1a237e')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '💰 Số dư', value: `${user.balance.toLocaleString()} V`, inline: true },
        { name: '🎯 Level', value: `${user.level}`, inline: true },
        { name: '⭐ XP', value: `${user.xp} (cần ${xpToNext} để lên level ${nextLevel})`, inline: true },
        { name: '🥚 Trại Level', value: `${user.hatchery.level}`, inline: true },
        { name: '🐉 Trạng thái Trại', value: hatcheryStatus, inline: false },
        { name: '⚔️ Vũ khí', value: user.equippedItems.weapon || 'Không có', inline: true },
        { name: '🔮 Phù chú', value: user.equippedItems.phuChu || 'Không có', inline: true },
        { name: '💊 Linh đan', value: user.equippedItems.linhDan || 'Không có', inline: true }
      )
      .setTimestamp();
    
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      embed.addFields({ 
        name: '🏰 Guild & Buffs', 
        value: `Guild: ${userGuild.name}\n🏆 Guild Hạng ${userGuild.guildRank.level}\n• Thu nhập: +${buffs.incomeBonus}%\n• Cooldown: -${buffs.cooldownReduction}%\n• XP: +${buffs.xpBonus}%`, 
        inline: false 
      });
    }
    
    await message.reply({ embeds: [embed] });
  }
};

// v inventory / v inv - Xem túi đồ phân loại
export const prefixInventory: PrefixCommand = {
  name: 'inventory',
  description: 'Xem túi đồ phân loại theo category',
  async execute(message) {
    const store = getStore();
    const user = store.getUser(message.author.id);
    const inv = user.categorizedInventory;
    
    const formatItems = (items: Record<string, number>, emoji: string) => {
      const entries = Object.entries(items);
      if (entries.length === 0) return `${emoji} Trống`;
      return entries.map(([item, qty]) => `${emoji} ${item}: ${qty}`).join('\n');
    };
    
    const embed = new EmbedBuilder()
      .setTitle('🎒 Túi Đồ')
      .setColor('#8B4513')
      .addFields(
        { name: '🥚 Trứng thần', value: formatItems(inv.eggs, '🥚'), inline: true },
        { name: '🐉 Thần thú', value: formatItems(inv.pets, '🐉'), inline: true },
        { name: '⚔️ Vũ khí', value: formatItems(inv.weapons, '⚔️'), inline: true },
        { name: '👻 Linh hồn', value: formatItems(inv.monsterItems, '👻'), inline: true },
        { name: '🔮 Phù chú', value: formatItems(inv.dungeonGear, '🔮'), inline: true },
        { name: '💎 Đồ ải', value: formatItems(inv.dungeonLoot, '💎'), inline: true },
        { name: '📦 Khác', value: formatItems(inv.misc, '📦'), inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// Alias cho inventory
export const prefixInv: PrefixCommand = {
  name: 'inv',
  description: 'Xem túi đồ (alias của inventory)',
  async execute(message) {
    await prefixInventory.execute(message, []);
  }
};

export const prefixes: PrefixCommand[] = [prefixWork, prefixWeekly, prefixBet, prefixProfile, prefixInventory, prefixInv];
