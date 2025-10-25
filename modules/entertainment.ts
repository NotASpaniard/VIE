import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

// ====== BLACKJACK GAME ======

// /blackjack - Slash command handler
export const slashBlackjack: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Chơi Blackjack: x2, Blackjack x2.5')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số V muốn cược')
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const amount = interaction.options.getInteger('amount', true);
      const store = getStore();
      const user = store.getUser(interaction.user.id);
      
      if (user.balance < amount) {
        await interaction.reply({ content: 'Không đủ V để chơi.', ephemeral: true });
        return;
      }
      
      // Deal cards
      const playerCards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
      const dealerCards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
      
      const playerValue = playerCards.reduce((sum, card) => sum + Math.min(card, 10), 0);
      const dealerValue = dealerCards.reduce((sum, card) => sum + Math.min(card, 10), 0);
      
      let result = '';
      let multiplier = 0;
      
      if (playerValue === 21 && playerCards.length === 2) {
        // Blackjack
        result = 'Blackjack!';
        multiplier = 2.5;
      } else if (playerValue === 21) {
        // 21
        result = '21!';
        multiplier = 2;
      } else if (playerValue > 21) {
        // Bust
        result = 'Bust!';
        multiplier = 0;
      } else if (dealerValue > 21 || playerValue > dealerValue) {
        // Win
        result = 'Win!';
        multiplier = 2;
      } else if (playerValue < dealerValue) {
        // Lose
        result = 'Lose!';
        multiplier = 0;
      } else {
        // Tie
        result = 'Tie!';
        multiplier = 1;
      }
      
      const winnings = Math.floor(amount * multiplier);
      const profit = winnings - amount;
      
      user.balance += profit;
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setColor(profit > 0 ? '#4fc3f7' : '#f44336')
        .addFields(
          { name: 'Kết quả', value: result, inline: true },
          { name: 'Cược', value: `${amount} V`, inline: true },
          { name: 'Thắng', value: `${winnings} V`, inline: true },
          { name: 'Lãi/Lỗ', value: `${profit >= 0 ? '+' : ''}${profit} V`, inline: true },
          { name: 'Số dư', value: `${user.balance} V`, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in slashBlackjack:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi chơi Blackjack.', ephemeral: true });
      }
    }
  }
};


// /baucua - Slash command handler
export const slashBaucua: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('baucua')
    .setDescription('Chơi Bầu Cua')
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Lựa chọn')
        .setRequired(true)
        .addChoices(
          { name: 'Bầu', value: 'bầu' },
          { name: 'Cua', value: 'cua' },
          { name: 'Tôm', value: 'tôm' },
          { name: 'Cá', value: 'cá' },
          { name: 'Gà', value: 'gà' },
          { name: 'Nai', value: 'nai' }
        ))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số V muốn cược')
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const choice = interaction.options.getString('choice', true);
      const amount = interaction.options.getInteger('amount', true);
      const store = getStore();
      const user = store.getUser(interaction.user.id);
      
      if (user.balance < amount) {
        await interaction.reply({ content: 'Không đủ V để chơi.', ephemeral: true });
        return;
      }
      
      // Roll dice
      const dice = ['bầu', 'cua', 'tôm', 'cá', 'gà', 'nai'];
      const results = [
        dice[Math.floor(Math.random() * 6)],
        dice[Math.floor(Math.random() * 6)],
        dice[Math.floor(Math.random() * 6)]
      ];
      
      const wins = results.filter(result => result === choice).length;
      const multiplier = wins;
      const winnings = amount * multiplier;
      const profit = winnings - amount;
      
      user.balance += profit;
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🎲 Bầu Cua')
        .setColor(profit > 0 ? '#4fc3f7' : '#f44336')
        .addFields(
          { name: 'Kết quả', value: results.join(' | '), inline: true },
          { name: 'Lựa chọn', value: choice, inline: true },
          { name: 'Thắng', value: `${wins} lần`, inline: true },
          { name: 'Cược', value: `${amount} V`, inline: true },
          { name: 'Thắng', value: `${winnings} V`, inline: true },
          { name: 'Lãi/Lỗ', value: `${profit >= 0 ? '+' : ''}${profit} V`, inline: true },
          { name: 'Số dư', value: `${user.balance} V`, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in slashBaucua:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi chơi Bầu Cua.', ephemeral: true });
      }
    }
  }
};


