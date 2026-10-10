# SARAPHEE

เว็บไซต์กีฬาสีคณะสารภี — หน้าเว็บเดียว (single-page) ที่รวมทุกอย่างของทีมสีเขียวไว้ในที่เดียว: ประกาศ ตารางแข่ง อุณหภูมิสนาม เชียร์วอลล์ ฟอร์มสมัครนักกีฬา สรุปคะแนน และเพลงเชียร์

---

## สถาปัตยกรรมระบบ (Architecture)

- 🌐 **Backend:** รัน Express API บน **Render.com** (มี `render.yaml` พร้อม Deploy ทันที)
- 🗄️ **Database:** ใช้ **Supabase (PostgreSQL)** เป็นฐานข้อมูลหลักสำหรับข้อมูลทุกอย่าง (ไม่ใช้ Discord เป็นฐานข้อมูล)
- 🤖 **Discord Bot:** ใช้สำหรับ **จัดการและตั้งค่าข้อมูล (Config Data)** ใน Supabase ผ่าน Slash Commands พร้อมส่งแจ้งเตือนเข้าเซิร์ฟเวอร์ Discord
- 💻 **Frontend:** React 19 + Vite + Tailwind CSS (Deploy บน GitHub Pages หรือ Vercel ได้ทันที)

---

## โครงสร้างโปรเจกต์

```
SARAPHEE/
├── src/
│   ├── App.tsx              โค้ด React หลัก (ทุก section เชื่อมต่อ API อัตโนมัติ)
│   ├── data/
│   │   ├── config.json      ข้อมูลงาน ชนิดกีฬา เพลงเชียร์ คะแนนสำรอง
│   │   └── texts.json       ข้อความทั้งหมดที่แสดงบนหน้าเว็บ
│   ├── components/icons.tsx ไอคอน SVG
│   ├── utils/cn.ts          ยูทิลิตี้รวม class
│   └── main.tsx / index.css
├── bot.js                   Backend: Express API + Supabase Client + Discord Bot
├── supabase_schema.sql      SQL Schema สำหรับรันใน Supabase (สร้างตารางครบใน 1 คลิก)
├── render.yaml              ไฟล์ Render Blueprint สำหรับ Deploy Backend อัตโนมัติ
├── .env.example             ตัวอย่างการตั้งค่า Environment Variables
├── DISCORD_SETUP.md         คู่มือการตั้งค่า Supabase, Render.com และ Discord Bot แบบละเอียด
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## เริ่มต้นใช้งาน

### 1. ตั้งค่าฐานข้อมูล Supabase
1. เข้าไปที่ [Supabase](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่
2. ไปที่เมนู **SQL Editor** -> นำโค้ดจาก [`supabase_schema.sql`](supabase_schema.sql) ไปวางแล้วกด **Run**
3. ไปที่ **Project Settings -> API** เพื่อคัดลอก `Project URL` และ `service_role secret key` (หรือ `anon key`)

### 2. ตั้งค่าไฟล์ `.env`
คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจริง:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-server-id
```

### 3. รัน Backend ในเครื่อง (Local)
```bash
npm install
node bot.js
# หรือ
npm run start
```
Server จะเปิดที่ `http://localhost:3001` (ตรวจสอบสถานะได้ที่ `http://localhost:3001/api/health`)

### 4. รัน Frontend (Development)
```bash
npm run dev
```

### 5. Build เว็บไซต์สำหรับขึ้นจริง
```bash
npm run build
```

---

## การ Deploy ใช้งานจริง (ฟรี 100%)

### 1. Backend บน Render.com
1. อัปโหลดโค้ดขึ้น GitHub
2. เข้าไปที่ [Render.com](https://render.com) -> **New +** -> **Web Service** -> เลือก Repository นี้
3. หรือใช้ **Blueprint** ผ่านไฟล์ `render.yaml`
4. ตั้งค่า Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
5. เมื่อ Deploy เสร็จจะได้ URL เช่น `https://saraphee-backend.onrender.com`

### 2. Frontend บน GitHub Pages
1. นำ URL ของ Render Backend ไปใส่ใน `src/data/config.json`:
   ```json
   "api": {
     "baseUrl": "https://saraphee-backend.onrender.com"
   }
   ```
   (หรือใส่ `VITE_API_BASE_URL` ใน GitHub Secrets)
2. Push โค้ดขึ้น GitHub -> ไปที่แท็บ **Settings -> Pages** -> เลือก Source เป็น **GitHub Actions**
3. GitHub Actions จะ build และ deploy ให้โดยอัตโนมัติ

---

## คำสั่ง Discord Slash Commands (Config Data ใน Supabase)

ทีมงานสามารถจัดการข้อมูลทั้งหมดใน Supabase ได้ผ่าน Discord โดยตรง:

| คำสั่ง | การทำงาน |
|---|---|
| `/announce-add` | เพิ่มประกาศใหม่ลง Supabase (เลือกปักหมุดด่วนได้) |
| `/announce-list` | ดูประกาศล่าสุดพร้อม ID ใน Supabase |
| `/announce-delete` | ลบประกาศออกจาก Supabase ตาม ID |
| `/announce-pin` | ปักหมุด / ปลดหมุดประกาศ |
| `/match-add` | เพิ่มแมตช์การแข่งขันลงตารางแข่งใน Supabase |
| `/match-list` | ดูตารางแข่งทั้งหมดจาก Supabase |
| `/match-delete` | ลบแมตช์แข่งออกจาก Supabase ตาม ID |
| `/score-update` | อัปเดตเหรียญ/อันดับ/คะแนนรวมใน Supabase |
| `/score-edit` | แก้ไขข้อมูลคะแนนทั้งหมดผ่านหน้าต่าง JSON สะดวกรวดเร็ว |
| `/score-view` | ดูคะแนนปัจจุบันจาก Supabase |
| `/roster-add` | เพิ่มนักกีฬาเข้ารายชื่อใน Supabase |
| `/roster-list` | ดูรายชื่อนักกีฬาจาก Supabase |
| `/roster-delete` | ลบนักกีฬาตาม ID |
| `/register-list` | ดูใบสมัครนักกีฬาที่ส่งมาจากหน้าเว็บ |
| `/register-status` | ปรับสถานะใบสมัคร (อนุมัติ / ปฏิเสธ) |
| `/cheer-post` | ปักโพสต์อิตลงเชียร์วอลล์ใน Supabase |
| `/cheer-list` | ดูข้อความโพสต์อิตล่าสุด |
| `/cheer-delete` | ลบโพสต์อิตตาม ID |
| `/cheer-set` | ตั้งค่าตัวเลขตัวนับพลังเชียร์ |
| `/cheer-reset` | รีเซ็ตพลังเชียร์และประวัติอุปกรณ์ |
| `/db-status` | ตรวจสอบสถานะการเชื่อมต่อ Supabase และจำนวนข้อมูลแต่ละตาราง |

อ่านรายละเอียดการตั้งค่า Discord และบอททั้งหมดได้ที่ [DISCORD_SETUP.md](DISCORD_SETUP.md)
