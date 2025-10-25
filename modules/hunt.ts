import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// v hunt - Săn quái 1 lần

// /hunt - Slash command handler
export const slashHunt: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Săn quái thần thoại (cooldown 2 phút)'),
  async execute(interaction) {
    try {
      const store = getStore();
      const cooldownCheck = store.checkCooldown(interaction.user.id, 'hunt');
      
      if (!cooldownCheck.canUse) {
        await interaction.reply({ content: `⏰ Bạn cần chờ ${cooldownCheck.remainingMinutes} phút nữa mới có thể săn quái.`, ephemeral: true });
        return;
      }
      
      const user = store.getUser(interaction.user.id);
      const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
      
      // Lọc monsters theo level
      const availableMonsters = Object.entries(gameConfig.monsters)
        .filter(([_, config]: [string, any]) => user.level >= config.levelRequired);
      
      if (availableMonsters.length === 0) {
        await interaction.reply({ content: 'Bạn cần level cao hơn để săn quái.', ephemeral: true });
        return;
      }
      
      // Tính tỷ lệ thành công với weapon bonus
      let baseSuccessRate = 0;
      let monsterName = '';
      let monsterEmoji = '';
      let monsterReward = { min: 0, max: 0 };
      let monsterLoot = '';
      
      // Chọn monster ngẫu nhiên
      const [monsterId, monsterConfig] = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
      monsterName = (monsterConfig as any).name;
      monsterEmoji = (monsterConfig as any).emoji;
      monsterReward = (monsterConfig as any).reward;
      monsterLoot = (monsterConfig as any).loot;
      baseSuccessRate = (monsterConfig as any).successRate;
      
      // Weapon bonus
      let weaponBonus = 0;
      if (user.equippedItems.weapon) {
        const weaponId = user.equippedItems.weapon;
        const weaponBonusData = gameConfig.weapon_bonuses[weaponId];
        if (weaponBonusData) {
          weaponBonus = weaponBonusData;
        }
      }
      
      const finalSuccessRate = Math.min(95, baseSuccessRate + weaponBonus);
      const isSuccess = Math.random() * 100 < finalSuccessRate;
      
      if (isSuccess) {
        // Thành công
        const reward = monsterReward.min + Math.floor(Math.random() * (monsterReward.max - monsterReward.min + 1));
        let finalReward = reward;
        
        // Dép Tổ Ong bonus
        if (user.equippedItems.weapon === 'dep_to_ong') {
          finalReward = Math.floor(reward * 1.5);
        }
        
        user.balance += finalReward;
        store.addItemToInventory(interaction.user.id, 'monsterItems', monsterLoot, 1);
        store.setCooldown(interaction.user.id, 'hunt', 2);
        store.addXP(interaction.user.id, 5);
        store.save();
        
        const embed = new EmbedBuilder()
          .setTitle('⚔️ Săn quái thành công!')
          .setColor('#4fc3f7')
          .addFields(
            { name: 'Quái vật', value: `${monsterEmoji} ${monsterName}`, inline: true },
            { name: 'Phần thưởng', value: `${finalReward} V`, inline: true },
            { name: 'Loot', value: `${monsterLoot}`, inline: true }
          )
          .setTimestamp();
        
        if (user.equippedItems.weapon === 'dep_to_ong') {
          embed.addFields({ name: '🏆 Dép Tổ Ong Bonus', value: '+50% V reward', inline: false });
        }
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Thất bại
        store.setCooldown(interaction.user.id, 'hunt', 2);
        store.save();
        
        const embed = new EmbedBuilder()
          .setTitle('💀 Săn quái thất bại!')
          .setColor('#f44336')
          .addFields(
            { name: 'Quái vật', value: `${monsterEmoji} ${monsterName}`, inline: true },
            { name: 'Kết quả', value: 'Quái vật đã trốn thoát!', inline: true },
            { name: 'Tỷ lệ thành công', value: `${finalSuccessRate}%`, inline: true }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in slashHunt:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi săn quái.', ephemeral: true });
      }
    }
  }
};