// /xocdia - Slash command handler
export const slashXocdia: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('xocdia')
    .setDescription('Chơi Xóc Đĩa (x1.95)')
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Lựa chọn')
        .setRequired(true)
        .addChoices(
          { name: 'Chẵn', value: 'chẵn' },
          { name: 'Lẻ', value: 'lẻ' }
        ))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số V muốn cược')
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const choice = interaction.options.getString('choice', true);
      const amount = interaction.options.getInteger('amount', true);
      const store = getStore();
      const user = store.getUser(interaction.user.id);
      
      if (user.balance < amount) {
        await interaction.reply({ content: 'Không đủ V để chơi.', ephemeral: true });
        return;
      }
      
      // Roll dice
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;
      const isEven = total % 2 === 0;
      const result = isEven ? 'chẵn' : 'lẻ';
      
      const isWin = choice === result;
      const multiplier = isWin ? 1.95 : 0;
      const winnings = Math.floor(amount * multiplier);
      const profit = winnings - amount;
      
      user.balance += profit;
      store.save();
      
      const embed = new EmbedBuilder()
        .setTitle('🎲 Xóc Đĩa')
        .setColor(profit > 0 ? '#4fc3f7' : '#f44336')
        .addFields(
          { name: 'Kết quả', value: `${dice1} + ${dice2} = ${total} (${result})`, inline: true },
          { name: 'Lựa chọn', value: choice, inline: true },
          { name: 'Kết quả', value: isWin ? 'Thắng!' : 'Thua!', inline: true },
          { name: 'Cược', value: `${amount} V`, inline: true },
          { name: 'Thắng', value: `${winnings} V`, inline: true },
          { name: 'Lãi/Lỗ', value: `${profit >= 0 ? '+' : ''}${profit} V`, inline: true },
          { name: 'Số dư', value: `${user.balance} V`, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in slashXocdia:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Có lỗi xảy ra khi chơi Xóc Đĩa.', ephemeral: true });
      }
    }
  }
};

