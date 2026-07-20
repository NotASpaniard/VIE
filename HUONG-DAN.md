# 📖 Hướng Dẫn Sử Dụng Bot VIE

Viết cho người low/non tech. Cứ làm đúng từng bước, không cần hiểu bên trong chạy thế nào.

Tài liệu chia 2 phần:
- **Phần 1 — Dành cho người chơi**: cách chơi trong Discord (không cần cài gì cả)
- **Phần 2 — Dành cho chủ server**: cách cài và bật bot lên

---

# PHẦN 1 — DÀNH CHO NGƯỜI CHƠI

## Bot này là gì?
Là một trò chơi nhập vai chơi ngay trong Discord. Bạn kiếm tiền (gọi là **V**), mua đồ, đi săn quái, sưu tập trứng 12 con giáp và đánh boss.

## Cách gõ lệnh — có 2 kiểu, dùng kiểu nào cũng được

**Kiểu 1 — gõ chữ:** gõ chữ `v`, dấu cách, rồi tên lệnh.
```
v work
```

**Kiểu 2 — gõ gạch chéo:** gõ `/` rồi Discord tự hiện danh sách cho bạn bấm chọn.
```
/work
```

> 💡 Nếu không nhớ lệnh nào, cứ gõ **`v help`** — bot hiện toàn bộ bảng lệnh.

---

## 🏁 Bắt đầu trong 1 phút

Làm lần lượt 3 lệnh này:

| Thứ tự | Gõ | Chuyện gì xảy ra |
|---|---|---|
| 1 | `v daily` | Nhận quà miễn phí hằng ngày (càng nhiều ngày liên tiếp càng nhiều tiền) |
| 2 | `v work` | Đi làm kiếm V. Làm xong phải chờ 1 tiếng mới làm tiếp được |
| 3 | `v profile` | Xem hồ sơ: tiền, cấp độ, thanh kinh nghiệm của bạn |

Vậy là bạn đã có tiền. Giờ tiêu thôi.

---

## 💰 Kiếm tiền bằng cách nào?

| Lệnh | Mô tả | Phải chờ bao lâu mới làm lại |
|---|---|---|
| `v daily` | Quà mỗi ngày | 24 giờ |
| `v weekly` | Quà mỗi tuần (nhiều tiền hơn) | 7 ngày |
| `v work` | Đi làm | 1 tiếng |
| `v hunt` | Săn quái, được tiền + vật phẩm | 2 phút |
| `v dungeon enter nhan` | Đánh boss, thắng được nhiều tiền + đồ hiếm | 5 phút |

> ⏳ "Phải chờ" nghĩa là bot bắt bạn nghỉ giữa 2 lần dùng, để không ai bấm liên tục kiếm tiền vô hạn. Chờ chưa đủ giờ bot sẽ báo còn thiếu bao nhiêu phút.

---

## ⚔️ Đánh boss (phần hay nhất)

Gõ:
```
v dungeon enter nhan
```

Bot hiện thanh máu của bạn và của boss, kèm **4 nút bấm**:

| Nút | Nên bấm khi nào |
|---|---|
| ⚔️ **Đánh** | Muốn gây sát thương mạnh. Đánh trúng liên tiếp sẽ cộng dồn ("combo") càng đau. Nhưng bạn để hở nên boss đánh lại full |
| 🛡️ **Thủ** | Muốn an toàn. Chặn 80% sát thương, đôi khi còn đỡ được hoàn toàn và phản đòn |
| 🏃 **Né** | Ăn may 50/50. Né trúng thì không mất máu và còn đánh trả; né hụt thì ăn đòn nặng hơn bình thường |
| 🧪 **Potion** | Hồi máu (cần có Linh Đan Cấp Cao trong túi) |

**Mẹo:** máu còn nhiều thì cứ Đánh để cộng combo. Máu xuống thấp thì Thủ hoặc uống Potion. Boss thỉnh thoảng bất ngờ tung đòn rất mạnh nên đừng ham đánh khi sắp chết.

