import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

// /guildowner <@user> <tên guild> <role>
export const slash: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guildowner')
    .setDescription('Gán chủ sở hữu guild')
    .addUserOption((o) => o.setName('user').setDescription('Người dùng').setRequired(true))
    .addStringOption((o) => o.setName('name').setDescription('Tên guild').setRequired(true))
    .addStringOption((o) => o.setName('role').setDescription('ID role').setRequired(true)),
  async execute(interaction) {
    // Role kiểm soát: chỉ role id 1409811217048141896 được phép
    const allowRoleId = '1409811217048141896';
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(allowRoleId)) {
      await interaction.reply({ content: 'Bạn không có quyền dùng lệnh này.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('user', true);
    const name = interaction.options.getString('name', true);
    const roleId = interaction.options.getString('role', true);
    const store = getStore();
    store.setGuildOwner(name, user.id, roleId);
    store.save();
    await interaction.reply({ content: `Đã đặt ${user} làm Guild Master '${name}' (role ${roleId}).`, ephemeral: true });
  }
};

// v guild <subcommand>
export const prefixGuild: PrefixCommand = {
  name: 'guild',
  description: 'Quản lý guild: create/add/remove/list/inv/daily/bxh/quest/info/donate',
  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    const store = getStore();
    const myGuild = store.getUserGuild(message.author.id);
    
    if (sub === 'create') {
      // Kiểm tra user chưa thuộc guild nào
      if (myGuild) {
        await message.reply('Bạn đã thuộc một guild rồi. Chỉ có thể tạo guild mới khi rời guild hiện tại.');
        return;
      }
      
      const guildName = args.slice(1).join(' ').trim();
      if (!guildName) {
        await message.reply('Cú pháp: v guild create <tên guild>');
        return;
      }
      
      // Tạo guild mới với user làm chủ
      const newGuild = store.ensureGuild(guildName);
      newGuild.ownerId = message.author.id;
      newGuild.members = [message.author.id];
      store.save();
      
      await message.reply(`Đã tạo guild '${guildName}' thành công! Bạn là Guild Master.`);
      return;
    }
    
    if (sub === 'add') {
      if (!myGuild || myGuild.ownerId !== message.author.id) { 
        await message.reply('Chỉ Guild Master mới dùng được.'); 
        return; 
      }
      
      const target = message.mentions.users.first();
      if (!target) { 
        await message.reply('Cú pháp: v guild add <@user>'); 
        return; 
      }
      
      // Kiểm tra target chưa thuộc guild nào
      const targetGuild = store.getUserGuild(target.id);
      if (targetGuild) {
        await message.reply(`${target} đã thuộc guild khác rồi.`);
        return;
      }
      
      // Kiểm tra slot còn trống
      const buffs = store.getGuildRankBuffs(myGuild.guildRank.level);
      if (myGuild.members.length >= buffs.memberSlots) {
        await message.reply(`Guild đã đầy! Tối đa ${buffs.memberSlots} hội viên (Hạng ${myGuild.guildRank.level}).`);
        return;
      }
      
      store.addGuildMember(myGuild.name, target.id);
      store.save();
      await message.reply(`Đã thêm ${target} vào guild ${myGuild.name}.`);
      return;
    }
    
    if (sub === 'remove') {
      if (!myGuild || myGuild.ownerId !== message.author.id) { 
        await message.reply('Chỉ Guild Master mới dùng được.'); 
        return; 
      }
      const target = message.mentions.users.first();
      if (!target) { 
        await message.reply('Cú pháp: v guild remove <@user>'); 
        return; 
      }
      store.removeGuildMember(myGuild.name, target.id);
      store.save();
      await message.reply(`Đã xóa ${target} khỏi guild ${myGuild.name}.`);
      return;
    }
    
    if (sub === 'list') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      const lines = myGuild.members.map((m) => `<@${m}>`).join(', ');
      await message.reply(`Hội viên guild ${myGuild.name}: ${lines || 'Trống'}`);
      return;
    }
    
    if (sub === 'inv') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      const lines = Object.entries(myGuild.inventory).map(([k, v]) => `${k}: ${v}`).join('\n');
      await message.reply(lines || 'Kho guild trống.');
      return;
    }
    
    if (sub === 'daily') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      const res = store.markGuildDaily(myGuild.name, message.author.id);
      // Nếu tất cả các thành viên đã điểm danh: thưởng 300 V cho tất cả
      if (res.completedAll) {
        for (const uid of myGuild.members) {
          store.getUser(uid).balance += 300;
        }
        store.save();
        await message.reply(`Toàn bộ hội viên đã điểm danh! Mỗi người nhận 300 V.`);
      } else {
        await message.reply(res.message);
      }
      return;
    }
    
    if (sub === 'bxh') {
      // BXH: theo hạng guild → tổng quỹ → số hội viên
      const guilds = Object.values((getStore() as any)['db'].guilds) as any[];
      const score = guilds.map((g) => ({
        name: g.name,
        level: g.guildRank.level,
        funds: g.guildRank.funds,
        members: g.members.length
      }));
      score.sort((a, b) => b.level - a.level || b.funds - a.funds || b.members - a.members);
      const lines = score.slice(0, 10).map((g, i) => 
        `${i + 1}. ${g.name} — Hạng ${g.level} — Quỹ: ${g.funds.toLocaleString()} V — ${g.members} hội viên`
      );
      await message.reply(lines.join('\n') || 'Chưa có guild nào.');
      return;
    }
    
    if (sub === 'quest') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      const quests = store.getGuildQuests(myGuild.name);
      const lines = quests.map((q, i) => `Nhiệm vụ ${i + 1}: ${q.desc} — Thưởng ${q.reward} V — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
      await message.reply(lines.join('\n'));
      return;
    }
    
    if (sub === 'info') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      
      const buffs = store.getGuildRankBuffs(myGuild.guildRank.level);
      const nextLevelCost = store.getGuildRankUpgradeCost(myGuild.guildRank.level + 1);
      const progress = myGuild.guildRank.funds;
      const progressPercent = nextLevelCost > 0 ? Math.round((progress / nextLevelCost) * 100) : 100;
      
      const embed = new EmbedBuilder()
        .setTitle(`🏯 Guild: ${myGuild.name}`)
        .setColor('#1a237e')
        .addFields(
          { name: '👑 Guild Master', value: `<@${myGuild.ownerId}>`, inline: true },
          { name: '🏆 Guild Hạng', value: `${myGuild.guildRank.level}/5`, inline: true },
          { name: '👥 Hội viên', value: `${myGuild.members.length}/${buffs.memberSlots}`, inline: true },
          { name: '💰 Quỹ hiện tại', value: `${myGuild.guildRank.funds.toLocaleString()} V`, inline: true },
          { name: '📈 Tiến độ nâng hạng', value: `${progressPercent}% (${progress.toLocaleString()}/${nextLevelCost.toLocaleString()})`, inline: true },
          { name: '🎯 Buff hiện tại', value: [
            `• Phúc Lộc: +${buffs.incomeBonus}%`,
            `• Tốc Hành: -${buffs.cooldownReduction}%`,
            `• Tu Luyện: +${buffs.xpBonus}%`
          ].join('\n'), inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      return;
    }
    
    if (sub === 'donate') {
      if (!myGuild) { 
        await message.reply('Bạn chưa thuộc guild nào.'); 
        return; 
      }
      
      const amount = Number(args[1]);
      if (!Number.isFinite(amount) || amount <= 0) {
        await message.reply('Cú pháp: v guild donate <số tiền>');
        return;
      }
      
      const result = store.contributeToGuild(myGuild.name, message.author.id, amount);
      if (!result.success) {
        await message.reply(result.message);
        return;
      }
      
      let reply = result.message;
      if (result.upgraded) {
        const newLevel = myGuild.guildRank.level;
        const newBuffs = store.getGuildRankBuffs(newLevel);
        reply += `\n\n🎉 **GUILD ĐÃ NÂNG HẠNG LÊN HẠNG ${newLevel}!** 🎉\n`;
        reply += `• Slot hội viên: ${newBuffs.memberSlots}\n`;
        reply += `• Buff Phúc Lộc: +${newBuffs.incomeBonus}%\n`;
        reply += `• Buff Tốc Hành: -${newBuffs.cooldownReduction}%\n`;
        reply += `• Buff Tu Luyện: +${newBuffs.xpBonus}%`;
      }
      
      await message.reply(reply);
      return;
    }
    
    await message.reply('Các lệnh: v guild create/add/remove/list/inv/daily/bxh/quest/info/donate');
  }
};

// ===================== SLASH COMMANDS =====================

// /guild create - Tạo guild
export const slashGuildCreate: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_create')
    .setDescription('Tạo guild mới')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Tên guild')
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildName = interaction.options.getString('name', true);
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    // Kiểm tra user chưa thuộc guild nào
    if (myGuild) {
      await interaction.reply({ content: 'Bạn đã thuộc một guild rồi. Chỉ có thể tạo guild mới khi rời guild hiện tại.', ephemeral: true });
      return;
    }
    
    // Tạo guild mới với user làm chủ
    const newGuild = store.ensureGuild(guildName);
    newGuild.ownerId = interaction.user.id;
    newGuild.members = [interaction.user.id];
    store.save();
    
    await interaction.reply(`Đã tạo guild '${guildName}' thành công! Bạn là Guild Master.`);
  }
};

// /guild add - Thêm thành viên
export const slashGuildAdd: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_add')
    .setDescription('Thêm thành viên vào guild')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người dùng muốn thêm')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild || myGuild.ownerId !== interaction.user.id) { 
      await interaction.reply({ content: 'Chỉ Guild Master mới dùng được.', ephemeral: true }); 
      return; 
    }
    
    // Kiểm tra target chưa thuộc guild nào
    const targetGuild = store.getUserGuild(target.id);
    if (targetGuild) {
      await interaction.reply({ content: `${target} đã thuộc guild khác rồi.`, ephemeral: true });
      return;
    }
    
    // Kiểm tra slot còn trống
    const buffs = store.getGuildRankBuffs(myGuild.guildRank.level);
    if (myGuild.members.length >= buffs.memberSlots) {
      await interaction.reply({ content: `Guild đã đầy! Tối đa ${buffs.memberSlots} hội viên (Hạng ${myGuild.guildRank.level}).`, ephemeral: true });
      return;
    }
    
    store.addGuildMember(myGuild.name, target.id);
    store.save();
    await interaction.reply(`Đã thêm ${target} vào guild ${myGuild.name}.`);
  }
};

// /guild remove - Xóa thành viên
export const slashGuildRemove: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_remove')
    .setDescription('Xóa thành viên khỏi guild')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người dùng muốn xóa')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild || myGuild.ownerId !== interaction.user.id) { 
      await interaction.reply({ content: 'Chỉ Guild Master mới dùng được.', ephemeral: true }); 
      return; 
    }
    
    store.removeGuildMember(myGuild.name, target.id);
    store.save();
    await interaction.reply(`Đã xóa ${target} khỏi guild ${myGuild.name}.`);
  }
};

// /guild list - Danh sách thành viên
export const slashGuildList: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_list')
    .setDescription('Danh sách thành viên guild'),
  async execute(interaction) {
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const lines = myGuild.members.map((m) => `<@${m}>`).join(', ');
    await interaction.reply(`Hội viên guild ${myGuild.name}: ${lines || 'Trống'}`);
  }
};

// /guild daily - Thưởng guild hàng ngày
export const slashGuildDaily: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_daily')
    .setDescription('Điểm danh guild hàng ngày'),
  async execute(interaction) {
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const res = store.markGuildDaily(myGuild.name, interaction.user.id);
    // Nếu tất cả các thành viên đã điểm danh: thưởng 300 V cho tất cả
    if (res.completedAll) {
      for (const uid of myGuild.members) {
        store.getUser(uid).balance += 300;
      }
      store.save();
      await interaction.reply(`Toàn bộ hội viên đã điểm danh! Mỗi người nhận 300 V.`);
    } else {
      await interaction.reply(res.message);
    }
  }
};

// /guild bxh - BXH guild
export const slashGuildBxh: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_bxh')
    .setDescription('Bảng xếp hạng guild'),
  async execute(interaction) {
    const store = getStore();
    // BXH: theo hạng guild → tổng quỹ → số hội viên
    const guilds = Object.values((store as any)['db'].guilds) as any[];
    const score = guilds.map((g) => ({
      name: g.name,
      level: g.guildRank.level,
      funds: g.guildRank.funds,
      members: g.members.length
    }));
    score.sort((a, b) => b.level - a.level || b.funds - a.funds || b.members - a.members);
    const lines = score.slice(0, 10).map((g, i) => 
      `${i + 1}. ${g.name} — Hạng ${g.level} — Quỹ: ${g.funds.toLocaleString()} V — ${g.members} hội viên`
    );
    await interaction.reply(lines.join('\n') || 'Chưa có guild nào.');
  }
};

// /guild inv - Kho guild
export const slashGuildInv: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_inv')
    .setDescription('Xem kho guild'),
  async execute(interaction) {
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const lines = Object.entries(myGuild.inventory).map(([k, v]) => `${k}: ${v}`).join('\n');
    await interaction.reply(lines || 'Kho guild trống.');
  }
};

// /guild quest - Nhiệm vụ guild
export const slashGuildQuest: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_quest')
    .setDescription('Xem nhiệm vụ guild'),
  async execute(interaction) {
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const quests = store.getGuildQuests(myGuild.name);
    const lines = quests.map((q, i) => `Nhiệm vụ ${i + 1}: ${q.desc} — Thưởng ${q.reward} V — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
    await interaction.reply(lines.join('\n'));
  }
};

