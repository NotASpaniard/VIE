import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as ui from '../lib/ui.js';

const CAT_META: Record<string, { title: string; emoji: string }> = {
  eggs: { title: 'Trứng Thần', emoji: '🥚' },
  weapons: { title: 'Binh Khí', emoji: '⚔️' },
  dungeon_gear: { title: 'Phù Chú & Linh Đan', emoji: '🔮' },
  roles: { title: 'Chức Nghiệp', emoji: '🎭' }
};

function loadShop() {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'data/shop_config.json'), 'utf8'));
}

// Danh mục shop dùng chung cho cả slash lẫn prefix (luôn hiển thị item_id để mua)
function categoryEmbed(catKey: string): EmbedBuilder | null {
  const items = loadShop()[catKey];
  if (!items) return null;
  const meta = CAT_META[catKey] || { title: catKey, emoji: '🛒' };
  const body = Object.entries(items).map(([id, c]: [string, any]) => {
    const price = c.price === 0 ? '🔒 Chỉ rớt từ ải' : `💰 ${c.price.toLocaleString('vi-VN')} V`;
    return `${meta.emoji} **${c.name}** · \`${id}\`\n${price} · cần Lv ${c.levelRequired}\n${ui.E.dot} ${c.description}`;
  }).join('\n\n');
  const footer = catKey === 'eggs'
    ? 'VIE · Giá hiển thị là giá gốc — tăng dần mỗi lần mua! Đủ 12 → v zodiac để hợp thể'
    : 'VIE · v buy <item_id> [số lượng]';
  return ui.brand(`${meta.emoji} Cửa Hàng ${meta.title}`, body).setFooter({ text: footer });
}

function shopHomeEmbed(): EmbedBuilder {
  return ui.brand('🏯 Cửa Hàng VIE', 'Chọn một quầy để xem chi tiết:').addFields(
    { name: '🥚 Trứng Thần', value: '`v shop eggs`', inline: true },
    { name: '⚔️ Binh Khí', value: '`v shop weapons`', inline: true },
    { name: '🔮 Phù Chú', value: '`v shop dungeon`', inline: true },
    { name: '🎭 Chức Nghiệp', value: '`v shop roles`', inline: true },
    { name: '💰 Giao dịch', value: '`v buy <id> [sl]` · `v sell <id> [sl]`', inline: false }
  );
}

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
      const choice = interaction.options.getString('category');
      const catKey = choice === 'dungeon' ? 'dungeon_gear' : choice;
      if (catKey) {
        const embed = categoryEmbed(catKey);
        if (!embed) { await interaction.reply({ embeds: [ui.err('Loại cửa hàng không tồn tại.')], ephemeral: true }); return; }
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [shopHomeEmbed()] });
      }
    } catch (error) {
      console.error('Error in slashShop:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [ui.err('Có lỗi xảy ra khi xem cửa hàng.')], ephemeral: true });
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
      const isEgg = category === 'eggs';
      const qty = isEgg ? 1 : quantity;
      const unitPrice = isEgg ? store.getEggPrice(interaction.user.id, price) : price;
      const totalCost = unitPrice * qty;

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
      
      // Role: gán role Discord theo tên + chống mua lại
      if (category === 'roles') {
        if (quantity > 1) {
          await interaction.reply({ content: 'Chỉ có thể mua 1 role.', ephemeral: true });
          return;
        }
        if (store.getItemQuantity(interaction.user.id, 'misc', `role_${itemId}`) > 0) {
          await interaction.reply({ content: 'Bạn đã sở hữu role này rồi.', ephemeral: true });
          return;
        }
        user.balance -= totalCost;
        store.addItemToInventory(interaction.user.id, 'misc', `role_${itemId}`, 1);
        store.save();
        let note = '';
        try {
          const guildRole = interaction.guild?.roles.cache.find((r) => r.name === name);
          if (guildRole) { const m = await interaction.guild!.members.fetch(interaction.user.id); await m.roles.add(guildRole); note = ` ✅ Đã gán <@&${guildRole.id}>.`; }
          else note = ` ⚠️ Server chưa có role tên "${name}". Nhờ admin tạo.`;
        } catch { note = ' ⚠️ Bot thiếu quyền gán role.'; }
        await interaction.reply({ content: `🎭 Đã mua role **${name}**! -${totalCost.toLocaleString('vi-VN')} V${note}` });
        return;
      }

      // Map key shop_config -> key categorizedInventory (dungeon_gear -> dungeonGear).
      // Thêm item TRƯỚC rồi mới trừ tiền, tránh trừ tiền xong crash do sai category => mất V không nhận đồ.
      const invCategory = category === 'dungeon_gear' ? 'dungeonGear' : category;
      store.addItemToInventory(interaction.user.id, invCategory as any, itemId, qty);
      user.balance -= totalCost;
      if (isEgg) store.recordEggBuy(interaction.user.id);
      store.save();

      const embed = new EmbedBuilder()
        .setTitle('🛒 Mua thành công!')
        .setColor(0xe8590c)
        .addFields(
          { name: 'Item', value: `${name}`, inline: true },
          { name: 'Số lượng', value: `${qty}`, inline: true },
          { name: 'Tổng chi phí', value: `${totalCost.toLocaleString('vi-VN')} V`, inline: true },
          { name: 'Số dư còn lại', value: `${user.balance.toLocaleString('vi-VN')} V`, inline: false }
        )
        .setTimestamp();
      if (isEgg) embed.addFields({ name: '🥚 Con giáp', value: `${store.countZodiacOwned(interaction.user.id)}/12 · dùng /zodiac để hợp thể`, inline: false });

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
      
      // Map key shop_config -> key categorizedInventory (dungeon_gear -> dungeonGear), tránh crash.
      const invCategory = category === 'dungeon_gear' ? 'dungeonGear' : category;

      // Check if user has enough items
      const currentQuantity = store.getItemQuantity(interaction.user.id, invCategory as any, itemId);
      if (currentQuantity < quantity) {
        await interaction.reply({ content: `Không đủ item. Hiện có ${currentQuantity}, cần ${quantity}.`, ephemeral: true });
        return;
      }

      // Sell item
      store.removeItemFromInventory(interaction.user.id, invCategory as any, itemId, quantity);
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
      await message.reply({ embeds: [shopHomeEmbed()] });
    }
  }
};