Ba cõi từ dễ đến khó: **nhan** (Nhân Giới) → **thien** (Thiên Giới) → **ma** (Ma Giới). Cõi càng khó thưởng càng lớn nhưng cần vật phẩm đặc biệt mới vào được.

---

## 🐉 Trứng 12 con giáp (hệ thống sưu tập)

**Ý tưởng:** mua đủ 12 con giáp (Tý, Sửu, Dần… Hợi) rồi ghép lại thành một con thần thú.

**Cách làm:**

1. Xem có những trứng gì và giá bao nhiêu:
   ```
   v shop eggs
   ```
2. Mua một quả (thay `chuot_egg` bằng mã trứng bạn muốn):
   ```
   v buy chuot_egg
   ```
   > 💸 **Lưu ý quan trọng:** cứ mua thêm một quả thì giá quả sau lại **đắt hơn quả trước**. Nên mua từ từ, đừng dồn hết tiền.

3. Xem đã sưu tập được bao nhiêu:
   ```
   v zodiac
   ```
4. Khi đủ **12/12**, bấm nút **🔮 Hợp Thể** → bạn nhận được một **trứng thần thoại**.

5. Đem trứng thần thoại đi ấp:
   ```
   v hatch place rong_xanh
   ```
   Chờ đủ thời gian rồi thu hoạch:
   ```
   v hatch collect
   ```

**Mỗi con giáp mạnh yếu khác nhau.** Ví dụ con Hổ đánh mạnh nhưng chịu đòn kém, con Trâu nhiều máu nhưng ít may mắn. Bạn giữ trứng nào trong túi thì được cộng chỉ số của con đó khi đi săn / đánh boss. Gõ `v zodiac` để xem chi tiết.

---

## 🛒 Mua sắm

```
v shop              →  xem có những quầy nào
v shop weapons      →  xem vũ khí
v buy kiem_sat      →  mua kiếm sắt
v sell <mã đồ>      →  bán đồ lấy tiền
```

Mua vũ khí xong nhớ **trang bị** thì mới có tác dụng:
```
v hunt equip kiem_sat
```

---

## 🎮 Trò chơi may rủi

```
v blackjack 100     →  chơi bài, bấm nút Rút / Dừng / Nhân đôi
v baucua cua 100    →  bầu cua
v xocdia chẵn 100   →  xóc đĩa
```
> ⚠️ Đây là mini-game giải trí, có thể mất tiền. Đừng nướng hết vốn.

---

## 📌 Bảng lệnh hay dùng nhất

| Muốn làm gì | Gõ |
|---|---|
| Xem toàn bộ lệnh | `v help` |
| Xem tiền & cấp độ | `v profile` |
| Xem túi đồ | `v inv` |
| Xem bảng xếp hạng | `v top` |
| Cho bạn bè tiền | `v give @tên_bạn 100` |

---
---

# PHẦN 2 — DÀNH CHO CHỦ SERVER (cài đặt bot)

> Phần này chỉ làm **một lần duy nhất**. Bạn sẽ phải gõ vài dòng lệnh vào một cửa sổ màu đen — cứ copy y hệt là được.

## Bước 1 — Cài Node.js
Vào https://nodejs.org → tải bản **LTS** → cài như cài phần mềm bình thường (bấm Next liên tục).

## Bước 2 — Tạo bot trên Discord

1. Mở https://discord.com/developers/applications
2. Bấm nút **New Application** (góc trên phải) → đặt tên → **Create**
3. Menu bên trái chọn **Bot**:
   - Bấm **Reset Token** → **Yes, do it** → bấm **Copy**.
     👉 Dán tạm vào Notepad. **Đây là mật khẩu của bot, tuyệt đối không đưa ai.**
   - Kéo xuống mục **Privileged Gateway Intents**, gạt **BẬT** cả 3 công tắc:
     - MESSAGE CONTENT INTENT
     - SERVER MEMBERS INTENT
     - PRESENCE INTENT
   - Bấm **Save Changes**