export const prefixBlackjack: PrefixCommand = {
  name: 'blackjack',
  description: 'Chơi Blackjack: v blackjack <số tiền>',
  async execute(message, args) {
    const amount = Number(args[0]);
    if (!Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: v blackjack <số tiền>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    if (user.balance < amount) {
      await message.reply('Không đủ tiền để chơi.');
      return;
    }
    
    // Trừ tiền trước
    user.balance -= amount;
    
    // Tạo bộ bài (52 lá)
    const deck = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    
    // Xáo bài
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Chia bài
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, deck.pop()!];
    
    // Tính điểm
    const getCardValue = (card: any): number => {
      if (card.rank === 'A') return 11;
      if (['J', 'Q', 'K'].includes(card.rank)) return 10;
      return parseInt(card.rank);
    };
    
    const calculateScore = (cards: any[]): number => {
      let score = 0;
      let aces = 0;
      
      for (const card of cards) {
        if (card.rank === 'A') {
          aces++;
          score += 11;
        } else {
          score += getCardValue(card);
        }
      }
      
      // Điều chỉnh Aces
      while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
      }
      
      return score;
    };
    
    const playerScore = calculateScore(playerCards);
    const dealerScore = calculateScore(dealerCards);
    
    // Logic kết quả với luck system
    const random = Math.random();
    let result: string;
    let multiplier: number;
    let finalDealerScore = dealerScore;
    
    // Luck system: 48% player win, 4% draw, 48% dealer win
    if (random < 0.48) {
      // Player wins
      if (playerScore === 21 && playerCards.length === 2) {
        result = 'Blackjack!';
        multiplier = 2.5;
      } else {
        result = 'Thắng!';
        multiplier = 2;
      }
    } else if (random < 0.52) {
      // Draw
      result = 'Hòa!';
      multiplier = 1;
    } else {
      // Dealer wins
      result = 'Thua!';
      multiplier = 0;
      // Điều chỉnh dealer score để hợp lý
      if (dealerScore < playerScore) {
        finalDealerScore = Math.min(21, playerScore + Math.floor(Math.random() * 3) + 1);
      }
    }
    
    const winnings = Math.floor(amount * multiplier);
    user.balance += winnings;
    store.save();
    
    // Hiển thị kết quả
    const playerCardsStr = playerCards.map(c => `${c.rank}${c.suit}`).join(' ');
    const dealerCardsStr = dealerCards.map(c => `${c.rank}${c.suit}`).join(' ');
    
    const embed = new EmbedBuilder()
      .setTitle('🃏 Blackjack')
      .setColor(multiplier > 1 ? '#00FF00' : multiplier === 1 ? '#FFFF00' : '#FF0000')
      .addFields(
        { name: '👤 Bài của bạn', value: `${playerCardsStr} (${playerScore})`, inline: true },
        { name: '🤖 Bài của dealer', value: `${dealerCardsStr} (${finalDealerScore})`, inline: true },
        { name: '💰 Kết quả', value: `${result}\nCược: ${amount} V\nThắng: ${winnings} V`, inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// ====== BẦU CUA ======
export const prefixBaucua: PrefixCommand = {
  name: 'baucua',
  description: 'Chơi Bầu Cua: v baucua <bầu|cua|tôm|cá|gà|nai> <số tiền>',
  async execute(message, args) {
    const betChoice = args[0]?.toLowerCase();
    const amount = Number(args[1]);
    
    const validChoices = ['bầu', 'cua', 'tôm', 'cá', 'gà', 'nai'];
    if (!validChoices.includes(betChoice) || !Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: v baucua <bầu|cua|tôm|cá|gà|nai> <số tiền>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    if (user.balance < amount) {
      await message.reply('Không đủ tiền để chơi.');
      return;
    }
    
    // Trừ tiền trước
    user.balance -= amount;
    
    // Tung 3 xúc xắc
    const dice = ['bầu', 'cua', 'tôm', 'cá', 'gà', 'nai'];
    const results = [
      dice[Math.floor(Math.random() * 6)],
      dice[Math.floor(Math.random() * 6)],
      dice[Math.floor(Math.random() * 6)]
    ];
    
    // Đếm số lần xuất hiện
    const count = results.filter(r => r === betChoice).length;
    
    let multiplier = 0;
    if (count === 1) multiplier = 1;
    else if (count === 2) multiplier = 2;
    else if (count === 3) multiplier = 3;
    
    const winnings = Math.floor(amount * multiplier);
    user.balance += winnings;
    store.save();
    
    // Emoji mapping
    const emojiMap: Record<string, string> = {
      'bầu': '🥥', 'cua': '🦀', 'tôm': '🦐', 'cá': '🐟', 'gà': '🐓', 'nai': '🦌'
    };
    
    const resultsStr = results.map(r => emojiMap[r]).join(' ');
    const resultText = count === 0 ? 'Không trúng' : `Trúng ${count} lần`;
    
    const embed = new EmbedBuilder()
      .setTitle('🎲 Bầu Cua')
      .setColor(multiplier > 0 ? '#00FF00' : '#FF0000')
      .addFields(
        { name: '🎯 Cược của bạn', value: `${emojiMap[betChoice]} ${betChoice}`, inline: true },
        { name: '🎲 Kết quả', value: resultsStr, inline: true },
        { name: '💰 Kết quả', value: `${resultText}\nCược: ${amount} V\nThắng: ${winnings} V`, inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

// ====== XÓC ĐĨA GAME ======
export const prefixXocdia: PrefixCommand = {
  name: 'xocdia',
  description: 'Chơi Xóc Đĩa: v xocdia <chẵn|lẻ> <số tiền>',
  async execute(message, args) {
    const betChoice = args[0]?.toLowerCase();
    const amount = Number(args[1]);
    
    if (!['chẵn', 'lẻ'].includes(betChoice) || !Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: v xocdia <chẵn|lẻ> <số tiền>');
      return;
    }
    
    const store = getStore();
    const user = store.getUser(message.author.id);
    if (user.balance < amount) {
      await message.reply('Không đủ tiền để chơi.');
      return;
    }
    
    // Trừ tiền trước
    user.balance -= amount;
    
    // Tung 4 đồng xu
    const coins = [];
    for (let i = 0; i < 4; i++) {
      coins.push(Math.random() < 0.5 ? 'heads' : 'tails');
    }
    
    // Đếm số mặt ngửa
    const headsCount = coins.filter(c => c === 'heads').length;
    const isEven = headsCount % 2 === 0;
    
    let won = false;
    if (betChoice === 'chẵn' && isEven) won = true;
    if (betChoice === 'lẻ' && !isEven) won = true;
    
    const winnings = won ? Math.floor(amount * 1.95) : 0; // House edge 2.5%
    user.balance += winnings;
    store.save();
    
    const coinsStr = coins.map(c => c === 'heads' ? '🪙' : '⚫').join(' ');
    const resultText = won ? 'Thắng!' : 'Thua!';
    
    const embed = new EmbedBuilder()
      .setTitle('🪙 Xóc Đĩa')
      .setColor(won ? '#00FF00' : '#FF0000')
      .addFields(
        { name: '🎯 Cược của bạn', value: betChoice === 'chẵn' ? 'Chẵn (0,2,4 ngửa)' : 'Lẻ (1,3 ngửa)', inline: true },
        { name: '🪙 Kết quả', value: `${coinsStr}\nSố mặt ngửa: ${headsCount}`, inline: true },
        { name: '💰 Kết quả', value: `${resultText}\nCược: ${amount} V\nThắng: ${winnings} V`, inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
};

export const prefixes: PrefixCommand[] = [prefixBlackjack, prefixBaucua, prefixXocdia];