export const prefixHunt: PrefixCommand = {
  name: 'hunt',
  description: 'Săn quái thần thoại (cooldown 2 phút)',
  async execute(message) {
    const store = getStore();
    const cooldownCheck = store.checkCooldown(message.author.id, 'hunt');
    
    if (!cooldownCheck.canUse) {
      await message.reply(`⏰ Bạn cần chờ ${cooldownCheck.remainingMinutes} phút nữa mới có thể săn quái.`);
      return;
    }
    
    const user = store.getUser(message.author.id);
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    
    // Lọc monsters theo level
    const availableMonsters = Object.entries(gameConfig.monsters)
      .filter(([_, config]: [string, any]) => user.level >= config.levelRequired);
    
    if (availableMonsters.length === 0) {
      await message.reply('Bạn cần level cao hơn để săn quái.');
      return;
    }
    
    // Tính tỷ lệ thành công với weapon bonus
    let baseSuccessRate = 0;
    let monsterName = '';
    let monsterEmoji = '';
    let monsterReward = { min: 0, max: 0 };
    let monsterLoot = '';
    
    // Random monster dựa trên level
    const randomMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    const [monsterKey, monsterConfig] = randomMonster as [string, any];
    baseSuccessRate = monsterConfig.successRate;
    monsterName = monsterConfig.name;
    monsterEmoji = monsterConfig.emoji;
    monsterReward = monsterConfig.reward;
    monsterLoot = monsterConfig.loot;
    
    // Áp dụng weapon bonus
    if (user.equippedItems.weapon) {
      const weaponBonus = gameConfig.weapon_bonuses[user.equippedItems.weapon] || 0;
      baseSuccessRate += weaponBonus;
    }
    
    // Áp dụng lucky charm nếu có
    const hasLuckyCharm = store.getItemQuantity(message.author.id, 'monsterItems', 'lucky_charm') > 0;
    if (hasLuckyCharm) {
      baseSuccessRate += 20; // +20% với lucky charm
      store.removeItemFromInventory(message.author.id, 'monsterItems', 'lucky_charm', 1);
    }
    
    // Thực hiện săn quái
    const success = Math.random() * 100 < baseSuccessRate;
    let reward = 0;
    let lootMessage = '';
    
    if (success) {
      // Random KG từ 1 - 100 KG
      const kg = Math.floor(1 + Math.random() * 100);
      
      // Tính reward
      reward = monsterReward.min + Math.floor(Math.random() * (monsterReward.max - monsterReward.min + 1));
      
      // 🏆 BONUS ĐẶC BIỆT: Dép Tổ Ong tăng 50% V reward
      let finalReward = reward;
      if (user.equippedItems.weapon === 'dep_to_ong') {
        const depBonus = Math.floor(reward * 0.5); // +50% V reward
        finalReward += depBonus;
      }
      
      // Áp dụng guild rank buff
      const userGuild = store.getUserGuild(message.author.id);
      if (userGuild) {
        const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
        const bonus = Math.floor(finalReward * buffs.incomeBonus / 100);
        finalReward += bonus;
      }
      
      user.balance += finalReward;
      
      // Thêm loot vào inventory
      store.addItemToInventory(message.author.id, 'monsterItems', monsterLoot, 1);
      
      let bonusMessage = '';
      if (user.equippedItems.weapon === 'dep_to_ong') {
        bonusMessage = `\n🏆 Dép Tổ Ong bonus: +${Math.floor(reward * 0.5)} V`;
      }
      lootMessage = `\n💰 +${finalReward} V${bonusMessage}\n👻 +1 ${monsterLoot} (${kg} KG)`;
    }
    
    // Set cooldown
    store.setCooldown(message.author.id, 'hunt', 2);
    
    // Cộng XP
    const xpResult = store.addXP(message.author.id, 15);
    store.save();
    
    // Lấy thông tin guild
    const userGuild = store.getUserGuild(message.author.id);
    
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Săn Quái')
      .setColor(success ? '#1a237e' : '#ff6f00')
      .addFields(
        { name: '🎯 Mục tiêu', value: `${monsterEmoji} ${monsterName}`, inline: true },
        { name: '📊 Tỷ lệ thành công', value: `${Math.round(baseSuccessRate)}%`, inline: true },
        { name: '⚔️ Vũ khí', value: user.equippedItems.weapon || 'Không có', inline: true },
        { name: '🎲 Kết quả', value: success ? '✅ Thành công!' : '❌ Thất bại!', inline: false }
      )
      .setTimestamp();
    
    if (success) {
      embed.addFields({ name: '🎁 Phần thưởng', value: lootMessage, inline: false });
    }
    
    if (userGuild) {
      const buffs = store.getGuildRankBuffs(userGuild.guildRank.level);
      embed.addFields({ name: '🏆 Guild Bonus', value: `+${buffs.incomeBonus}% thu nhập`, inline: false });
    }
    
    embed.addFields({ name: '🎯 XP', value: xpResult.message, inline: false });
    
    await message.reply({ embeds: [embed] });
  }
};

