# 🏯 VIE — Discord Bot MMORPG Thần Thoại Việt Nam

Bot Discord nhập vai chủ đề thần thoại Việt Nam: kiếm tiền **V**, săn quái, sưu tập **trứng 12 con giáp**, hợp thể thành thần thú, và **đấu ải theo lượt** bằng nút bấm.

> 👉 Không rành kỹ thuật? Xem [HUONG-DAN.md](HUONG-DAN.md) — hướng dẫn từng bước bằng ngôn ngữ dễ hiểu.

---

## ✨ Tính năng

| Hệ thống | Mô tả |
|---|---|
| 💰 **Kinh tế** | `work` / `daily` (chuỗi ngày) / `weekly`, chuyển tiền, cược 50/50, bảng xếp hạng, túi đồ |
| ⚔️ **Săn quái** | 6 loại quái thần thoại, hồi 2 phút, vũ khí & bùa tăng tỷ lệ, nhận linh hồn quái |
| 🐉 **Trứng 12 con giáp** | Mua trứng Tý→Hợi ở shop, **giá tăng lũy tiến** mỗi lần mua. Mỗi con giáp có **1 thế mạnh + 1 điểm yếu** ảnh hưởng thật tới chiến đấu. Đủ 12 → **hợp thể** thành trứng thần thoại |
| 🥚 **Ấp trứng** | Ấp trứng thần thoại thành thần thú, nâng cấp trại để giảm thời gian |
| 🏯 **Đấu ải (theo lượt)** | 3 cõi Nhân/Thiên/Ma. Đánh boss bằng nút **Đánh / Thủ / Né / Potion**, có chí mạng, combo, đòn mạnh bất ngờ |
| 🛒 **Cửa hàng** | Trứng con giáp, binh khí, phù chú, chức nghiệp (role có buff thật) |
| 🎮 **Giải trí** | **Blackjack tương tác** (Rút / Dừng / Nhân đôi), Bầu Cua, Xóc Đĩa |
| 🏰 **Guild** | Lập hội, điểm danh, đóng góp nâng hạng, buff cho cả hội |
| 🎉 **Giveaway** | Hẹn giờ tự kết thúc, **sống sót qua restart**, lọc theo role, nhiều người thắng |
| 🎨 **Tuỳ chỉnh icon** | `/custom` — đổi emoji giao diện bot bằng emoji mặc định hoặc emoji riêng của server |

---

## 🚀 Cài đặt

