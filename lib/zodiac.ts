// ============================================================
//  12 con giáp — trứng mua ở shop, hợp thể thành thần thoại.
//  Mỗi con có 1 thế mạnh (buff) + 1 điểm yếu (weak).
// ============================================================
export type ZodiacStat = 'atk' | 'hp' | 'hunt' | 'def' | 'luck';

export const STAT_LABEL: Record<ZodiacStat, string> = {
  atk: 'Sát thương ải',
  hp: 'Máu ải',
  hunt: 'Tỷ lệ săn',
  def: 'Giáp ải',
  luck: 'Chí mạng'
};

export type Zodiac = {
  id: string;        // chuot, trau, ...
  egg: string;       // chuot_egg
  chi: string;       // Tý
  animal: string;    // Chuột
  emoji: string;
  basePrice: number;
  buff: { stat: ZodiacStat; val: number };
  weak: { stat: ZodiacStat; val: number };
};

export const ZODIAC: Zodiac[] = [
  { id: 'chuot', egg: 'chuot_egg', chi: 'Tý', animal: 'Chuột', emoji: '🐭', basePrice: 400, buff: { stat: 'luck', val: 5 }, weak: { stat: 'hp', val: 10 } },
  { id: 'trau', egg: 'trau_egg', chi: 'Sửu', animal: 'Trâu', emoji: '🐃', basePrice: 400, buff: { stat: 'hp', val: 30 }, weak: { stat: 'luck', val: 3 } },
  { id: 'ho', egg: 'ho_egg', chi: 'Dần', animal: 'Hổ', emoji: '🐅', basePrice: 550, buff: { stat: 'atk', val: 6 }, weak: { stat: 'def', val: 5 } },
  { id: 'meo', egg: 'meo_egg', chi: 'Mão', animal: 'Mèo', emoji: '🐈', basePrice: 450, buff: { stat: 'def', val: 6 }, weak: { stat: 'hp', val: 12 } },
  { id: 'rong', egg: 'rong_egg', chi: 'Thìn', animal: 'Rồng', emoji: '🐉', basePrice: 800, buff: { stat: 'atk', val: 8 }, weak: { stat: 'hunt', val: 6 } },
  { id: 'ran', egg: 'ran_egg', chi: 'Tỵ', animal: 'Rắn', emoji: '🐍', basePrice: 550, buff: { stat: 'luck', val: 7 }, weak: { stat: 'hp', val: 12 } },
  { id: 'ngua', egg: 'ngua_egg', chi: 'Ngọ', animal: 'Ngựa', emoji: '🐎', basePrice: 550, buff: { stat: 'hunt', val: 8 }, weak: { stat: 'def', val: 4 } },
  { id: 'de', egg: 'de_egg', chi: 'Mùi', animal: 'Dê', emoji: '🐐', basePrice: 400, buff: { stat: 'hp', val: 20 }, weak: { stat: 'atk', val: 3 } },
  { id: 'khi', egg: 'khi_egg', chi: 'Thân', animal: 'Khỉ', emoji: '🐒', basePrice: 500, buff: { stat: 'hunt', val: 6 }, weak: { stat: 'hp', val: 10 } },
  { id: 'ga', egg: 'ga_egg', chi: 'Dậu', animal: 'Gà', emoji: '🐓', basePrice: 400, buff: { stat: 'def', val: 5 }, weak: { stat: 'atk', val: 3 } },
  { id: 'cho', egg: 'cho_egg', chi: 'Tuất', animal: 'Chó', emoji: '🐕', basePrice: 450, buff: { stat: 'hp', val: 25 }, weak: { stat: 'luck', val: 2 } },
  { id: 'lon', egg: 'lon_egg', chi: 'Hợi', animal: 'Lợn', emoji: '🐖', basePrice: 400, buff: { stat: 'hp', val: 22 }, weak: { stat: 'hunt', val: 4 } }
];

export const ZODIAC_BY_EGG: Record<string, Zodiac> = Object.fromEntries(ZODIAC.map((z) => [z.egg, z]));
export const ZODIAC_EGG_IDS = ZODIAC.map((z) => z.egg);
export const MYTHICAL_EGGS = ['rong_xanh_egg', 'phuong_hoang_egg', 'ky_lan_egg', 'bach_ho_egg', 'huyen_vu_egg'];

export type ZodiacBonuses = Record<ZodiacStat, number>;

// Cộng dồn buff/weak từ số trứng con giáp đang sở hữu
export function zodiacBonusesFromEggs(eggs: Record<string, number>): ZodiacBonuses {
  const b: ZodiacBonuses = { atk: 0, hp: 0, hunt: 0, def: 0, luck: 0 };
  for (const z of ZODIAC) {
    const qty = eggs[z.egg] || 0;
    if (qty > 0) {
      b[z.buff.stat] += z.buff.val * qty;
      b[z.weak.stat] -= z.weak.val * qty;
    }
  }
  return b;
}

export function zodiacLine(z: Zodiac): string {
  return `${z.emoji} **${z.chi} (${z.animal})** · \`${z.egg}\`\n` +
    `▸ Mạnh: +${z.buff.val} ${STAT_LABEL[z.buff.stat]} · Yếu: −${z.weak.val} ${STAT_LABEL[z.weak.stat]}`;
}
