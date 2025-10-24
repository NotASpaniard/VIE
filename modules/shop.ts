import { EmbedBuilder } from 'discord.js';
import type { PrefixCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// v shop - Xem tất cả shop categories
export const prefixShop: PrefixCommand = {
  name: 'shop',
  description: 'Xem tất cả cửa hàng',
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    
    if (subcommand === 'eggs') {
      await showEggsShop(message);
    } else if (subcommand === 'weapons') {
      await showWeaponsShop(message);
    } else if (subcommand === 'dungeon') {
      await showDungeonShop(message);
    } else if (subcommand === 'roles') {
      await showRolesShop(message);
    } else {
      // Default: show all shops
      const embed = new EmbedBuilder()
        .setTitle('🏯 Cửa Hàng VIE')
        .setColor('#1a237e')
        .setDescription('Chọn loại cửa hàng bạn muốn xem:')
        .addFields(
          { name: '🥚 Trứng Thần', value: '`v shop eggs` - Mua trứng thần thú', inline: false },
          { name: '⚔️ Binh Khí', value: '`v shop weapons` - Mua vũ khí săn quái', inline: false },
          { name: '🔮 Phù Chú', value: '`v shop dungeon` - Mua phù chú và linh đan', inline: false },
          { name: '🎭 Chức Nghiệp', value: '`v shop roles` - Mua role đặc biệt', inline: false },
          { name: '💰 Mua/Bán', value: '`v buy <item_id> [số lượng]` - Mua item\n`v sell <item_id> [số lượng]` - Bán item', inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    }
  }
};

// Show eggs shop
async function showEggsShop(message: any) {
  const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
  const eggs = shopConfig.eggs;
  
  const items = Object.entries(eggs).map(([id, config]: [string, any]) => 
    `**${config.name}** (${id})\n💰 ${config.price} V | Level ${config.levelRequired}\n${config.description}`
  ).join('\n\n');
  
  const embed = new EmbedBuilder()
    .setTitle('🥚 Cửa Hàng Trứng Thần')
    .setColor('#1a237e')
    .setDescription(items)
    .setFooter({ text: 'Dùng: v buy <item_id> [số lượng] để mua' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Show weapons shop
async function showWeaponsShop(message: any) {
  const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
  const weapons = shopConfig.weapons;
  
  const items = Object.entries(weapons).map(([id, config]: [string, any]) => {
    const priceText = config.price === 0 ? '🏆 KHÔNG BÁN' : `💰 ${config.price} V`;
    return `**${config.name}** (${id})\n${priceText} | Level ${config.levelRequired}\n${config.description}`;
  }).join('\n\n');
  
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Cửa Hàng Binh Khí')
    .setColor('#1a237e')
    .setDescription(items)
    .setFooter({ text: 'Dùng: v buy <item_id> [số lượng] để mua' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Show dungeon shop
async function showDungeonShop(message: any) {
  const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
  const dungeonGear = shopConfig.dungeon_gear;
  
  const items = Object.entries(dungeonGear).map(([id, config]: [string, any]) => 
    `**${config.name}** (${id})\n💰 ${config.price} V | Level ${config.levelRequired}\n${config.description}`
  ).join('\n\n');
  
  const embed = new EmbedBuilder()
    .setTitle('🔮 Cửa Hàng Phù Chú')
    .setColor('#1a237e')
    .setDescription(items)
    .setFooter({ text: 'Dùng: v buy <item_id> [số lượng] để mua' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Show roles shop
async function showRolesShop(message: any) {
  const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
  const roles = shopConfig.roles;
  
  const items = Object.entries(roles).map(([id, config]: [string, any]) => 
    `**${config.name}** (${id})\n💰 ${config.price} V | Level ${config.levelRequired}\n${config.description}`
  ).join('\n\n');
  
  const embed = new EmbedBuilder()
    .setTitle('🎭 Cửa Hàng Chức Nghiệp')
    .setColor('#1a237e')
    .setDescription(items)
    .setFooter({ text: 'Dùng: v buy <item_id> để mua role' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// v buy <item_id> [số lượng] - Mua item
export const prefixBuy: PrefixCommand = {
  name: 'buy',
  description: 'Mua item từ cửa hàng',
  async execute(message, args) {
    const itemId = args[0];
    const quantity = Number(args[1]) || 1;
    
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
      await message.reply('Cú pháp: v buy <item_id> [số lượng]');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
    
    // Tìm item trong tất cả categories
    let itemConfig = null;
    let category = '';
    
    for (const [cat, items] of Object.entries(shopConfig)) {
      if (cat === 'eggs' || cat === 'weapons' || cat === 'dungeon_gear' || cat === 'roles') {
        const itemsData = items as any;
        if (itemsData[itemId]) {
          itemConfig = itemsData[itemId];
          category = cat === 'dungeon_gear' ? 'dungeonGear' : cat;
          break;
        }
      }
    }
    
    if (!itemConfig) {
      await message.reply('Item không tồn tại trong cửa hàng.');
      return;
    }
    
    // Kiểm tra level requirement
    if (user.level < itemConfig.levelRequired) {
      await message.reply(`Cần level ${itemConfig.levelRequired} để mua item này.`);
      return;
    }
    
    // Kiểm tra đủ tiền
    const totalCost = itemConfig.price * quantity;
    if (user.balance < totalCost) {
      await message.reply(`Không đủ tiền. Cần ${totalCost} V, bạn có ${user.balance} V.`);
      return;
    }
    
    // Xử lý mua role đặc biệt
    if (category === 'roles') {
      if (quantity > 1) {
        await message.reply('Chỉ có thể mua 1 role.');
        return;
      }
      
      // Gán role cho user (cần implement role assignment)
      user.balance -= totalCost;
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🎭 Mua Role')
        .setColor('#1a237e')
        .setDescription(`Đã mua role **${itemConfig.name}** thành công!\n💰 -${totalCost} V`)
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      return;
    }
    
    // Mua item thường
    user.balance -= totalCost;
    store.addItemToInventory(message.author.id, category as any, itemId, quantity);
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle('🛒 Mua Hàng')
      .setColor('#1a237e')
      .setDescription(`Đã mua **${itemConfig.name}** x${quantity} thành công!\n💰 -${totalCost} V`)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// v sell <item_id> [số lượng] - Bán item
export const prefixSell: PrefixCommand = {
  name: 'sell',
  description: 'Bán item (70% giá mua)',
  async execute(message, args) {
    const itemId = args[0];
    const quantity = Number(args[1]) || 1;
    
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
      await message.reply('Cú pháp: v sell <item_id> [số lượng]');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
    
    // Tìm item trong tất cả categories
    let itemConfig = null;
    let category = '';
    
    for (const [cat, items] of Object.entries(shopConfig)) {
      if (cat === 'eggs' || cat === 'weapons' || cat === 'dungeon_gear') {
        const itemsData = items as any;
        if (itemsData[itemId]) {
          itemConfig = itemsData[itemId];
          category = cat === 'dungeon_gear' ? 'dungeonGear' : cat;
          break;
        }
      }
    }
    
    if (!itemConfig) {
      await message.reply('Item không thể bán.');
      return;
    }
    
    // Kiểm tra có đủ item không
    const currentQuantity = store.getItemQuantity(message.author.id, category as any, itemId);
    if (currentQuantity < quantity) {
      await message.reply(`Không đủ ${itemConfig.name}. Bạn có ${currentQuantity}, cần ${quantity}.`);
      return;
    }
    
    // Tính giá bán (70% giá mua)
    const sellPrice = Math.floor(itemConfig.price * 0.7);
    const totalEarned = sellPrice * quantity;
    
    // Bán item
    store.removeItemFromInventory(message.author.id, category as any, itemId, quantity);
    user.balance += totalEarned;
    store.save();
    
    const embed = new EmbedBuilder()
      .setTitle('💰 Bán Hàng')
      .setColor('#1a237e')
      .setDescription(`Đã bán **${itemConfig.name}** x${quantity} thành công!\n💰 +${totalEarned} V (70% giá mua)`)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

export const prefixes: PrefixCommand[] = [prefixShop, prefixBuy, prefixSell];