async function showEggsShop(message: any) { await message.reply({ embeds: [categoryEmbed('eggs')!] }); }
async function showWeaponsShop(message: any) { await message.reply({ embeds: [categoryEmbed('weapons')!] }); }
async function showDungeonShop(message: any) { await message.reply({ embeds: [categoryEmbed('dungeon_gear')!] }); }

// Show roles shop
async function showRolesShop(message: any) { await message.reply({ embeds: [categoryEmbed('roles')!] }); }

// v buy <item_id> [số lượng] - Mua item
export const prefixBuy: PrefixCommand = {
  name: 'buy',
  description: 'Mua item từ cửa hàng',
  async execute(message, args) {
    const itemId = args[0];
    const quantity = Math.floor(Number(args[1])) || 1;

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
    
    // Trứng con giáp: mỗi lần mua 1, giá lũy tiến theo số lần đã mua
    const isEgg = category === 'eggs';
    const qty = isEgg ? 1 : quantity;
    const unitPrice = isEgg ? store.getEggPrice(message.author.id, itemConfig.price) : itemConfig.price;
    const totalCost = unitPrice * qty;
    if (user.balance < totalCost) {
      await message.reply(`Không đủ tiền. Cần ${totalCost.toLocaleString('vi-VN')} V, bạn có ${user.balance.toLocaleString('vi-VN')} V.`);
      return;
    }

    // Xử lý mua role đặc biệt
    if (category === 'roles') {
      if (quantity > 1) {
        await message.reply('Chỉ có thể mua 1 role.');
        return;
      }
      if (store.getItemQuantity(message.author.id, 'misc', `role_${itemId}`) > 0) {
        await message.reply('Bạn đã sở hữu role này rồi.');
        return;
      }

      user.balance -= totalCost;
      store.addItemToInventory(message.author.id, 'misc', `role_${itemId}`, 1);
      store.save();

      // Thử gán role Discord theo tên
      let note = '';
      try {
        const guildRole = message.guild?.roles.cache.find((r) => r.name === itemConfig.name);
        if (guildRole) { await message.member?.roles.add(guildRole); note = `\n✅ Đã gán role <@&${guildRole.id}>.`; }
        else note = `\n⚠️ Server chưa có role tên **${itemConfig.name}**. Nhờ admin tạo role này.`;
      } catch { note = `\n⚠️ Bot thiếu quyền gán role (cần Manage Roles + role bot cao hơn role này).`; }

      const embed = new EmbedBuilder()
        .setTitle('🎭 Mua Role')
        .setColor('#e8590c')
        .setDescription(`Đã mua role **${itemConfig.name}**!\n💰 -${totalCost.toLocaleString('vi-VN')} V${note}`)
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }
    
    // Mua item thường
    user.balance -= totalCost;
    store.addItemToInventory(message.author.id, category as any, itemId, qty);
    if (isEgg) store.recordEggBuy(message.author.id);
    store.save();

    const owned = isEgg ? store.countZodiacOwned(message.author.id) : 0;
    const embed = new EmbedBuilder()
      .setTitle('🛒 Mua Hàng')
      .setColor('#e8590c')
      .setDescription(
        `Đã mua **${itemConfig.name}** x${qty}!\n💰 -${totalCost.toLocaleString('vi-VN')} V` +
        (isEgg ? `\n🥚 Bộ sưu tập con giáp: **${owned}/12** · giá trứng kế tiếp sẽ cao hơn (\`v zodiac\` để hợp thể)` : '')
      )
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
    const quantity = Math.floor(Number(args[1])) || 1;

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

    // Chặn bán item giá 0 (Dép Tổ Ong, trứng dungeon-only) -> nếu không sẽ bị xoá vĩnh viễn nhận 0 V.
    if (itemConfig.price === 0) {
      await message.reply('Item này không thể bán.');
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
