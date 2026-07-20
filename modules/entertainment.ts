import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
  EmbedBuilder, Message, SlashCommandBuilder
} from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import * as ui from '../lib/ui.js';

const store = getStore();
const MIN_BET = 10;
const activeBJ = new Set<string>();

// ============================ BLACKJACK (tương tác) ============================
type Card = { rank: string; suit: string };
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function score(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (['J', 'Q', 'K'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

const handStr = (cards: Card[]) => cards.map((c) => `\`${c.rank}${c.suit}\``).join(' ');
const isBlackjack = (cards: Card[]) => cards.length === 2 && score(cards) === 21;

function bjButtons(disabled: boolean, canDouble: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('bj:hit').setLabel('Rút (Hit)').setEmoji('🃏').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('bj:stand').setLabel('Dừng (Stand)').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('bj:double').setLabel('Nhân đôi (x2)').setEmoji('💰').setStyle(ButtonStyle.Danger).setDisabled(disabled || !canDouble)
  );
}

function bjEmbed(player: Card[], dealer: Card[], bet: number, opts: { hideDealer?: boolean; status?: string; color?: number } = {}): EmbedBuilder {
  const dealerShown = opts.hideDealer
    ? `${handStr([dealer[0]])} \`??\``
    : `${handStr(dealer)}  •  **${score(dealer)}**`;
  return ui.baseEmbed()
    .setColor(opts.color ?? 0x2b2d42)
    .setTitle('🃏 Blackjack')
    .setDescription(opts.status ?? 'Rút thêm hay dừng lại?')
    .addFields(
      { name: '🧑 Bài của bạn', value: `${handStr(player)}  •  **${score(player)}**`, inline: false },
      { name: '🤖 Nhà cái', value: dealerShown, inline: false },
      { name: '💵 Tiền cược', value: ui.fmtV(bet), inline: true }
    );
}

async function settleBlackjack(msg: Message, userId: string, player: Card[], dealer: Card[], bet: number): Promise<void> {
  const user = store.getUser(userId);
  // Nhà cái rút tới >= 17
  const deckLeft = makeDeck(); // dùng bộ mới cho các lá bốc thêm (đơn giản, không đếm bài)
  while (score(dealer) < 17) dealer.push(deckLeft.pop()!);

  const ps = score(player), ds = score(dealer);
  let multiplier: number, status: string, color: number;

  if (ps > 21) { multiplier = 0; status = `💥 Quắc (bust) với ${ps} điểm. Bạn thua!`; color = ui.COLORS.danger; }
  else if (isBlackjack(player) && !isBlackjack(dealer)) { multiplier = 2.5; status = '🌟 BLACKJACK! Thắng x2.5!'; color = ui.COLORS.gold; }
  else if (ds > 21) { multiplier = 2; status = `Nhà cái quắc (${ds}). Bạn thắng!`; color = ui.COLORS.success; }
  else if (ps > ds) { multiplier = 2; status = `Bạn ${ps} > nhà cái ${ds}. Thắng!`; color = ui.COLORS.success; }
  else if (ps < ds) { multiplier = 0; status = `Bạn ${ps} < nhà cái ${ds}. Thua!`; color = ui.COLORS.danger; }
  else { multiplier = 1; status = `Hoà ${ps} đều. Hoàn cược.`; color = ui.COLORS.warning; }

  const winnings = Math.floor(bet * multiplier);
  user.balance += winnings; // tiền cược đã bị trừ trước đó
  store.save();
  const profit = winnings - bet;

  const embed = bjEmbed(player, dealer, bet, { status, color })
    .addFields(
      { name: '🎁 Nhận về', value: ui.fmtV(winnings), inline: true },
      { name: '📈 Lãi/Lỗ', value: ui.fmtDelta(profit), inline: true },
      { name: '💰 Số dư', value: ui.fmtV(user.balance), inline: true }
    );
  await msg.edit({ embeds: [embed], components: [bjButtons(true, false)] });
  activeBJ.delete(userId);
}

async function startBlackjack(msg: Message, userId: string, bet: number): Promise<void> {
  const deck = makeDeck();
  const player = [deck.pop()!, deck.pop()!];
  const dealer = [deck.pop()!, deck.pop()!];
  const user = store.getUser(userId);

  // Blackjack tự nhiên -> giải quyết ngay
  if (isBlackjack(player)) { await settleBlackjack(msg, userId, player, dealer, bet); return; }

  const canDouble = user.balance >= bet; // đủ tiền để nhân đôi
  await msg.edit({ embeds: [bjEmbed(player, dealer, bet, { hideDealer: true })], components: [bjButtons(false, canDouble)] });

  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000, idle: 45000 });
  collector.on('collect', async (i) => {
    if (i.user.id !== userId) { await i.reply({ content: 'Đây không phải ván của bạn.', ephemeral: true }); return; }
    const action = i.customId.split(':')[1];
    await i.deferUpdate();

    if (action === 'hit') {
      player.push(deck.pop()!);
      if (score(player) >= 21) { collector.stop('done'); return; }
      await msg.edit({ embeds: [bjEmbed(player, dealer, bet, { hideDealer: true })], components: [bjButtons(false, false)] });
    } else if (action === 'double') {
      if (store.getUser(userId).balance < bet) { await i.followUp({ content: 'Không đủ V để nhân đôi.', ephemeral: true }); return; }
      store.getUser(userId).balance -= bet; // cược thêm 1 lần
      bet *= 2;
      player.push(deck.pop()!);
      collector.stop('done');
    } else if (action === 'stand') {
      collector.stop('done');
    }
  });
  collector.on('end', async (_c, reason) => {
    if (reason === 'done') { await settleBlackjack(msg, userId, player, dealer, bet); }
    else {
      // hết giờ -> tự động dừng (stand)
      await settleBlackjack(msg, userId, player, dealer, bet);
    }
  });
}