// /guild info - Thông tin guild
export const slashGuildInfo: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_info')
    .setDescription('Thông tin guild'),
  async execute(interaction) {
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const buffs = store.getGuildRankBuffs(myGuild.guildRank.level);
    const nextLevelCost = store.getGuildRankUpgradeCost(myGuild.guildRank.level + 1);
    const progress = myGuild.guildRank.funds;
    const progressPercent = nextLevelCost > 0 ? Math.round((progress / nextLevelCost) * 100) : 100;
    
    const embed = new EmbedBuilder()
      .setTitle(`🏯 Guild: ${myGuild.name}`)
      .setColor('#1a237e')
      .addFields(
        { name: '👑 Guild Master', value: `<@${myGuild.ownerId}>`, inline: true },
        { name: '🏆 Guild Hạng', value: `${myGuild.guildRank.level}/5`, inline: true },
        { name: '👥 Hội viên', value: `${myGuild.members.length}/${buffs.memberSlots}`, inline: true },
        { name: '💰 Quỹ hiện tại', value: `${myGuild.guildRank.funds.toLocaleString()} V`, inline: true },
        { name: '📈 Tiến độ nâng hạng', value: `${progressPercent}% (${progress.toLocaleString()}/${nextLevelCost.toLocaleString()})`, inline: true },
        { name: '🎯 Buff hiện tại', value: [
          `• Phúc Lộc: +${buffs.incomeBonus}%`,
          `• Tốc Hành: -${buffs.cooldownReduction}%`,
          `• Tu Luyện: +${buffs.xpBonus}%`
        ].join('\n'), inline: false }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

// /guild donate - Đóng góp nâng cấp
export const slashGuildDonate: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('guild_donate')
    .setDescription('Đóng góp tiền nâng cấp guild')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số tiền đóng góp')
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const store = getStore();
    const myGuild = store.getUserGuild(interaction.user.id);
    
    if (!myGuild) { 
      await interaction.reply({ content: 'Bạn chưa thuộc guild nào.', ephemeral: true }); 
      return; 
    }
    
    const result = store.contributeToGuild(myGuild.name, interaction.user.id, amount);
    if (!result.success) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }
    
    let reply = result.message;
    if (result.upgraded) {
      reply += `\n🎉 Guild đã nâng cấp lên hạng ${myGuild.guildRank.level}!`;
    }
    
    await interaction.reply(reply);
  }
};

export const slashes: SlashCommand[] = [slashGuildCreate, slashGuildAdd, slashGuildRemove, slashGuildList, slashGuildDaily, slashGuildBxh, slashGuildInv, slashGuildQuest, slashGuildInfo, slashGuildDonate];

export const prefixes: PrefixCommand[] = [prefixGuild];
