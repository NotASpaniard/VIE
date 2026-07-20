import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { ZODIAC, ZODIAC_EGG_IDS, MYTHICAL_EGGS, zodiacBonusesFromEggs, type ZodiacBonuses } from '../lib/zodiac.js';

type UserProfile = {
  userId: string;
  balance: number;
  daily: { last: number | null; streak: number };
  lastDaily: string;
  dailyStreak: number;
  inventory: Record<string, number>; // woodId -> kg
  quests: { desc: string; reward: number; done: boolean }[];
  xp: number;
  level: number;
  eggBuys?: number; // số lần đã mua trứng con giáp (để tính giá lũy tiến)
  cooldowns: {
    work: number | null;
    hunt: number | null;
    fish: number | null;
    daily: number | null;
    weekly: number | null;
    dungeon_nhan: number | null;
    dungeon_thien: number | null;
    dungeon_ma: number | null;
  };
  categorizedInventory: {
    eggs: Record<string, number>;        // rong_xanh_egg, phuong_hoang_egg, etc.
    pets: Record<string, number>;       // rong_xanh_pet, phuong_hoang_pet, etc.
    weapons: Record<string, number>;    // kiem_go, kiem_sat, etc.
    monsterItems: Record<string, number>;  // linh_hon_yeu_tinh, linh_hon_ho_ly, etc.
    dungeonGear: Record<string, number>; // phu_chu_tre, bua_ho_menh, etc.
    dungeonLoot: Record<string, number>; // ngoc_linh, buff_items, etc.
    misc: Record<string, number>;       // rương thần bí, rác, etc.
  };
  equippedItems: {
    weapon: string | null;
    phuChu: string | null;
    linhDan: string | null;
  };
  hatchery: {
    level: number;
    plantedEgg: {
      type: string | null;
      plantedAt: number | null;
      harvestAt: number | null;
    };
  };
  dungeonStats?: {
    totalClears: number;
    attempts?: number;
    successRate: number;
    totalEarned: number;
    eggsCollected: number;
    soulsCollected: number;
    ngocLinhCollected: number;
  };
};

export type GiveawayRecord = {
  messageId: string;
  channelId: string;
  guildId: string;
  hostId: string;
  prize: string;
  winners: number;
  requiredRole: string | null; // role id (không phải markup)
  endTime: number;
  ended: boolean;
};

type DB = {
  users: Record<string, UserProfile>;
  guilds: Record<string, Guild>;
  giveaways?: Record<string, GiveawayRecord>;
  icons?: Record<string, Record<string, string>>; // guildId -> iconKey -> emoji
};

type Guild = {
  name: string;
  ownerId: string;
  roleId: string | null;
  members: string[];
  inventory: Record<string, number>; // itemId -> quantity (kho guild)
  fire: { until: number | null };
  quests: { desc: string; reward: number; done: boolean }[];
  daily: { day: number | null; completed: string[]; rewarded?: boolean };
  guildRank: {
    level: number;        // Hạng guild (1-5)
    funds: number;        // Quỹ hiện tại
    totalContributed: number; // Tổng đã đóng góp
    contributors: Record<string, number>; // userId -> số tiền đã donate
  };
};

let singleton: Store | null = null;

export function getStore(): Store {
  if (!singleton) singleton = new Store();
  return singleton;
}

