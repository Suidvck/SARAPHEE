# วิธีเชื่อมต่อ Render.com + Supabase + Discord Bot (ระบบสารภี)

ระบบนี้เปลี่ยนสถาปัตยกรรมใหม่ทั้งหมด:
- 🌐 **Backend:** รัน Express API บน **Render.com** (ฟรี และเปิดออนไลน์ตลอด)
- 🗄️ **Database:** ใช้ **Supabase (PostgreSQL)** เป็นฐานข้อมูลหลักสำหรับทุกข้อมูล (ไม่ใช่ Discord)
- 🤖 **Discord Bot:** ใช้สำหรับ **ตั้งค่า/จัดการข้อมูลใน Supabase (Config Data)** ผ่านคำสั่ง Slash Commands และส่งแจ้งเตือนเข้าห้อง Discord

```
       ┌───────────────────────────────┐
       │   Discord Slash Commands      │
       │   (/announce-add, /score...)  │
       └──────────────┬────────────────┘
                      │
                      ▼
   ┌─────────────────────────────────────┐
   │         Backend บน Render.com       │
   │           (Node.js / Express)       │
   └──────▲───────────────────────┬──────┘
          │ REST API              │ Read/Write
          │ (JSON)                ▼
┌─────────┴─────────┐     ┌───────────────────────┐
│ เว็บไซต์ (React)   │     │  Supabase Database    │
│  GitHub Pages     │     │ (PostgreSQL Tables)   │
└───────────────────┘     └───────────────────────┘
```

---

## ขั้นตอนที่ 1: ตั้งค่า Supabase (Database)

1. เข้าเว็บ [https://supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่ (ฟรี)
2. เมื่อโปรเจกต์พร้อม ให้ไปที่เมนู **SQL Editor** ด้านซ้าย
3. เปิดไฟล์ [`supabase_schema.sql`](supabase_schema.sql) ในโปรเจกต์นี้ คัดลอกโค้ดทั้งหมดแล้วนำไปวางใน SQL Editor แล้วกด **Run**
   - จะสร้างตาราง: `announcements`, `matches`, `cheer_wall`, `scores`, `registrations`, `roster`, `cheer_counter`, `cheer_devices` พร้อมตั้งค่านโยบายความปลอดภัยให้เสร็จสรรพ
4. ไปที่เมนู **Project Settings** (รูปฟันเฟือง) -> **API**:
   - คัดลอก **Project URL** (เช่น `https://xyzcompany.supabase.co`) -> คือ `SUPABASE_URL`
   - คัดลอก **service_role secret key** (หรือ `anon public key`) -> คือ `SUPABASE_KEY`

---

## ขั้นตอนที่ 2: ตั้งค่า Discord Bot

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications) -> กด **New Application**
2. ไปที่แท็บ **Bot**:
   - กด **Reset Token** -> คัดลอกโทเคนเก็บไว้ -> คือ `DISCORD_BOT_TOKEN`
   - เปิด **MESSAGE CONTENT INTENT** ให้เป็น **ON**
3. ไปที่แท็บ **OAuth2 -> URL Generator**:
   - ใน Scopes ติ๊ก: `bot` และ `applications.commands`
   - ใน Bot Permissions ติ๊ก: `Send Messages`, `Embed Links`, `Manage Messages`, `Read Message History`
   - คัดลอก URL ด้านล่างแล้วเปิดในเบราว์เซอร์เพื่อเชิญบอทเข้า Discord Server ของคุณ
4. เปิด Discord แล้วคลิกขวาที่ชื่อเซิร์ฟเวอร์ -> **Copy Server ID** -> คือ `DISCORD_GUILD_ID`

*(ตัวเลือกเพิ่มเติม: หากต้องการให้บอทแจ้งเตือนเข้าห้องไหน ให้คลิกขวาห้องนั้นแล้วก๊อปปี้ Channel ID ใส่ในตัวแปร `DISCORD_CHANNEL_...`)*

---

## ขั้นตอนที่ 3: Deploy Backend ขึ้น Render.com