### Yêu cầu
- **Node.js** 18.17 trở lên ([tải tại đây](https://nodejs.org))
- Một **Discord Bot Token**

### Bước 1 — Cài thư viện
```bash
npm install
```

### Bước 2 — Tạo bot trên Discord
1. Vào [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. Tab **Bot** → **Reset Token** → copy token
3. Vẫn ở tab Bot, bật 3 mục trong **Privileged Gateway Intents**:
   - ✅ **MESSAGE CONTENT INTENT** (bắt buộc — để lệnh `v ...` hoạt động)
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT**
4. Tab **OAuth2 → URL Generator**: tick scope `bot` **và** `applications.commands`, chọn quyền `Administrator` → mở link sinh ra để mời bot vào server

### Bước 3 — Cấu hình
```bash
cp .env.example .env      # Windows: copy .env.example .env
```
Mở `.env`, điền `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `ADMIN_IDS`.

### Bước 4 — Đăng ký lệnh gạch chéo
```bash
npm run register          # đăng ký cho server trong .env — hiện NGAY
```
> Bot được thiết kế dùng riêng cho từng server nên đăng ký theo **guild** để lệnh hiện tức thì.
> Muốn dùng chung cho mọi server: để trống `DISCORD_GUILD_ID` rồi chạy `npm run register:global` (chờ tới ~1 giờ).

### Bước 5 — Chạy bot
```bash
npm run dev                    # phát triển: tự khởi động lại khi sửa code
# hoặc
npm run build && npm start     # chạy thật
```
Thấy dòng `Logged in as ...` là bot đã online.

---

## 📋 Danh sách lệnh

Dùng được cả hai kiểu: **prefix** `v <lệnh>` hoặc **slash** `/<lệnh>`.

### 💰 Kinh tế
| Lệnh | Chức năng |
|---|---|
| `v work` | Làm việc kiếm V (hồi 1 giờ) |
| `v daily` · `v weekly` | Quà ngày (có chuỗi ngày) · quà tuần |
| `v cash` · `v profile [@user]` | Xem ví · hồ sơ (avatar, thanh level & XP, chỉ số) |
| `v give @user <số V>` | Chuyển V cho người khác |
| `v bet <số V>` | Cược may rủi 50/50 |
| `v inv` · `v top` | Túi đồ · bảng xếp hạng giàu có |
| `v quest` | Nhiệm vụ hằng ngày |

### ⚔️ Săn quái & Ấp trứng
| Lệnh | Chức năng |
|---|---|
| `v hunt` | Săn quái (hồi 2 phút) |
| `v hunt equip <vũ_khí>` · `v hunt inv` · `v hunt use <bùa>` | Trang bị · xem đồ · dùng bùa |
| `v hatch` | Xem trại ấp trứng |
| `v hatch place <tên_trứng>` · `v hatch collect` · `v hatch upgrade` | Ấp · thu hoạch · nâng cấp trại |

### 🐉 Trứng 12 con giáp
| Lệnh | Chức năng |
|---|---|
| `v zodiac` | Bộ sưu tập 12 con giáp, chỉ số cộng dồn, nút **Hợp Thể** |
| `v zodiac fuse` | Hợp thể ngay khi đủ 12 con |
| `v shop eggs` → `v buy <id_trứng>` | Xem & mua trứng (giá tăng dần mỗi lần mua) |

### 🏯 Đấu ải
| Lệnh | Chức năng |
|---|---|
| `v dungeon` | Xem 3 cõi ải |
| `v dungeon enter <nhan\|thien\|ma>` | Vào ải — đánh boss theo lượt bằng nút bấm |
| `v dungeon stats` · `v dungeon leaderboard` | Thống kê · BXH chinh phục |

### 🛒 Cửa hàng
`v shop` · `v shop <eggs\|weapons\|dungeon\|roles>` · `v buy <id> [số lượng]` · `v sell <id> [số lượng]`

### 🎮 Giải trí
`v blackjack <số V>` (Rút / Dừng / Nhân đôi) · `v baucua <cửa> <số V>` · `v xocdia <chẵn|lẻ> <số V>`

### 🏰 Guild
`v guild create <tên>` · `add`/`remove @user` · `list` · `daily` · `info` · `donate <số V>` · `bxh` · `inv` · `quest`

### 🎉 Giveaway (Admin hoặc role `Giveaway`)
`v ga <số giờ> <số người thắng> [@role] <phần thưởng>` · `v end <id>` · `v reroll <id>` · `v glist`

### ⚙️ Quản trị (Admin)
| Lệnh | Chức năng |
|---|---|
| `/custom` | **Tuỳ chỉnh icon** giao diện bot (emoji mặc định / emoji server, có phân trang) |
| `/add` · `/remove` · `/resetmoney` | Cộng · trừ · reset tiền người chơi |
| `/ping` · `/status` · `/reset` · `/turnoff` | Kiểm tra & điều khiển bot |
| `v rn <tên>` · `v lock` · `v unlock` · `v clear <số>` | Đổi tên kênh · khoá · mở · xoá tin nhắn |

---

## 🗂️ Cấu trúc dự án

```
VIE/
├── index.ts              # Điểm khởi động bot
├── lib/
│   ├── env.ts            # Đọc & kiểm tra biến môi trường
│   ├── loader.ts         # Nạp lệnh từ modules/
│   ├── ui.ts             # Design system (màu, embed, định dạng V, thanh tiến trình)
│   ├── icons.ts          # Registry icon cho /custom
│   └── zodiac.ts         # Dữ liệu 12 con giáp
├── modules/              # Mỗi file là một nhóm lệnh
│   ├── basic, economy, hunt, hatch, zodiac, dungeon
│   ├── shop, guild, entertainment, giveaway
│   └── custom, manager, control, flash
├── store/store.ts        # Lưu trữ dữ liệu (db.json), ghi atomic chống mất dữ liệu
├── data/
│   ├── db.json           # Dữ liệu người chơi (KHÔNG commit)
│   ├── game_config.json  # Cấu hình quái, trứng, ải, XP
│   └── shop_config.json  # Cấu hình cửa hàng
├── tools/                # Script đăng ký / xoá / kiểm tra lệnh
└── types/command.ts      # Kiểu dữ liệu lệnh
```

---

## 🔧 Các lệnh npm

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy chế độ phát triển (tự reload khi sửa code) |
| `npm run build` · `npm start` | Build rồi chạy bản production |
| `npm run register` | Đăng ký lệnh cho server trong `.env` (**hiện ngay**) |
| `npm run register:global` | Đăng ký cho mọi server (chờ tới ~1 giờ) |
| `npm run verify` | Liệt kê lệnh đang đăng ký |
| `npm run clear` | Xoá toàn bộ lệnh đã đăng ký |

> ⚠️ Không dùng `npm run register-all` — script cũ dùng cấu trúc subcommand không khớp bot hiện tại.

---

## ❓ Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Gõ `/` không thấy lệnh | Chạy `npm run register`. Kiểm tra bot được mời có scope `applications.commands` |
| Lệnh `v ...` không phản hồi | Bật **MESSAGE CONTENT INTENT** trong Developer Portal |
| `'tsx' is not recognized` | Chưa cài thư viện — chạy `npm install` |
| `Invalid environment variables` | Thiếu `DISCORD_TOKEN` hoặc `DISCORD_CLIENT_ID` trong `.env` |
| `Missing Access` khi đăng ký | Mời lại bot bằng link có scope `bot` **và** `applications.commands` |
| Bot báo "đang chạy rồi" | Xoá file `.bot.lock` rồi chạy lại |

---

## 🔒 Bảo mật

- **Không bao giờ** commit `.env` hay chia sẻ `DISCORD_TOKEN`. `.gitignore` đã loại trừ sẵn.
- Lỡ để lộ token: vào Developer Portal → **Reset Token** ngay, rồi cập nhật `.env`.
- `data/db.json` chứa dữ liệu người chơi (ID Discord, số dư) nên cũng không commit.

---

**VIE** — Thần Thoại Việt Nam 🔥
