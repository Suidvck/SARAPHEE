# SARAPHEE

เว็บไซต์กีฬาสีคณะสารภี — หน้าเว็บเดียว (single-page) ที่รวมทุกอย่างของทีมสีเขียวไว้ในที่เดียว: ประกาศ ตารางแข่ง อุณหภูมิสนาม เชียร์วอลล์ ฟอร์มสมัครนักกีฬา สรุปคะแนน และเพลงเชียร์

ข้อมูลทุกอย่างบนหน้าเว็บแก้ไขได้จากไฟล์ JSON โดยไม่ต้องแตะโค้ด

## โครงสร้าง

```
SARAPHEE/
├── src/
│   ├── App.tsx              โค้ด React หลัก (ทุก section ของเว็บ)
│   ├── data/
│   │   ├── config.json      ข้อมูลงาน ชนิดกีฬา เพลงเชียร์ คะแนน
│   │   └── texts.json       ข้อความทั้งหมดที่แสดงบนหน้าเว็บ
│   ├── components/icons.tsx ไอคอน SVG
│   ├── utils/cn.ts          ยูทิลิตี้รวม class
│   └── main.tsx / index.css
├── bot.js                   Backend: Express API + Discord bot
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## เริ่มใช้งาน

ติดตั้ง dependencies:

```bash
npm install
```

### 1. ไฟล์ `.env`

คัดลอกค่าใน `DISCORD_SETUP.md` มาสร้าง `.env` ที่ root ของโปรเจกต์ แล้วเติมค่า:

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_CHANNEL_ANNOUNCEMENTS=...
DISCORD_CHANNEL_CHEER_WALL=...
DISCORD_CHANNEL_MATCHES=...
DISCORD_CHANNEL_ROSTER=...
DISCORD_CHANNEL_REGISTRATIONS=...
DISCORD_CHANNEL_SCORES=...
```

ดูขั้นตอนการสร้าง bot และห้อง Discord อย่างละเอียดได้ใน [DISCORD_SETUP.md](DISCORD_SETUP.md)

### 2. รัน Backend (ต้องใช้ในการดึงข้อมูลจาก Discord และตัวนับเชียร์)

```bash
node bot.js
```

Server จะเปิดที่ `http://localhost:3001`

### 3. รันเว็บ (Development)

```bash
npm run dev
```

### Build เวอร์ชันใช้งานจริง

```bash
npm run build
```

## การแก้ไขข้อมูลผ่าน JSON

### `src/data/config.json`

| คีย์ | ไว้แก้ |
|---|---|
| `event` | ชื่องาน ชื่อทีม วันที่ สถานที่ |
| `sports` | รายชื่อกีฬาที่เปิดให้สมัคร |
| `songs` | ชื่อเพลง เนื้อร้อง และท่อนฮุกของแต่ละเพลงเชียร์ |
| `score` | เหรียญทอง/เงิน/ทองแดง อันดับ และจำนวนสีทั้งหมด |

### `src/data/texts.json`

ข้อความทั้งหมดที่แสดงบนหน้าเว็บ เช่น หัวข้อ section ปุ่ม ป้ายสถานะ placeholder แบ่งตามส่วน (`nav`, `hero`, `schedule`, `weather`, `cheerWall`, `register`, `score`, `cheerHub`, `footer`)

## ฟีเจอร์ของเว็บ

- **นับถอยหลัง** ไปจนถึงวันงาน
- **ประกาศ** ดึงจากห้อง Discord (แสดงแบบสลับได้ ถ้า pin จะขึ้นสีแดง urgent)
- **ตารางแข่ง** ดึงจาก Discord แสดงสถานะ LIVE / จบแล้ว / ถัดไป / รอแข่ง อัตโนมัติ
- **อุณหภูมิสนาม** ดึงจาก Open-Meteo พร้อมคำแนะนำ
- **เชียร์วอลล์** เขียนโพสต์อิต ปักตำแหน่งบนบอร์ด แล้วส่งเข้า Discord
- **สมัครนักกีฬา** เลือกเพศ ระดับชั้น และกีฬาได้หลายอย่าง
- **สรุปคะแนน** แสดงเหรียญและอันดับ (อ่านจาก `config.json`)
- **เพลงเชียร์ + ตัวนับพลังเชียร์** กดเชียร์ได้เครื่องละครั้ง ตัวนับแชร์ข้ามเครื่องผ่าน backend

## Discord Slash Commands

คำสั่งทั้งหมดต้องมีสิทธิ์ **Manage Messages**:

- `/announce-add` — เพิ่มประกาศ
- `/match-add` — เพิ่มแมตช์การแข่งขัน
- `/cheer-post` — ปักโพสต์อิต
- `/roster-add` — เพิ่มรายชื่อนักกีฬา
- `/score-update` — อัปเดตคะแนนเฉพาะ field ที่ระบุ
- `/score-edit` — แก้คะแนนทั้งชุดผ่าน modal (JSON)
- `/register-add` — เพิ่มใบสมัครด้วยมือ