1. นำโค้ดโปรเจกต์นี้ขึ้น GitHub Repository ของคุณ
2. เข้า [https://render.com](https://render.com) แล้วกด **New +** -> **Web Service**
3. เลือก Repository ของคุณ
4. ตั้งค่าดังนี้:
   - **Name:** `saraphee-backend` (หรือชื่อที่ต้องการ)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node bot.js`
   - **Plan:** `Free`
5. ในส่วน **Environment Variables** ให้เพิ่มตัวแปรเหล่านี้:
   | Key | Value ตัวอย่าง | คำอธิบาย |
   |---|---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` | URL ของ Supabase |
   | `SUPABASE_KEY` | `eyJhbGciOi...` | service_role key หรือ anon key |
   | `DISCORD_BOT_TOKEN` | `MTI...` | Bot Token จาก Discord |
   | `DISCORD_GUILD_ID` | `123456789012345678` | ID เซิร์ฟเวอร์ Discord |
   | `PORT` | `3001` | Render จะจัดการให้อัตโนมัติ |
6. กด **Create Web Service**
   - เมื่อ Deploy เสร็จ คุณจะได้ URL สาธารณะ เช่น: `https://saraphee-backend.onrender.com`
   - ทดสอบเปิด `https://saraphee-backend.onrender.com/api/health` ในเบราว์เซอร์ จะเห็นสถานะ `ok: true`, `supabase_connected: true`

---

## ขั้นตอนที่ 4: เชื่อมเว็บเข้ากับ Render Backend

1. เปิดไฟล์ `src/data/config.json`:
   ```json
   "api": {
     "baseUrl": "https://saraphee-backend.onrender.com"
   }
   ```
   หรือตั้งค่าตัวแปรใน `.env` ตอน build:
   ```env
   VITE_API_BASE_URL=https://saraphee-backend.onrender.com
   ```
2. สั่ง build เว็บ:
   ```bash
   npm run build
   ```

---

## 🛠️ รายการคำสั่ง Discord สำหรับจัดการข้อมูลใน Supabase (Config Data)

บอทมีคำสั่ง Slash Commands ครบวงจรสำหรับจัดการข้อมูลทุกอย่างใน Supabase:

### 📢 จัดการประกาศ (Announcements)
- `/announce-add title detail [urgent]` — เพิ่มประกาศใหม่ลง Supabase (เลือกได้ว่าปักหมุดด่วนหรือไม่)
- `/announce-list` — ดูรายการประกาศล่าสุด พร้อม ID
- `/announce-delete id` — ลบประกาศออกจาก Supabase
- `/announce-pin id urgent` — ปักหมุด / ปลดหมุดประกาศ

### 🏆 จัดการตารางแข่ง (Matches)
- `/match-add sport time [category] [vs] [venue]` — เพิ่มแมตช์ลงตารางแข่งใน Supabase
- `/match-list` — ดูรายการแมตช์แข่งขันทั้งหมด พร้อม ID
- `/match-delete id` — ลบแมตช์ออกจาก Supabase

### 📊 จัดการคะแนน (Scores)
- `/score-update [gold] [silver] [bronze] [total] [goal] [rank] [colors] [cheer]` — แก้ไขคะแนนเฉพาะช่องที่ต้องการ
- `/score-edit` — เปิดหน้าต่าง Modal แก้ไขคะแนนทั้งหมดผ่าน JSON สะดวกและรวดเร็ว
- `/score-view` — ดูคะแนนสรุปปัจจุบันจาก Supabase

### 🏃 จัดการรายชื่อนักกีฬา (Roster)
- `/roster-add name [sport] [note]` — เพิ่มนักกีฬาเข้าทำเนียบ
- `/roster-list [sport]` — ดูรายชื่อนักกีฬา
- `/roster-delete id` — ลบนักกีฬา

### 📋 จัดการใบสมัคร (Registrations)
- `/register-list` — ดูใบสมัครที่ส่งมาจากหน้าเว็บ
- `/register-status id status` — อนุมัติ (`approved`) หรือปฏิเสธ (`rejected`) ใบสมัคร

### 📌 จัดการเชียร์วอลล์ (Cheer Wall)
- `/cheer-post message [color]` — แปะโพสต์อิตลงเชียร์วอลล์
- `/cheer-list` — ดูรายการโพสต์อิต
- `/cheer-delete id` — ลบโพสต์อิตที่ไม่เหมาะสม

### 📣 จัดการพลังเชียร์ & สถานะระบบ
- `/cheer-set count` — ตั้งค่าจำนวนพลังเชียร์
- `/cheer-reset` — รีเซ็ตพลังเชียร์และประวัติอุปกรณ์
- `/db-status` — ตรวจสอบการเชื่อมต่อ Supabase, Render Backend และจำนวนข้อมูลทุกตาราง
