import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// v shop - Xem tất cả shop categories

// /shop - Slash command handler
export const slashShop: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Xem cửa hàng')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Loại cửa hàng')
        .setRequired(false)
        .addChoices(
          { name: 'Trứng', value: 'eggs' },
          { name: 'Vũ khí', value: 'weapons' },
          { name: 'Phù chú', value: 'dungeon' },
          { name: 'Vai trò', value: 'roles' }
        )),
  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');
      const store = getStore();
      const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
      
      if (category) {
        // Show specific category
        const items = shopConfig[category];
        if (!items) {
          await interaction.reply({ content: 'Loại cửa hàng không tồn tại.', ephemeral: true });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setTitle(`🛒 Cửa hàng ${category}`)
          .setColor('#1a237e')
          .setDescription(`Danh sách ${category} có sẵn:`);
        
        for (const [itemId, item] of Object.entries(items)) {
          const price = (item as any).price;
          const name = (item as any).name;
          const description = (item as any).description;
          const levelRequired = (item as any).levelRequired;
          
          embed.addFields({
            name: `${name} ${price === 0 ? '🏆 KHÔNG BÁN' : `${price} V`}`,
            value: `${description}\nLevel: ${levelRequired}`,
            inline: true
          });
        }
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Show all categories
        const embed = new EmbedBuilder()
          .setTitle('🛒 Cửa hàng VIE')
          .setColor('#1a237e')
          .setDescription('Chọn loại cửa hàng:')
          .addFields(
            { name: '🥚 Trứng', value: 'Trứng thần thoại để ấp', inline: true },
            { name: '⚔️ Vũ khí', value: 'Binh khí săn quái', inline: true },
            { name: '🔮 Phù chú', value: 'Bùa phép đi ải', inline: true },
            { name: '👑 Vai trò', value: 'Chức nghiệp đặc biệt', inline: true }
          )
          .setFooter({ text: 'Sử dụng /shop <category> để xem chi tiết' });
        
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in slashShop:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi xem cửa hàng.', ephemeral: true });
      }
    }
  }
};


// /buy - Slash command handler
export const slashBuy: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Mua item từ cửa hàng')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('ID của item muốn mua')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Số lượng (mặc định: 1)')
        .setRequired(false)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const itemId = interaction.options.getString('item_id', true);
      const quantity = interaction.options.getInteger('quantity') || 1;
      const store = getStore();
      const user = store.getUser(interaction.user.id);
      const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
      
      // Find item in shop
      let item = null;
      let category = '';
      for (const [cat, items] of Object.entries(shopConfig)) {
        if ((items as any)[itemId]) {
          item = (items as any)[itemId];
          category = cat;
          break;
        }
      }
      
      if (!item) {
        await interaction.reply({ content: 'Item không tồn tại trong cửa hàng.', ephemeral: true });
        return;
      }
      
      const price = (item as any).price;
      const name = (item as any).name;
      const levelRequired = (item as any).levelRequired;
      const totalCost = price * quantity;
      
      if (price === 0) {
        await interaction.reply({ content: 'Item này không thể mua được.', ephemeral: true });
        return;
      }
      
      if (user.level < levelRequired) {
        await interaction.reply({ content: `Cần level ${levelRequired} để mua item này.`, ephemeral: true });
        return;
      }
      
      if (user.balance < totalCost) {
        await interaction.reply({ content: `Không đủ V. Cần ${totalCost} V, hiện có ${user.balance} V.`, ephemeral: true });
        return;
      }
      
      // Purchase item
      user.balance -= totalCost;
      store.addItemToInventory(interaction.user.id, category as any, itemId, quantity);
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 Mua thành công!')
        .setColor('#4fc3f7')
        .addFields(
          { name: 'Item', value: `${name}`, inline: true },
          { name: 'Số lượng', value: `${quantity}`, inline: true },
          { name: 'Tổng chi phí', value: `${totalCost} V`, inline: true },
          { name: 'Số dư còn lại', value: `${user.balance} V`, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in slashBuy:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi mua item.', ephemeral: true });
      }
    }
  }
};


// /sell - Slash command handler
export const slashSell: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Bán item từ túi đồ')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('ID của item muốn bán')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Số lượng (mặc định: 1)')
        .setRequired(false)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const itemId = interaction.options.getString('item_id', true);
      const quantity = interaction.options.getInteger('quantity') || 1;
      const store = getStore();
      const user = store.getUser(interaction.user.id);
      const shopConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
      
      // Find item in shop to get sell price
      let item = null;
      let category = '';
      for (const [cat, items] of Object.entries(shopConfig)) {
        if ((items as any)[itemId]) {
          item = (items as any)[itemId];
          category = cat;
          break;
        }
      }
      
      if (!item) {
        await interaction.reply({ content: 'Item không tồn tại trong cửa hàng.', ephemeral: true });
        return;
      }
      
      const price = (item as any).price;
      const name = (item as any).name;
      const sellPrice = Math.floor(price * 0.5); // 50% of buy price
      const totalEarned = sellPrice * quantity;
      
      if (price === 0) {
        await interaction.reply({ content: 'Item này không thể bán được.', ephemeral: true });
        return;
      }
      
      // Check if user has enough items
      const currentQuantity = store.getItemQuantity(interaction.user.id, category as any, itemId);
      if (currentQuantity < quantity) {
        await interaction.reply({ content: `Không đủ item. Hiện có ${currentQuantity}, cần ${quantity}.`, ephemeral: true });
        return;
      }
      
      // Sell item
      store.removeItemFromInventory(interaction.user.id, category as any, itemId, quantity);
      user.balance += totalEarned;
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('💰 Bán thành công!')
        .setColor('#4fc3f7')
        .addFields(
          { name: 'Item', value: `${name}`, inline: true },
          { name: 'Số lượng', value: `${quantity}`, inline: true },
          { name: 'Tổng thu được', value: `${totalEarned} V`, inline: true },
          { name: 'Số dư hiện tại', value: `${user.balance} V`, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in slashSell:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi bán item.', ephemeral: true });
      }
    }
  }
};

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
