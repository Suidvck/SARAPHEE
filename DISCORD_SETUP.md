# วิธีเชื่อม Discord กับเว็บกีฬาสีสารภี

เว็บนี้ใช้ Discord เป็น "backend" โดยไม่มีฐานข้อมูล แบ่งการเชื่อมเป็น **2 ทาง**:

```
                    ┌─────────────────────────────────────┐
                    │            Discord Server            │
                    │  #announcements  #cheer-wall         │
                    │  #matches        #roster             │
                    │  #registrations                      │
                    └───────▲───────────────────┬──────────┘
        (2) เขียนผ่าน Webhook │                   │ (1) อ่านผ่าน Bot API
                              │                   │
         ┌────────────────────┴───┐      ┌────────▼───────────┐
         │   เว็บ (GitHub Pages)   │◄─────│  bot.js (Node.js)  │
         │   React + Vite          │ JSON │  Express + discord │
         └─────────────────────────┘      └────────────────────┘
```

- **ทางที่ 1 — อ่านข้อมูล (Bot API):** ประกาศ / โพสต์อิต / ตารางแข่ง / รายชื่อ → `bot.js` อ่านข้อความในห้องแล้วส่ง JSON ให้เว็บ
- **ทางที่ 2 — เขียนข้อมูล (Webhook):** ฟอร์มสมัคร + การปักโพสต์อิต → เว็บยิงตรงเข้า Discord Webhook (ไม่ต้องมี server)

> ถ้าต้องการแค่ "ส่งข้อมูลเข้า Discord" (สมัคร/เชียร์) ทำแค่ **ทางที่ 2** ก็พอ — ไม่ต้องรัน bot.js เลย

---

## ทางที่ 2 (ง่ายสุด) — เชื่อมด้วย Webhook

ใช้ได้ทันทีบน GitHub Pages โดยไม่ต้องมีเซิร์ฟเวอร์

1. เปิด Discord → คลิกขวาห้อง `#cheer-wall` → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**
2. ตั้งชื่อ เช่น `Cheer Wall` แล้วกด **Copy Webhook URL**
3. ทำแบบเดียวกันกับห้อง `#registrations` เพื่อได้อีก 1 URL
4. เปิดไฟล์ `src/App.tsx` แล้ววางทับ 2 บรรทัดนี้ (อยู่ใกล้ต้นไฟล์):

```ts
const CHEER_WEBHOOK_URL = "https://discord.com/api/webhooks/xxxx/yyyy";
const REGISTER_WEBHOOK_URL = "https://discord.com/api/webhooks/aaaa/bbbb";
```

5. build แล้ว deploy — พอมีคนกด "ปักลงบอร์ด" หรือ "ส่งใบสมัคร" ข้อความจะเด้งเข้าห้อง Discord ทันที

**อนุมัติใบสมัคร:** ทีมงานกด reaction ✅ / ❌ ใต้ข้อความในห้อง `#registrations` ได้เลย

---

## ทางที่ 1 — เชื่อมด้วย Bot API (ให้เว็บอ่านข้อมูลกลับมาแสดง)

จำเป็นเมื่ออยากให้ประกาศ/ตารางแข่ง/โพสต์อิต "โหลดจาก Discord" มาแสดงบนเว็บ

### 1) สร้างบอท
1. ไปที่ https://discord.com/developers/applications → **New Application**
2. เมนู **Bot** → **Reset Token** → คัดลอกโทเคน (เก็บเป็นความลับ)
3. ในหน้า Bot เปิดสวิตช์ **MESSAGE CONTENT INTENT** ให้ ON
4. เมนู **OAuth2 → URL Generator** → ติ๊ก `bot` + สิทธิ์ `Read Messages/View Channels` และ `Read Message History` → เปิดลิงก์ที่ได้เพื่อเชิญบอทเข้าเซิร์ฟเวอร์

### 2) เอา ID ต่างๆ
- เปิด Discord → **User Settings → Advanced → Developer Mode** = ON
- คลิกขวา **ชื่อเซิร์ฟเวอร์** → Copy Server ID
- คลิกขวาแต่ละ **ห้อง** → Copy Channel ID

### 3) ตั้งค่าและรัน bot.js
```bash
cp .env.example .env      # แล้วเติมค่า token / id ต่างๆ
npm install express cors discord.js dotenv
node bot.js
```
เปิด `http://localhost:3001/api/health` ควรเห็น `{ "ok": true, "ready": true }`

Endpoint ที่ได้:
| URL | คืนค่า |
|-----|--------|
| `/api/announcements` | ประกาศจากห้อง #announcements |
| `/api/cheer-wall` | โพสต์อิตทั้งหมด (อ่าน JSON ในข้อความ) |
| `/api/matches` | ตารางแข่ง |
| `/api/roster` | รายชื่อนักกีฬา |

### 4) ให้เว็บเรียก API
เว็บ (GitHub Pages) กับ bot ต้องอยู่คนละที่ ให้ deploy bot ขึ้นโฮสต์ที่รัน Node ได้ (Render / Railway / Fly.io / VPS) แล้วนำ URL สาธารณะมาตั้งเป็นฐานของ API เช่น `https://sarapee-bot.onrender.com`

จากนั้นในเว็บให้ `fetch` ข้อมูลจริงแทน seed เช่น:
```ts
const API = "https://sarapee-bot.onrender.com";
const res = await fetch(`${API}/api/announcements`);
const data = await res.json();
```

> **สำคัญ:** อย่านำ BOT TOKEN ใส่ในโค้ดฝั่งเว็บเด็ดขาด โทเคนต้องอยู่ใน `.env` ของ bot server เท่านั้น เพราะโค้ดฝั่งเว็บทุกคนเปิดดูได้

---

## สรุปสั้นๆ
- อยากส่งข้อมูล "เข้า" Discord อย่างเดียว → ใช้ **Webhook** (ทางที่ 2) พอ ง่ายและฟรี
- อยากให้เว็บ "ดึงข้อมูลกลับ" มาแสดง → ต้องรัน **bot.js** (ทางที่ 1) บนโฮสต์ Node