// v hunt equip <tên_vũ_khí> - Trang bị vũ khí
export const prefixHuntEquip: PrefixCommand = {
  name: 'hunt_equip',
  description: 'Trang bị vũ khí săn quái',
  async execute(message, args) {
    const weaponName = args[0];
    if (!weaponName) {
      await message.reply('Cú pháp: v hunt equip <tên_vũ_khí>');
      return;
    }
    
    const store = getStore();
    const result = store.equipItem(message.author.id, 'weapon', weaponName);
    
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Trang Bị Vũ Khí')
      .setColor(result.success ? '#00FF00' : '#FF0000')
      .setDescription(result.message)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v hunt inventory / v hunt inv - Xem đồ săn quái
export const prefixHuntInventory: PrefixCommand = {
  name: 'hunt_inventory',
  description: 'Xem đồ săn quái',
  async execute(message) {
    const store = getStore();
    const user = store.getUser(message.author.id);
    const monsterItems = user.categorizedInventory.monsterItems;
    const weapons = user.categorizedInventory.weapons;
    
    const formatItems = (items: Record<string, number>, emoji: string) => {
      const entries = Object.entries(items);
      if (entries.length === 0) return `${emoji} Trống`;
      return entries.map(([item, qty]) => `${emoji} ${item}: ${qty}`).join('\n');
    };
    
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Đồ Săn Quái')
      .setColor('#1a237e')
      .addFields(
        { name: '⚔️ Vũ khí', value: formatItems(weapons, '⚔️'), inline: true },
        { name: '👻 Linh hồn quái', value: formatItems(monsterItems, '👻'), inline: true },
        { name: '🎯 Đang trang bị', value: user.equippedItems.weapon || 'Không có', inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v hunt use <tên_bùa> - Dùng bùa phép
export const prefixHuntUse: PrefixCommand = {
  name: 'hunt_use',
  description: 'Dùng bùa phép tăng tỷ lệ săn quái',
  async execute(message, args) {
    const itemName = args[0];
    if (!itemName) {
      await message.reply('Cú pháp: v hunt use <tên_bùa>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    
    if (itemName === 'lucky_charm') {
      const hasCharm = store.getItemQuantity(message.author.id, 'monsterItems', 'lucky_charm') > 0;
      if (!hasCharm) {
        await message.reply('Bạn không có lucky charm.');
        return;
      }
      
      // Lucky charm sẽ được dùng tự động khi hunt
      await message.reply('🍀 Lucky charm đã được kích hoạt! Sẽ được dùng trong lần săn tiếp theo.');
      return;
    }
    
    await message.reply('Chỉ có thể dùng lucky_charm.');
  }
};

// Main hunt command handler
export const prefixHuntMain: PrefixCommand = {
  name: 'hunt',
  description: 'Săn bắn: hunt/equip/inventory/use',
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    
    if (subcommand === 'equip') {
      await prefixHuntEquip.execute(message, args.slice(1));
    } else if (subcommand === 'inventory' || subcommand === 'inv') {
      await prefixHuntInventory.execute(message, []);
    } else if (subcommand === 'use') {
      await prefixHuntUse.execute(message, args.slice(1));
    } else {
      // Default: hunt
      await prefixHunt.execute(message, []);
    }
  }
};

export const prefixes: PrefixCommand[] = [prefixHuntMain];