// Kiểm tra cược chung
function validateBet(userId: string, raw: number): { ok: boolean; amount: number; msg?: string } {
  const amount = Math.floor(raw);
  if (!Number.isFinite(amount) || amount < MIN_BET) return { ok: false, amount: 0, msg: `Cược tối thiểu ${MIN_BET} V.` };
  const user = store.getUser(userId);
  if (user.balance < amount) return { ok: false, amount: 0, msg: 'Bạn không đủ V để cược.' };
  return { ok: true, amount };
}

export const slashBlackjack: SlashCommand = {
  data: new SlashCommandBuilder().setName('blackjack').setDescription('Blackjack tương tác: Rút / Dừng / Nhân đôi')
    .addIntegerOption((o) => o.setName('amount').setDescription('Số V cược').setRequired(true).setMinValue(MIN_BET)),
  async execute(interaction) {
    const v = validateBet(interaction.user.id, interaction.options.getInteger('amount', true));
    if (!v.ok) { await interaction.reply({ embeds: [ui.err(v.msg!)], ephemeral: true }); return; }
    if (activeBJ.has(interaction.user.id)) { await interaction.reply({ embeds: [ui.warn('Bạn đang có một ván Blackjack chưa xong.')], ephemeral: true }); return; }
    store.getUser(interaction.user.id).balance -= v.amount; store.save();
    activeBJ.add(interaction.user.id);
    await interaction.reply({ embeds: [ui.baseEmbed().setTitle('🃏 Blackjack').setDescription('Đang chia bài...')] });
    const msg = await interaction.fetchReply() as any;
    await startBlackjack(msg, interaction.user.id, v.amount);
  }
};

export const prefixBlackjack: PrefixCommand = {
  name: 'blackjack',
  description: 'Blackjack tương tác: v blackjack <số tiền>',
  async execute(message, args) {
    const v = validateBet(message.author.id, Number(args[0]));
    if (!v.ok) { await message.reply({ embeds: [ui.err(v.msg ?? 'Cú pháp: v blackjack <số tiền>')] }); return; }
    if (activeBJ.has(message.author.id)) { await message.reply({ embeds: [ui.warn('Bạn đang có một ván Blackjack chưa xong.')] }); return; }
    store.getUser(message.author.id).balance -= v.amount; store.save();
    activeBJ.add(message.author.id);
    const msg = await message.reply({ embeds: [ui.baseEmbed().setTitle('🃏 Blackjack').setDescription('Đang chia bài...')] });
    await startBlackjack(msg, message.author.id, v.amount);
  }
};

// ============================ BẦU CUA ============================
const BAUCUA = ['bầu', 'cua', 'tôm', 'cá', 'gà', 'nai'];
const BC_EMOJI: Record<string, string> = { 'bầu': '🥥', 'cua': '🦀', 'tôm': '🦐', 'cá': '🐟', 'gà': '🐓', 'nai': '🦌' };

function playBaucua(userId: string, choice: string, amount: number): EmbedBuilder {
  const user = store.getUser(userId);
  user.balance -= amount;
  const roll = [BAUCUA[Math.floor(Math.random() * 6)], BAUCUA[Math.floor(Math.random() * 6)], BAUCUA[Math.floor(Math.random() * 6)]];
  const count = roll.filter((r) => r === choice).length;
  // Trúng 1 lần = lãi 1x (nhận về 2x cược); trúng n = nhận (1+n)x cược
  const winnings = count > 0 ? amount * (1 + count) : 0;
  user.balance += winnings; store.save();
  const profit = winnings - amount;

  return ui.baseEmbed()
    .setColor(count > 0 ? ui.COLORS.success : ui.COLORS.danger)
    .setTitle('🎲 Bầu Cua Tôm Cá')
    .setDescription(`### ${roll.map((r) => BC_EMOJI[r]).join('  ')}`)
    .addFields(
      { name: '🎯 Bạn chọn', value: `${BC_EMOJI[choice]} ${choice}`, inline: true },
      { name: '🎰 Kết quả', value: count === 0 ? 'Không trúng 😢' : `Trúng **${count}** lần!`, inline: true },
      { name: '💵 Cược', value: ui.fmtV(amount), inline: true },
      { name: '🎁 Nhận về', value: ui.fmtV(winnings), inline: true },
      { name: '📈 Lãi/Lỗ', value: ui.fmtDelta(profit), inline: true },
      { name: '💰 Số dư', value: ui.fmtV(user.balance), inline: true }
    );
}