export class Store {
  private file: string;
  private db: DB;

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    if (!existsSync(dir)) mkdirSync(dir);
    this.file = path.join(dir, 'db.json');
    this.db = { users: {}, guilds: {} };
    this.load();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.file, 'utf8');
      this.db = JSON.parse(raw) as DB;
    } catch {
      // db.json thiếu hoặc HỎNG. Nếu file tồn tại nhưng parse lỗi -> KHÔNG ghi đè bằng DB rỗng
      // (sẽ xoá sạch số dư mọi người). Backup lại để cứu thủ công rồi mới khởi tạo mới.
      if (existsSync(this.file)) {
        try { renameSync(this.file, `${this.file}.corrupt.${process.pid}`); } catch { /* ignore */ }
        console.error('⚠️ db.json hỏng! Đã backup sang db.json.corrupt.* — dữ liệu cũ được giữ để khôi phục thủ công.');
      }
      this.db = { users: {}, guilds: {} };
      this.save();
    }
  }

  save(): void {
    // Ghi atomic: ghi ra file tạm rồi rename (đổi tên là thao tác atomic trên cùng volume),
    // tránh để lại db.json cắt cụt nếu tiến trình bị kill giữa lúc ghi.
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf8');
    renameSync(tmp, this.file);
  }

  getAllUsers(): UserProfile[] {
    return Object.values(this.db.users);
  }

  getUser(userId: string): UserProfile {
    if (!this.db.users[userId]) {
      this.db.users[userId] = {
        userId,
        balance: 0,
        daily: { last: null, streak: 0 },
        lastDaily: '',
        dailyStreak: 0,
        inventory: {},
        quests: this.generateQuests(),
        xp: 0,
        level: 1,
        cooldowns: {
          work: null,
          hunt: null,
          fish: null,
          daily: null,
          weekly: null,
          dungeon_nhan: null,
          dungeon_thien: null,
          dungeon_ma: null
        },
        categorizedInventory: {
          eggs: {},
          pets: {},
          weapons: {},
          monsterItems: {},
          dungeonGear: {},
          dungeonLoot: {},
          misc: {}
        },
        equippedItems: {
          weapon: null,
          phuChu: null,
          linhDan: null
        },
        hatchery: {
          level: 1,
          plantedEgg: {
            type: null,
            plantedAt: null,
            harvestAt: null
          }
        }
      };
      this.save();
    }
    
    // MIGRATION: Fix old users missing new fields
    const user = this.db.users[userId];
    let needsSave = false;

    // Đảm bảo các trường SỐ cốt lõi hợp lệ (user từ DB cũ trước hệ XP có thể thiếu -> tránh NaN lan ra balance)
    if (typeof user.balance !== 'number' || Number.isNaN(user.balance)) { user.balance = 0; needsSave = true; }
    if (typeof user.xp !== 'number' || Number.isNaN(user.xp)) { user.xp = 0; needsSave = true; }
    if (typeof user.eggBuys !== 'number') { user.eggBuys = 0; needsSave = true; }
    if (typeof user.level !== 'number' || Number.isNaN(user.level) || user.level < 1) { user.level = 1; needsSave = true; }
    if (!Array.isArray(user.quests)) { user.quests = this.generateQuests(); needsSave = true; }
    if (!user.daily) { user.daily = { last: null, streak: 0 }; needsSave = true; }
    if (!user.inventory) { user.inventory = {}; needsSave = true; }

    // Add missing lastDaily and dailyStreak
    if (user.lastDaily === undefined) {
      user.lastDaily = '';
      needsSave = true;
    }
    if (user.dailyStreak === undefined) {
      user.dailyStreak = 0;
      needsSave = true;
    }
    
    // Add missing cooldowns.daily
    if (user.cooldowns && user.cooldowns.daily === undefined) {
      user.cooldowns.daily = null;
      needsSave = true;
    }
    
    // Ensure cooldowns exists
    if (!user.cooldowns) {
      user.cooldowns = {
        work: null,
        hunt: null,
        fish: null,
        daily: null,
        weekly: null,
        dungeon_nhan: null,
        dungeon_thien: null,
        dungeon_ma: null
      };
      needsSave = true;
    }
    
    // Ensure categorizedInventory exists
    if (!user.categorizedInventory) {
      user.categorizedInventory = {
        eggs: {},
        pets: {},
        weapons: {},
        monsterItems: {},
        dungeonGear: {},
        dungeonLoot: {},
        misc: {}
      };
      needsSave = true;
    }
    
    // Ensure equippedItems exists
    if (!user.equippedItems) {
      user.equippedItems = {
        weapon: null,
        phuChu: null,
        linhDan: null
      };
      needsSave = true;
    }
    
    // Ensure hatchery exists
    if (!user.hatchery) {
      user.hatchery = {
        level: 1,
        plantedEgg: {
          type: null,
          plantedAt: null,
          harvestAt: null
        }
      };
      needsSave = true;
    }
    // hatchery cũ có thể thiếu plantedEgg -> tránh crash khi đọc plantedEgg.type
    if (!user.hatchery.plantedEgg) {
      user.hatchery.plantedEgg = { type: null, plantedAt: null, harvestAt: null };
      needsSave = true;
    }
    
    // Ensure guilds exists in DB
    if (!this.db.guilds) {
      this.db.guilds = {};
      needsSave = true;
    }
    
    if (needsSave) {
      this.save();
    }
    
    return user;
  }

  getTopBalances(limit: number): { userId: string; balance: number }[] {
    return Object.values(this.db.users)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
      .map((u) => ({ userId: u.userId, balance: u.balance }));
  }

  getInventory(userId: string): Record<string, number> {
    return this.getUser(userId).inventory;
  }

  // Daily reward with VN time (GMT+7)
  claimDaily(userId: string): { amount: number; message: string } {
    const u = this.getUser(userId);
    const now = Date.now();
    const vnNow = now + 7 * 60 * 60 * 1000; // shift to GMT+7
    const day = Math.floor(vnNow / 86400000); // days since epoch at GMT+7
    const lastDay = u.daily.last === null ? null : Math.floor((u.daily.last + 7 * 3600000) / 86400000);

    if (lastDay === day) {
      return { amount: 0, message: 'Hôm nay bạn đã điểm danh rồi.' };
    }

    // streak logic
    if (lastDay !== null && lastDay === day - 1) {
      u.daily.streak += 1;
    } else {
      u.daily.streak = 1;
    }
    u.daily.last = now;

    let reward = 100; // Base reward 100 V
    if (u.daily.streak === 2) reward = 200;
    else if (u.daily.streak === 3) reward = 300;
    else if (u.daily.streak > 7) reward = Math.floor(700 + Math.random() * (1999 - 700 + 1));
    // else default 100

    // Áp dụng guild rank buff
    const userGuild = this.getUserGuild(userId);
    if (userGuild) {
      const buffs = this.getGuildRankBuffs(userGuild.guildRank.level);
      const bonus = Math.floor(reward * buffs.incomeBonus / 100);
      reward += bonus;
    }

    u.balance += reward;
    
    // Cộng XP cho daily
    const xpResult = this.addXP(userId, 25);
    this.save();
    
    let message = `Điểm danh thành công! +${reward} V. Streak: ${u.daily.streak}.`;
    if (userGuild) {
      const buffs = this.getGuildRankBuffs(userGuild.guildRank.level);
      message += `\n🏆 Guild Hạng ${userGuild.guildRank.level} bonus: +${buffs.incomeBonus}%`;
    }
    message += `\n${xpResult.message}`;
    
    return { amount: reward, message };
  }

  // Quests
  generateQuests(): { desc: string; reward: number; done: boolean }[] {
    const pool = [
      { desc: 'Chat 50 tin nhắn', reward: 200 },
      { desc: 'Dùng lệnh bất kỳ 5 lần', reward: 150 },
      { desc: 'Đề cập 3 người', reward: 120 },
      { desc: 'Tham gia voice 10 phút', reward: 300 },
      { desc: 'Gửi 1 ảnh', reward: 100 }
    ];
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    return [pick(), pick(), pick()].map((q) => ({ ...q, done: false }));
  }

  getDailyQuests(userId: string): { desc: string; reward: number; done: boolean }[] {
    const u = this.getUser(userId);
    // reset by VN day
    const now = Date.now();
    const vnDay = Math.floor((now + 7 * 3600000) / 86400000);
    const last = u.daily.last ? Math.floor((u.daily.last + 7 * 3600000) / 86400000) : null;
    if (last !== vnDay) {
      // regenerate quests daily independently of daily claim
      u.quests = this.generateQuests();
      this.save();
    }
    return u.quests;
  }

  refreshDailyQuests(userId: string): void {
    const u = this.getUser(userId);
    u.quests = this.generateQuests();
    this.save();
  }

  // ====== CLUB (CLUB) ======
  ensureGuild(name: string): Guild {
    if (!this.db.guilds[name]) {
      this.db.guilds[name] = {
        name,
        ownerId: '',
        roleId: null,
        members: [],
        inventory: {},
        fire: { until: null },
        quests: this.generateQuests(),
        daily: { day: null, completed: [] },
        guildRank: {
          level: 1,
          funds: 0,
          totalContributed: 0,
          contributors: {}
        }
      };
      this.save();
    }
    return this.db.guilds[name];
  }

  guildExists(name: string): boolean {
    return Boolean(this.db.guilds[name]);
  }

  setGuildOwner(name: string, ownerId: string, roleId: string | null): Guild {
    const g = this.ensureGuild(name);
    g.ownerId = ownerId;
    g.roleId = roleId;
    if (!g.members.includes(ownerId)) g.members.push(ownerId);
    this.save();
    return g;
  }

  addGuildMember(name: string, userId: string): Guild {
    const g = this.ensureGuild(name);
    if (!g.members.includes(userId)) g.members.push(userId);
    this.save();
    return g;
  }

  removeGuildMember(name: string, userId: string): Guild {
    const g = this.ensureGuild(name);
    g.members = g.members.filter((m) => m !== userId);
    this.save();
    return g;
  }

  getUserGuild(userId: string): Guild | null {
    return Object.values(this.db.guilds).find((g) => g.members.includes(userId)) ?? null;
  }

  getGuildInventory(name: string): Record<string, number> {
    return this.ensureGuild(name).inventory;
  }

  addItemToGuild(name: string, itemId: string, quantity: number): void {
    const inv = this.ensureGuild(name).inventory;
    inv[itemId] = (inv[itemId] ?? 0) + Math.max(0, Math.floor(quantity));
    this.save();
  }

  // Fire handling
  getGuildFire(name: string): { until: number | null } {
    return this.ensureGuild(name).fire;
  }

  startGuildFire(name: string, minutes: number): void {
    const g = this.ensureGuild(name);
    const now = Date.now();
    g.fire.until = now + minutes * 60000;
    this.save();
  }

  // Club quests/daily
  getGuildQuests(name: string): { desc: string; reward: number; done: boolean }[] {
    return this.ensureGuild(name).quests;
  }

  refreshGuildQuests(name: string): void {
    const g = this.ensureGuild(name);
    g.quests = this.generateQuests();
    this.save();
  }

  markGuildDaily(name: string, userId: string): { completedAll: boolean; shouldReward: boolean; message: string } {
    const g = this.ensureGuild(name);
    const vnDay = Math.floor((Date.now() + 7 * 3600000) / 86400000);
    if (g.daily.day !== vnDay) {
      g.daily.day = vnDay;
      g.daily.completed = [];
      g.daily.rewarded = false; // reset cờ thưởng theo ngày
    }
    if (!g.daily.completed.includes(userId)) g.daily.completed.push(userId);
    const completedAll = g.members.length > 0 && g.daily.completed.length === g.members.length;
    // Chỉ phát thưởng ĐÚNG MỘT LẦN khi vừa đủ toàn bộ; nếu không, spam daily sẽ đúc tiền vô hạn.
    const shouldReward = completedAll && !g.daily.rewarded;
    if (shouldReward) g.daily.rewarded = true;
    this.save();
    return { completedAll, shouldReward, message: `Đã điểm danh guild: ${g.daily.completed.length}/${g.members.length}` };
  }

  // ====== GIVEAWAY ======
  private ensureGiveaways(): Record<string, GiveawayRecord> {
    if (!this.db.giveaways) this.db.giveaways = {};
    return this.db.giveaways;
  }

  addGiveaway(rec: GiveawayRecord): void {
    this.ensureGiveaways()[rec.messageId] = rec;
    this.save();
  }

  getGiveaway(messageId: string): GiveawayRecord | null {
    return this.ensureGiveaways()[messageId] ?? null;
  }

  getActiveGiveaways(): GiveawayRecord[] {
    return Object.values(this.ensureGiveaways()).filter((g) => !g.ended);
  }

  markGiveawayEnded(messageId: string): void {
    const g = this.ensureGiveaways()[messageId];
    if (g) { g.ended = true; this.save(); }
  }

  // ====== GUILD RANK SYSTEM ======
  contributeToGuild(guildName: string, userId: string, amount: number): { success: boolean; message: string; upgraded: boolean } {
    const user = this.getUser(userId);
    if (user.balance < amount) {
      return { success: false, message: 'Không đủ tiền để đóng góp.', upgraded: false };
    }
    
    const guild = this.ensureGuild(guildName);
    if (!guild.members.includes(userId)) {
      return { success: false, message: 'Bạn không phải hội viên của guild này.', upgraded: false };
    }

    // Trừ tiền user và thêm vào quỹ guild
    user.balance -= amount;
    guild.guildRank.funds += amount;
    guild.guildRank.totalContributed += amount;
    guild.guildRank.contributors[userId] = (guild.guildRank.contributors[userId] || 0) + amount;

    // Kiểm tra auto-upgrade
    const upgraded = this.upgradeGuildRank(guildName);
    this.save();
    
    return { 
      success: true, 
      message: `Đã đóng góp ${amount} V vào quỹ guild. Quỹ hiện tại: ${guild.guildRank.funds} V.`,
      upgraded 
    };
  }

  upgradeGuildRank(guildName: string): boolean {
    const guild = this.ensureGuild(guildName);
    const currentLevel = guild.guildRank.level;
    const requiredFunds = this.getGuildRankUpgradeCost(currentLevel + 1);
    
    if (guild.guildRank.funds >= requiredFunds && currentLevel < 5) {
      guild.guildRank.level += 1;
      guild.guildRank.funds -= requiredFunds;
      return true;
    }
    return false;
  }

  getGuildRankUpgradeCost(level: number): number {
    const costs = [0, 10000, 100000, 1000000, 10000000, 100000000]; // Level 0-5
    return costs[level] || 0;
  }

  // ====== XP & LEVEL SYSTEM ======
  addXP(userId: string, amount: number): { leveledUp: boolean; newLevel: number; message: string } {
    const user = this.getUser(userId);
    user.xp += amount;
    
    const oldLevel = user.level;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)));
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      user.level = newLevel;
      this.save();
      return {
        leveledUp: true,
        newLevel,
        message: `🎉 Level up! Bạn đã lên level ${newLevel}! (+${amount} XP)`
      };
    }
    
    this.save();
    return {
      leveledUp: false,
      newLevel: oldLevel,
      message: `+${amount} XP (${user.xp}/${Math.pow(newLevel + 1, 2) * 100} để lên level ${newLevel + 1})`
    };
  }

  // ====== COOLDOWN SYSTEM ======
  checkCooldown(userId: string, type: 'work' | 'hunt' | 'fish' | 'daily' | 'weekly' | 'dungeon_nhan' | 'dungeon_thien' | 'dungeon_ma'): { canUse: boolean; remainingMinutes: number } {
    const user = this.getUser(userId);
    const cooldownTime = user.cooldowns[type];
    
    if (!cooldownTime) {
      return { canUse: true, remainingMinutes: 0 };
    }
    
    const now = Date.now();
    const remainingMs = cooldownTime - now;
    
    if (remainingMs <= 0) {
      user.cooldowns[type] = null;
      this.save();
      return { canUse: true, remainingMinutes: 0 };
    }
    
    return { canUse: false, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }

  setCooldown(userId: string, type: 'work' | 'hunt' | 'fish' | 'daily' | 'weekly' | 'dungeon_nhan' | 'dungeon_thien' | 'dungeon_ma', baseMinutes: number): void {
    const user = this.getUser(userId);
    
    // Áp dụng guild rank buff
    const userGuild = this.getUserGuild(userId);
    let actualMinutes = baseMinutes;
    
    if (userGuild) {
      const buffs = this.getGuildRankBuffs(userGuild.guildRank.level);
      actualMinutes = Math.max(1, Math.floor(baseMinutes * (1 - buffs.cooldownReduction / 100)));
    }
    
    user.cooldowns[type] = Date.now() + (actualMinutes * 60000);
    this.save();
  }

  // ====== INVENTORY SYSTEM ======
  addItemToInventory(userId: string, category: keyof UserProfile['categorizedInventory'], itemId: string, quantity: number): void {
    const user = this.getUser(userId);
    user.categorizedInventory[category][itemId] = (user.categorizedInventory[category][itemId] || 0) + quantity;
    this.save();
  }

  removeItemFromInventory(userId: string, category: keyof UserProfile['categorizedInventory'], itemId: string, quantity: number): boolean {
    const user = this.getUser(userId);
    const currentAmount = user.categorizedInventory[category][itemId] || 0;
    
    if (currentAmount < quantity) {
      return false;
    }
    
    user.categorizedInventory[category][itemId] = currentAmount - quantity;
    if (user.categorizedInventory[category][itemId] <= 0) {
      delete user.categorizedInventory[category][itemId];
    }
    this.save();
    return true;
  }

  getItemQuantity(userId: string, category: keyof UserProfile['categorizedInventory'], itemId: string): number {
    const user = this.getUser(userId);
    return user.categorizedInventory[category][itemId] || 0;
  }

  // ====== EQUIPMENT SYSTEM ======
  equipItem(userId: string, slot: 'weapon' | 'phuChu' | 'linhDan', itemId: string): { success: boolean; message: string } {
    const user = this.getUser(userId);
    
    // Kiểm tra có item trong inventory không
    const category = slot === 'weapon' ? 'weapons' : slot === 'phuChu' ? 'dungeonGear' : 'dungeonGear';
    if (this.getItemQuantity(userId, category, itemId) <= 0) {
      return { success: false, message: 'Bạn không có item này trong túi đồ.' };
    }
    
    user.equippedItems[slot] = itemId;
    this.save();
    return { success: true, message: `Đã trang bị ${itemId}.` };
  }

  // ====== HATCHERY SYSTEM ======
  plantEgg(userId: string, eggType: string): { success: boolean; message: string } {
    const user = this.getUser(userId);
    
    // Kiểm tra hatchery level
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    const eggConfig = gameConfig.eggs[eggType];
    
    if (!eggConfig) {
      return { success: false, message: 'Loại trứng không hợp lệ.' };
    }
    
    if (user.hatchery.level < eggConfig.levelRequired) {
      return { success: false, message: `Cần trại level ${eggConfig.levelRequired} để ấp ${eggConfig.name}.` };
    }
    
    // Kiểm tra đã ấp trứng chưa
    if (user.hatchery.plantedEgg.type) {
      return { success: false, message: 'Đã có trứng đang ấp. Hãy thu hoạch trước.' };
    }
    
    // Kiểm tra có trứng
    const eggId = `${eggType}_egg`;
    if (this.getItemQuantity(userId, 'eggs', eggId) <= 0) {
      return { success: false, message: `Không có trứng ${eggConfig.name}.` };
    }
    
    // Ấp trứng
    this.removeItemFromInventory(userId, 'eggs', eggId, 1);
    
    const now = Date.now();
    const growTimeMs = eggConfig.growTime * 60000; // Convert minutes to ms
    
    // Áp dụng guild rank buff + role Ấp Trứng Sư (-10% thời gian)
    const userGuild = this.getUserGuild(userId);
    let actualGrowTime = growTimeMs;
    if (userGuild) {
      const buffs = this.getGuildRankBuffs(userGuild.guildRank.level);
      actualGrowTime = Math.floor(actualGrowTime * (1 - buffs.cooldownReduction / 100));
    }
    actualGrowTime = Math.max(60000, Math.floor(actualGrowTime * this.getShopRoleBuffs(userId).hatchTimeMult));
    
    user.hatchery.plantedEgg = {
      type: eggType,
      plantedAt: now,
      harvestAt: now + actualGrowTime
    };
    
    this.save();
    return { success: true, message: `Đã ấp ${eggConfig.name}. Thu hoạch sau ${Math.ceil(actualGrowTime / 60000)} phút.` };
  }

  hatchEgg(userId: string): { success: boolean; message: string; reward: number; kg: number } {
    const user = this.getUser(userId);
    
    if (!user.hatchery.plantedEgg.type) {
      return { success: false, message: 'Không có trứng nào để thu hoạch.', reward: 0, kg: 0 };
    }
    
    const now = Date.now();
    if (now < user.hatchery.plantedEgg.harvestAt!) {
      const remainingMs = user.hatchery.plantedEgg.harvestAt! - now;
      return { success: false, message: `Trứng chưa nở. Còn ${Math.ceil(remainingMs / 60000)} phút.`, reward: 0, kg: 0 };
    }
    
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    const eggConfig = gameConfig.eggs[user.hatchery.plantedEgg.type];
    
    // Random KG từ 0.1 - 100 KG
    const kg = Math.round((0.1 + Math.random() * 99.9) * 10) / 10; // Làm tròn 1 chữ số thập phân
    
    // Tính reward với bonus 10-30%
    const bonusPercent = 10 + Math.random() * 20; // 10-30%
    const reward = Math.floor(eggConfig.baseReward * (1 + bonusPercent / 100));
    
    // Thêm reward vào balance và inventory
    user.balance += reward;
    this.addItemToInventory(userId, 'pets', user.hatchery.plantedEgg.type, 1);
    
    // Reset hatchery
    user.hatchery.plantedEgg = {
      type: null,
      plantedAt: null,
      harvestAt: null
    };
    
    this.save();
    return { success: true, message: `Ấp trứng thành công! +${reward} V (+${Math.floor(bonusPercent)}% bonus). Thu được ${kg} KG ${eggConfig.name}.`, reward, kg };
  }

  upgradeHatchery(userId: string): { success: boolean; message: string } {
    const user = this.getUser(userId);
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    const nextLevel = user.hatchery.level + 1;
    const cost = gameConfig.hatchery_upgrade_costs[nextLevel.toString()];
    
    if (!cost) {
      return { success: false, message: 'Trại đã đạt level tối đa.' };
    }
    
    if (user.balance < cost) {
      return { success: false, message: `Không đủ ${cost} V để nâng cấp trại ấp trứng.` };
    }
    
    user.balance -= cost;
    user.hatchery.level = nextLevel;
    this.save();
    
    return { success: true, message: `Đã nâng cấp trại lên level ${nextLevel}!` };
  }

  // ====== ICON TUỲ CHỈNH THEO SERVER (/custom) ======
  getIconOverrides(guildId: string): Record<string, string> {
    if (!this.db.icons) this.db.icons = {};
    return this.db.icons[guildId] ?? {};
  }

  getIconOverride(guildId: string, key: string): string | null {
    return this.getIconOverrides(guildId)[key] ?? null;
  }

  setIconOverride(guildId: string, key: string, emoji: string): void {
    if (!this.db.icons) this.db.icons = {};
    if (!this.db.icons[guildId]) this.db.icons[guildId] = {};
    this.db.icons[guildId][key] = emoji;
    this.save();
  }

  resetIconOverride(guildId: string, key: string): void {
    if (this.db.icons?.[guildId]) {
      delete this.db.icons[guildId][key];
      this.save();
    }
  }

  // ====== TRỨNG CON GIÁP (ZODIAC) ======
  // Giá tăng lũy tiến ×1.15 mỗi lần mua bất kỳ trứng con giáp nào
  getEggPrice(userId: string, basePrice: number): number {
    const buys = this.getUser(userId).eggBuys || 0;
    return Math.round(basePrice * Math.pow(1.15, buys));
  }

  recordEggBuy(userId: string): void {
    const u = this.getUser(userId);
    u.eggBuys = (u.eggBuys || 0) + 1;
    this.save();
  }

  getZodiacBonuses(userId: string): ZodiacBonuses {
    return zodiacBonusesFromEggs(this.getUser(userId).categorizedInventory.eggs);
  }

  countZodiacOwned(userId: string): number {
    const eggs = this.getUser(userId).categorizedInventory.eggs;
    return ZODIAC_EGG_IDS.filter((id) => (eggs[id] || 0) > 0).length;
  }

  // Hợp thể đủ 12 con giáp -> 1 trứng thần thoại ngẫu nhiên
  fuseZodiac(userId: string): { success: boolean; message: string; eggType?: string } {
    const eggs = this.getUser(userId).categorizedInventory.eggs;
    const missing = ZODIAC.filter((z) => (eggs[z.egg] || 0) < 1);
    if (missing.length) {
      return { success: false, message: `Chưa đủ 12 con giáp (còn ${12 - missing.length}/12). Thiếu: ${missing.map((z) => z.chi).join(', ')}.` };
    }
    for (const z of ZODIAC) this.removeItemFromInventory(userId, 'eggs', z.egg, 1);
    const myth = MYTHICAL_EGGS[Math.floor(Math.random() * MYTHICAL_EGGS.length)];
    this.addItemToInventory(userId, 'eggs', myth, 1);
    this.save();
    const eggType = myth.replace('_egg', '');
    return { success: true, message: `Hợp thể thành công! Nhận **${myth}**. Ấp bằng: \`v hatch place ${eggType}\``, eggType };
  }

  // Buff từ role chức nghiệp đã mua (lưu ở misc: role_<id>)
  getShopRoleBuffs(userId: string): { huntSuccess: number; dungeonDamagePct: number; hatchTimeMult: number } {
    const misc = this.getUser(userId).categorizedInventory.misc;
    return {
      huntSuccess: misc['role_tru_ta_su'] ? 20 : 0,       // Trừ Tà Sư: +20% tỷ lệ săn
      dungeonDamagePct: misc['role_pha_ai_su'] ? 15 : 0,  // Phá Ải Sư: +15% sát thương ải
      hatchTimeMult: misc['role_ap_trung_su'] ? 0.9 : 1   // Ấp Trứng Sư: -10% thời gian ấp
    };
  }

  getGuildRankBuffs(level: number): { memberSlots: number; incomeBonus: number; cooldownReduction: number; xpBonus: number } {
    return {
      memberSlots: 5 + (level - 1) * 2, // Level 1 = 5, Level 2 = 7, Level 3 = 9, etc.
      incomeBonus: (level - 1) * 5, // +5% per level
      cooldownReduction: (level - 1) * 5, // -5% per level
      xpBonus: (level - 1) * 10 // +10% per level
    };
  }


  // ====== DUNGEON SYSTEM ======
  getDungeonTier(tier: string): any | null {
    const gameConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'data/game_config.json'), 'utf8'));
    return gameConfig.dungeon_tiers[`${tier}_gioi`] ?? null;
  }

  private ensureDungeonStats(user: UserProfile) {
    if (!user.dungeonStats) {
      user.dungeonStats = {
        totalClears: 0, attempts: 0, successRate: 0, totalEarned: 0,
        eggsCollected: 0, soulsCollected: 0, ngocLinhCollected: 0
      };
    }
    if (user.dungeonStats.attempts === undefined) user.dungeonStats.attempts = user.dungeonStats.totalClears;
    return user.dungeonStats;
  }

  // Đọc tỷ lệ theo nhiều tên key (config dùng _low/_medium/_high, equipment/equipment_rare)
  private rewardChance(rewards: any, keys: string[]): number {
    for (const k of keys) if (typeof rewards[k] === 'number') return rewards[k];
    return 0;
  }

  // Kiểm tra điều kiện vào ải (KHÔNG tiêu hao item)
  checkDungeonEntry(userId: string, tier: string): { ok: boolean; message?: string } {
    const t = this.getDungeonTier(tier);
    if (!t) return { ok: false, message: 'Cõi không hợp lệ.' };
    const reqs: string[] = t.requirements || [];
    if (reqs.includes('bua_ho_menh') && !this.getItemQuantity(userId, 'dungeonGear', 'bua_ho_menh'))
      return { ok: false, message: 'Cần 1 Bùa Hộ Mệnh để vào Thiên Giới (craft từ 5 Linh Hồn Thấp).' };
    if (reqs.includes('linh_dan_cao_cap') && !this.getItemQuantity(userId, 'dungeonGear', 'linh_dan_cao_cap'))
      return { ok: false, message: 'Cần 1 Linh Đan Cấp Cao để vào Ma Giới (craft từ 10 Linh Hồn Cao).' };
    if (reqs.includes('level_5') && this.getUser(userId).level < 5)
      return { ok: false, message: 'Cần Level 5+ để vào Ma Giới.' };
    return { ok: true };
  }

  // Tiêu hao item vé vào ải (gọi khi trận bắt đầu)
  consumeDungeonEntry(userId: string, tier: string): void {
    const t = this.getDungeonTier(tier);
    if (!t) return;
    const reqs: string[] = t.requirements || [];
    if (reqs.includes('bua_ho_menh')) this.removeItemFromInventory(userId, 'dungeonGear', 'bua_ho_menh', 1);
    if (reqs.includes('linh_dan_cao_cap')) this.removeItemFromInventory(userId, 'dungeonGear', 'linh_dan_cao_cap', 1);
    this.save();
  }

  // Ghi nhận 1 lượt đánh ải (win/lose) để tính tỷ lệ THẬT
  recordDungeonResult(userId: string, won: boolean): void {
    const user = this.getUser(userId);
    const s = this.ensureDungeonStats(user);
    s.attempts = (s.attempts ?? 0) + 1;
    if (won) s.totalClears += 1;
    s.successRate = s.attempts > 0 ? Math.round((s.totalClears / s.attempts) * 100) : 0;
    this.save();
  }

  // Trao thưởng khi CHIẾN THẮNG ải. Trả về danh sách dòng mô tả + tổng V.
  grantDungeonRewards(userId: string, tier: string): { totalV: number; lines: string[] } {
    const user = this.getUser(userId);
    const t = this.getDungeonTier(tier);
    const R = t.rewards;
    const s = this.ensureDungeonStats(user);
    const lines: string[] = [];
    let totalV = 0;

    const vReward = R.v_coin.min + Math.floor(Math.random() * (R.v_coin.max - R.v_coin.min + 1));
    user.balance += vReward; totalV += vReward;
    lines.push(`💰 +${vReward.toLocaleString('vi-VN')} V`);

    const ngoc = R.ngoc_linh.min + Math.floor(Math.random() * (R.ngoc_linh.max - R.ngoc_linh.min + 1));
    if (ngoc > 0) {
      this.addItemToInventory(userId, 'dungeonLoot', 'ngoc_linh', ngoc);
      s.ngocLinhCollected += ngoc;
      lines.push(`💎 +${ngoc} Ngọc Linh`);
    }

    if (Math.random() * 100 < this.rewardChance(R, ['eggs_low', 'eggs_medium', 'eggs_high'])) {
      const eggTypes = ['rong_xanh', 'phuong_hoang', 'ky_lan', 'bach_ho', 'huyen_vu'];
      const egg = eggTypes[Math.floor(Math.random() * eggTypes.length)];
      this.addItemToInventory(userId, 'eggs', `${egg}_egg`, 1);
      s.eggsCollected += 1;
      lines.push(`🥚 +1 Trứng ${egg}`);
    }

    if (Math.random() * 100 < this.rewardChance(R, ['monster_souls_low', 'monster_souls_medium', 'monster_souls_high'])) {
      const soulTypes = ['yeu_tinh', 'tinh_ho_ly', 'ma_rung', 'linh_duong', 'ho_than', 'gau_tinh'];
      const soul = soulTypes[Math.floor(Math.random() * soulTypes.length)];
      this.addItemToInventory(userId, 'monsterItems', `linh_hon_${soul}`, 1);
      s.soulsCollected += 1;
      lines.push(`👻 +1 Linh hồn ${soul}`);
    }

    if (Math.random() * 100 < this.rewardChance(R, ['equipment', 'equipment_rare'])) {
      const gear = ['phu_chu_tre', 'phu_chu_sat', 'phu_chu_bac', 'phu_chu_vang', 'phu_chu_kim_cuong'];
      const g = gear[Math.floor(Math.random() * gear.length)];
      this.addItemToInventory(userId, 'dungeonGear', g, 1);
      lines.push(`⚔️ +1 ${g}`);
    }

    if (Math.random() * 100 < this.rewardChance(R, ['buff_items', 'buff_items_rare'])) {
      this.addItemToInventory(userId, 'dungeonLoot', 'buff_item', 1);
      lines.push(`🌀 +1 Vật phẩm buff`);
    }

    if (typeof R.mystery_chest === 'number' && Math.random() * 100 < R.mystery_chest) {
      this.addItemToInventory(userId, 'misc', 'mystery_chest', 1);
      lines.push(`🎁 +1 Rương Bí Ẩn`);
    }

    if (tier === 'ma' && typeof R.dep_to_ong === 'number' && Math.random() * 100 < R.dep_to_ong) {
      this.addItemToInventory(userId, 'weapons', 'dep_to_ong', 1);
      lines.push(`🏆 +1 DÉP TỔ ONG — THẦN KHÍ SIÊU HIẾM!`);
    }

    s.totalEarned += totalV;
    this.save();
    return { totalV, lines };
  }

}