4. Menu bên trái chọn **General Information** → copy **Application ID** → dán vào Notepad
5. Menu bên trái chọn **OAuth2** → **URL Generator**:
   - Ở ô **SCOPES** tick: `bot` và `applications.commands`
   - Ở ô **BOT PERMISSIONS** tick: `Administrator`
   - Kéo xuống cùng, copy đường link → dán vào trình duyệt → chọn server của bạn → **Authorize**

## Bước 3 — Lấy ID server và ID của bạn

1. Mở Discord → **Cài đặt người dùng** (bánh răng) → **Nâng cao** → bật **Chế độ nhà phát triển**
2. Chuột phải vào **tên server** → **Sao chép ID máy chủ** → dán Notepad
3. Chuột phải vào **avatar của bạn** → **Sao chép ID người dùng** → dán Notepad

## Bước 4 — Điền thông tin vào bot

1. Mở thư mục chứa bot
2. Tìm file tên `.env.example`, **copy** ra một bản, đổi tên bản copy thành `.env`
3. Mở file `.env` bằng Notepad, điền 4 dòng theo Notepad lúc nãy:

```
DISCORD_TOKEN=dán_token_ở_đây
DISCORD_CLIENT_ID=dán_application_id_ở_đây
DISCORD_GUILD_ID=dán_id_server_ở_đây
ADMIN_IDS=dán_id_người_dùng_của_bạn
PREFIX=v
```
4. Lưu lại (Ctrl+S)

## Bước 5 — Bật bot

Mở thư mục bot, gõ `cmd` vào thanh địa chỉ rồi Enter (cửa sổ đen hiện ra). Gõ lần lượt:

```
npm install
```
(chờ vài phút — chỉ cần làm 1 lần)

```
npm run register
```
(đăng ký các lệnh gạch chéo — chạy lại mỗi khi bot được cập nhật)

```
npm run dev
```
(bật bot)

✅ Khi thấy dòng chữ **`Logged in as ...`** là bot đã online. **Đừng tắt cửa sổ đen này** — tắt là bot tắt theo.

Vào Discord gõ thử `v help` để kiểm tra.

---

## 🎨 Đổi biểu tượng (icon) của bot

Bạn là admin nên có thể đổi các icon bot dùng cho hợp phong cách server:

```
v custom
```

- Ô trên: danh sách icon đang dùng và dùng ở đâu
- Menu thả xuống: chọn icon muốn đổi
- Sau đó chọn **🌐 Icon mặc định** (emoji có sẵn) hoặc **🏠 Icon server** (emoji riêng của server bạn)
- Danh sách emoji có nút **◀️ Trang trước / Trang sau ▶️** nếu server nhiều emoji
- Bấm chọn là đổi ngay. Muốn quay lại như cũ thì bấm **Về mặc định**

---

## ❓ Gặp lỗi thì làm gì?

| Hiện tượng | Cách xử lý |
|---|---|
| Gõ `/` không thấy lệnh nào | Chạy lại `npm run register` |
| Gõ `v help` bot im lặng | Chưa bật **MESSAGE CONTENT INTENT** ở Bước 2 |
| Báo `'tsx' is not recognized` | Chưa chạy `npm install` |
| Báo `Invalid environment variables` | File `.env` thiếu token hoặc client ID |
| Báo `Missing Access` | Mời lại bot bằng link ở Bước 2 (phải có `applications.commands`) |
| Báo "Bot đang chạy rồi" | Xoá file `.bot.lock` trong thư mục bot rồi chạy lại |

---

## ⚠️ 3 điều tuyệt đối nhớ

1. **Không đưa token cho ai**, không đăng lên mạng. Lỡ lộ thì vào Developer Portal bấm **Reset Token** ngay rồi sửa lại file `.env`.
2. **Không xoá file `data/db.json`** — đó là toàn bộ tiền và đồ của người chơi. Nên copy dự phòng thỉnh thoảng.
3. Tắt cửa sổ đen = bot tắt. Muốn bot chạy 24/7 thì cần thuê máy chủ (VPS) hoặc dịch vụ hosting.

---

**Chúc bạn chơi vui!** 🔥