export const slashBaucua: SlashCommand = {
  data: new SlashCommandBuilder().setName('baucua').setDescription('Chơi Bầu Cua')
    .addStringOption((o) => o.setName('choice').setDescription('Cửa cược').setRequired(true)
      .addChoices(...BAUCUA.map((b) => ({ name: b, value: b }))))
    .addIntegerOption((o) => o.setName('amount').setDescription('Số V cược').setRequired(true).setMinValue(MIN_BET)),
  async execute(interaction) {
    const v = validateBet(interaction.user.id, interaction.options.getInteger('amount', true));
    if (!v.ok) { await interaction.reply({ embeds: [ui.err(v.msg!)], ephemeral: true }); return; }
    await interaction.reply({ embeds: [playBaucua(interaction.user.id, interaction.options.getString('choice', true), v.amount)] });
  }
};

export const prefixBaucua: PrefixCommand = {
  name: 'baucua',
  description: 'v baucua <bầu|cua|tôm|cá|gà|nai> <số tiền>',
  async execute(message, args) {
    const choice = args[0]?.toLowerCase();
    if (!BAUCUA.includes(choice)) { await message.reply({ embeds: [ui.err('Cú pháp: v baucua <bầu|cua|tôm|cá|gà|nai> <số tiền>')] }); return; }
    const v = validateBet(message.author.id, Number(args[1]));
    if (!v.ok) { await message.reply({ embeds: [ui.err(v.msg!)] }); return; }
    await message.reply({ embeds: [playBaucua(message.author.id, choice, v.amount)] });
  }
};

// ============================ XÓC ĐĨA ============================
function playXocdia(userId: string, choice: string, amount: number): EmbedBuilder {
  const user = store.getUser(userId);
  user.balance -= amount;
  const coins: number[] = Array.from({ length: 4 }, () => (Math.random() < 0.5 ? 1 : 0));
  const heads = coins.reduce((a, b) => a + b, 0);
  const isEven = heads % 2 === 0;
  const result = isEven ? 'chẵn' : 'lẻ';
  const won = choice === result;
  const winnings = won ? Math.floor(amount * 1.95) : 0;
  user.balance += winnings; store.save();
  const profit = winnings - amount;

  return ui.baseEmbed()
    .setColor(won ? ui.COLORS.success : ui.COLORS.danger)
    .setTitle('⚪ Xóc Đĩa')
    .setDescription(`### ${coins.map((c) => (c ? '🔴' : '⚪')).join('  ')}\nSố mặt đỏ: **${heads}** → **${result.toUpperCase()}**`)
    .addFields(
      { name: '🎯 Bạn chọn', value: choice, inline: true },
      { name: '🎰 Kết quả', value: won ? 'Thắng! (x1.95)' : 'Thua!', inline: true },
      { name: '💵 Cược', value: ui.fmtV(amount), inline: true },
      { name: '🎁 Nhận về', value: ui.fmtV(winnings), inline: true },
      { name: '📈 Lãi/Lỗ', value: ui.fmtDelta(profit), inline: true },
      { name: '💰 Số dư', value: ui.fmtV(user.balance), inline: true }
    );
}

export const slashXocdia: SlashCommand = {
  data: new SlashCommandBuilder().setName('xocdia').setDescription('Chơi Xóc Đĩa (x1.95)')
    .addStringOption((o) => o.setName('choice').setDescription('Chẵn hay lẻ').setRequired(true)
      .addChoices({ name: 'Chẵn', value: 'chẵn' }, { name: 'Lẻ', value: 'lẻ' }))
    .addIntegerOption((o) => o.setName('amount').setDescription('Số V cược').setRequired(true).setMinValue(MIN_BET)),
  async execute(interaction) {
    const v = validateBet(interaction.user.id, interaction.options.getInteger('amount', true));
    if (!v.ok) { await interaction.reply({ embeds: [ui.err(v.msg!)], ephemeral: true }); return; }
    await interaction.reply({ embeds: [playXocdia(interaction.user.id, interaction.options.getString('choice', true), v.amount)] });
  }
};

export const prefixXocdia: PrefixCommand = {
  name: 'xocdia',
  description: 'v xocdia <chẵn|lẻ> <số tiền>',
  async execute(message, args) {
    const choice = args[0]?.toLowerCase();
    if (!['chẵn', 'lẻ'].includes(choice)) { await message.reply({ embeds: [ui.err('Cú pháp: v xocdia <chẵn|lẻ> <số tiền>')] }); return; }
    const v = validateBet(message.author.id, Number(args[1]));
    if (!v.ok) { await message.reply({ embeds: [ui.err(v.msg!)] }); return; }
    await message.reply({ embeds: [playXocdia(message.author.id, choice, v.amount)] });
  }
};

export const prefixes: PrefixCommand[] = [prefixBlackjack, prefixBaucua, prefixXocdia];
