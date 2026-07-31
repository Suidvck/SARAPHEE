import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHEER_STATE_FILE = path.join(__dirname, "cheer-state.json");

let cheerState = { count: 0, devices: [] };

function loadCheerState() {
  try {
    if (fs.existsSync(CHEER_STATE_FILE)) {
      cheerState = { count: 0, devices: [], ...JSON.parse(fs.readFileSync(CHEER_STATE_FILE, "utf8")) };
    }
  } catch {
  }
}

function saveCheerState() {
  try {
    fs.writeFileSync(CHEER_STATE_FILE, JSON.stringify(cheerState, null, 2));
  } catch {
  }
}

loadCheerState();

const app = express();
const port = process.env.PORT || 3001;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const channels = {
  announcements: process.env.DISCORD_CHANNEL_ANNOUNCEMENTS,
  cheerWall: process.env.DISCORD_CHANNEL_CHEER_WALL,
  matches: process.env.DISCORD_CHANNEL_MATCHES,
  roster: process.env.DISCORD_CHANNEL_ROSTER,
  registrations: process.env.DISCORD_CHANNEL_REGISTRATIONS,
  scores: process.env.DISCORD_CHANNEL_SCORES,
};

app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

async function getChannelMessages(channelId, limit = 50) {
  if (!channelId) return [];
  const channel = await client.channels.fetch(channelId, { cache: false });
  if (!channel || !channel.isTextBased()) return [];
  const messages = await channel.messages.fetch({ limit, cache: false });
  return [...messages.values()];
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseEmbedData(message) {
  const e = message.embeds?.[0];
  if (!e) return null;
  const data = { _embed: true };
  if (e.title) data.title = e.title;
  if (e.description) data.description = e.description;
  if (e.fields) for (const f of e.fields) data[f.name] = f.value;
  return data;
}

function parseMessageData(message) {
  return parseEmbedData(message) || tryParseJson(message.content);
}

function normalizeMatch(data) {
  const d = { ...(data || {}) };
  d.sport = d.sport ?? d["กีฬา"];
  d.time = d.time ?? d["เวลา"];
  d.vs = d.vs ?? d["คู่แข่ง"] ?? d["พบ"];
  d.venue = d.venue ?? d["สนาม"] ?? d["สถานที่"];
  d.category = d.category ?? d["ประเภท"] ?? d["หมวดหมู่"];
  return d;
}

async function sendToChannel(channelId, content) {
  if (!channelId) throw new Error("channel_id_not_set");
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error("channel_not_found");
  return channel.send(content);
}

async function getLatestScoreMessage() {
  const messages = await getChannelMessages(channels.scores, 20);
  return messages
    .filter((m) => parseMessageData(m))
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0] ?? null;
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("announce-add")
      .setDescription("เพิ่มประกาศ (โพสต์เข้า #announcements)")
      .addStringOption((o) => o.setName("title").setDescription("หัวข้อประกาศ").setRequired(true))
      .addStringOption((o) => o.setName("detail").setDescription("รายละเอียดประกาศ").setRequired(true))
      .addBooleanOption((o) => o.setName("urgent").setDescription("ปักหมุดให้ขึ้นเป็นประกาศด่วน")),
    new SlashCommandBuilder()
      .setName("match-add")
      .setDescription("เพิ่มแมตช์ลงตาราง (โพสต์เข้า #matches)")
      .addStringOption((o) => o.setName("sport").setDescription("กีฬา เช่น ฟุตบอล").setRequired(true))
      .addStringOption((o) => o.setName("time").setDescription("เวลาเริ่ม เช่น 09:00").setRequired(true))
      .addStringOption((o) => o.setName("category").setDescription("ประเภท เช่น ชาย มต้น มปลาย"))
      .addStringOption((o) => o.setName("vs").setDescription("คู่แข่ง เช่น สีฟ้า"))
      .addStringOption((o) => o.setName("venue").setDescription("สนาม เช่น สนามใหญ่")),
    new SlashCommandBuilder()
      .setName("cheer-post")
      .setDescription("ปักโพสต์อิตบนเชียร์วอลล์ (โพสต์เข้า #cheer-wall)")
      .addStringOption((o) => o.setName("message").setDescription("ข้อความเชียร์").setRequired(true))
      .addStringOption((o) =>
        o
          .setName("color")
          .setDescription("สีกระดาษ")
          .addChoices(
            { name: "เขียวเนออน", value: "neon" },
            { name: "เขียวพาสเทล", value: "mint" },
            { name: "ดำขอบเขียว", value: "ink" },
            { name: "เลมอน", value: "lemon" }
          )),
    new SlashCommandBuilder()
      .setName("roster-add")
      .setDescription("เพิ่มนักกีฬาเข้ารายชื่อ (โพสต์เข้า #roster)")
      .addStringOption((o) => o.setName("name").setDescription("ชื่อ–นามสกุล").setRequired(true))
      .addStringOption((o) => o.setName("sport").setDescription("กีฬา"))
      .addStringOption((o) => o.setName("note").setDescription("หมายเหตุ เช่น ห้อง/รหัสนักศึกษา")),
    new SlashCommandBuilder()
      .setName("score-update")
      .setDescription("อัปเดตคะแนนสี (โพสต์เข้า #scores)")
      .addStringOption((o) => o.setName("gold").setDescription("เหรียญทอง"))
      .addStringOption((o) => o.setName("silver").setDescription("เหรียญเงิน"))
      .addStringOption((o) => o.setName("bronze").setDescription("เหรียญทองแดง"))
      .addStringOption((o) => o.setName("total").setDescription("คะแนนรวม"))
      .addStringOption((o) => o.setName("goal").setDescription("เป้าหมายคะแนน"))
      .addStringOption((o) => o.setName("rank").setDescription("อันดับปัจจุบัน"))
      .addStringOption((o) => o.setName("colors").setDescription("จำนวนสี"))
      .addStringOption((o) => o.setName("cheer").setDescription("จำนวนกองเชียร์")),
    new SlashCommandBuilder()
      .setName("score-edit")
      .setDescription("แก้คะแนนทั้งหมดผ่าน JSON (ข้อมูลทุกช่องรวมในหน้าต่างเดียว)"),
    new SlashCommandBuilder()
      .setName("register-add")
      .setDescription("เพิ่มใบสมัครนักกีฬา (โพสต์เข้า #registrations)")
      .addStringOption((o) => o.setName("name").setDescription("ชื่อ–นามสกุล").setRequired(true))
      .addStringOption((o) => o.setName("sport").setDescription("กีฬา").setRequired(true))
      .addStringOption((o) =>
        o.setName("gender").setDescription("เพศ").addChoices(
          { name: "ชาย", value: "ชาย" },
          { name: "หญิง", value: "หญิง" }
        ))
      .addStringOption((o) =>
        o.setName("level").setDescription("ระดับชั้น").addChoices(
          { name: "ม.ต้น", value: "ม.ต้น" },
          { name: "ม.ปลาย", value: "ม.ปลาย" }
        )),
  ];
  const target = guildId ? client.guilds.cache.get(guildId) : null;
  if (target) {
    await target.commands.set(commands);
  } else {
    await client.application?.commands.set(commands);
  }
  console.log(`Registered ${commands.length} slash command(s)`);
}

function friendlyError(error) {
  const msg = String(error);
  if (msg.includes("channel_id_not_set")) return "ยังไม่ได้ตั้งค่า channel ID ในไฟล์ .env (ต้องเติม DISCORD_CHANNEL_...)";
  if (msg.includes("channel_not_found")) return "หาห้องใน Discord ไม่เจอ ตรวจสอบ channel ID ใน .env";
  return msg;
}

const matchLabel = (sport, category, vs) => `${sport}${category ? ` (${category})` : ""}${vs ? ` พบ ${vs}` : ""}`;

const COMMAND_HANDLERS = {
  "announce-add": async (interaction) => {
    const title = interaction.options.getString("title", true);
    const detail = interaction.options.getString("detail", true);
    const urgent = interaction.options.getBoolean("urgent") ?? false;
    const message = await sendToChannel(channels.announcements, {
      embeds: [{
        title,
        description: detail,
        color: urgent ? 0xd63031 : 0x199c4a,
        timestamp: new Date().toISOString(),
      }],
    });
    let pinned = false;
    if (urgent) {
      try {
        await message.pin();
        pinned = true;
      } catch {
      }
    }
    await interaction.editReply(`เพิ่มประกาศแล้ว: ${title}${pinned ? " (ปักหมุดแล้ว)" : urgent ? " (ปักหมุดไม่สำเร็จ ตรวจสอบสิทธิ์)" : ""}`);
  },

  "match-add": async (interaction) => {
    const sport = interaction.options.getString("sport", true);
    const time = interaction.options.getString("time", true);
    const category = interaction.options.getString("category");
    const vs = interaction.options.getString("vs");
    const venue = interaction.options.getString("venue");
    const fields = [
      { name: "กีฬา", value: sport, inline: true },
      { name: "เวลา", value: time, inline: true },
    ];
    if (category) fields.push({ name: "ประเภท", value: category, inline: true });
    if (vs) fields.push({ name: "คู่แข่ง", value: vs, inline: true });
    if (venue) fields.push({ name: "สนาม", value: venue, inline: true });
    const label = matchLabel(sport, category, vs);
    await sendToChannel(channels.matches, {
      embeds: [{
        title: label,
        color: 0x199c4a,
        fields,
        timestamp: new Date().toISOString(),
      }],
    });
    await interaction.editReply(`เพิ่มแมตช์แล้ว: ${label} • ${time} น.${venue ? ` • ${venue}` : ""}`);
  },

  "cheer-post": async (interaction) => {
    const message = interaction.options.getString("message", true).trim().slice(0, 60);
    const color = interaction.options.getString("color") ?? "neon";
    const note = {
      id: crypto.randomUUID(),
      message,
      color,
      position: {
        x: 15 + Math.round(Math.random() * 70),
        y: 15 + Math.round(Math.random() * 70),
      },
      timestamp: new Date().toISOString(),
    };
    await sendToChannel(channels.cheerWall, { content: JSON.stringify(note) });
    await interaction.editReply(`ปักโพสต์อิตแล้ว: ${message}`);
  },

  "roster-add": async (interaction) => {
    const name = interaction.options.getString("name", true);
    const sport = interaction.options.getString("sport");
    const note = interaction.options.getString("note");
    const fields = [{ name: "ชื่อ", value: name, inline: true }];
    if (sport) fields.push({ name: "กีฬา", value: sport, inline: true });
    if (note) fields.push({ name: "หมายเหตุ", value: note, inline: true });
    await sendToChannel(channels.roster, {
      embeds: [{
        title: `${name}${sport ? ` — ${sport}` : ""}`,
        color: 0x199c4a,
        fields,
        timestamp: new Date().toISOString(),
      }],
    });
    await interaction.editReply(`เพิ่มนักกีฬาแล้ว: ${name}${sport ? ` (${sport})` : ""}`);
  },

  "score-update": async (interaction) => {
    const pairs = [
      ["ทอง", interaction.options.getString("gold")],
      ["เงิน", interaction.options.getString("silver")],
      ["ทองแดง", interaction.options.getString("bronze")],
      ["คะแนนรวม", interaction.options.getString("total")],
      ["เป้าหมาย", interaction.options.getString("goal")],
      ["อันดับ", interaction.options.getString("rank")],
      ["จำนวนสี", interaction.options.getString("colors")],
      ["กองเชียร์", interaction.options.getString("cheer")],
    ];
    const fields = [];
    for (const [key, value] of pairs) {
      if (value) fields.push({ name: key, value, inline: true });
    }
    if (fields.length === 0) throw new Error("ต้องระบุค่าอย่างน้อย 1 รายการ");

    const existing = await getLatestScoreMessage();
    const embed = existing?.embeds?.[0];
    if (existing && embed) {
      const merged = [...(embed.fields ?? [])];
      for (const f of fields) {
        const idx = merged.findIndex((x) => x.name === f.name);
        if (idx >= 0) merged[idx] = { ...merged[idx], value: f.value };
        else merged.push(f);
      }
      await existing.edit({
        embeds: [{
          title: embed.title ?? "สรุปคะแนนสีเขียว",
          color: embed.color ?? 0x199c4a,
          fields: merged,
          timestamp: new Date().toISOString(),
        }],
      });
      await interaction.editReply(`อัปเดตคะแนนแล้ว แก้เฉพาะ: ${fields.map((f) => `${f.name} = ${f.value}`).join(", ")}`);
    } else {
      await sendToChannel(channels.scores, {
        embeds: [{
          title: "สรุปคะแนนสีเขียว",
          color: 0x199c4a,
          fields,
          timestamp: new Date().toISOString(),
        }],
      });
      await interaction.editReply("อัปเดตคะแนนแล้ว");
    }
  },

  "score-edit": async (interaction) => {
    const existing = await getLatestScoreMessage();
    const embed = existing?.embeds?.[0];
    const data = {};
    for (const f of embed?.fields ?? []) data[f.name] = f.value;
    const fallback = '{\n  "ทอง": "0",\n  "เงิน": "0",\n  "ทองแดง": "0",\n  "คะแนนรวม": "0",\n  "เป้าหมาย": "100",\n  "อันดับ": "1",\n  "จำนวนสี": "5",\n  "กองเชียร์": "0"\n}';
    await interaction.showModal({
      title: "แก้ไขคะแนน (JSON รวมทุกช่อง)",
      customId: "score-edit-modal",
      components: [{
        type: 1,
        components: [{
          type: 4,
          customId: "score-json",
          style: 2,
          label: "ข้อมูลคะแนน (JSON)",
          value: Object.keys(data).length ? JSON.stringify(data, null, 2) : fallback,
          required: true,
        }],
      }],
    });
  },

  "register-add": async (interaction) => {
    const name = interaction.options.getString("name", true);
    const sport = interaction.options.getString("sport", true);
    const gender = interaction.options.getString("gender");
    const level = interaction.options.getString("level");
    await sendToChannel(channels.registrations, {
      content: "ใบสมัครใหม่ ทีมสีเขียว (เพิ่มผ่านคำสั่ง)",
      embeds: [{
        title: `${name}${gender ? ` (${gender})` : ""}`,
        color: 0x199c4a,
        fields: [
          { name: "กีฬา", value: sport, inline: true },
          { name: "เพศ", value: gender || "-", inline: true },
          { name: "ระดับชั้น", value: level || "-", inline: true },
          { name: "ทีมสี", value: "Green" },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
    await interaction.editReply(`เพิ่มใบสมัครแล้ว: ${name} — ${sport}`);
  },
};

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = COMMAND_HANDLERS[interaction.commandName];
  if (!handler) return;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "เฉพาะทีมงาน (สิทธิ์ Manage Messages) เท่านั้น", ephemeral: true });
    return;
  }
  if (interaction.commandName === "score-edit") {
    try {
      await handler(interaction);
    } catch (error) {
      await interaction.reply({ content: `ไม่สำเร็จ: ${friendlyError(error)}`, ephemeral: true });
    }
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    await handler(interaction);
  } catch (error) {
    await interaction.editReply(`ไม่สำเร็จ: ${friendlyError(error)}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit() || interaction.customId !== "score-edit-modal") return;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "เฉพาะทีมงาน (สิทธิ์ Manage Messages) เท่านั้น", ephemeral: true });
    return;
  }
  const raw = interaction.fields.getTextInputValue("score-json");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    await interaction.reply({ content: 'JSON ไม่ถูกต้อง ตรวจรูปแบบเช่น {"ทอง":"3"} แล้วลองใหม่', ephemeral: true });
    return;
  }
  const fields = Object.entries(data).map(([name, value]) => ({ name, value: String(value), inline: true }));
  if (fields.length === 0) {
    await interaction.reply({ content: "JSON ว่าง ไม่มีข้อมูลให้อัปเดต", ephemeral: true });
    return;
  }
  const existing = await getLatestScoreMessage();
  const embed = existing?.embeds?.[0];
  try {
    if (existing && embed) {
      await existing.edit({
        embeds: [{
          title: embed.title ?? "สรุปคะแนนสีเขียว",
          color: embed.color ?? 0x199c4a,
          fields,
          timestamp: new Date().toISOString(),
        }],
      });
    } else {
      await sendToChannel(channels.scores, {
        embeds: [{
          title: "สรุปคะแนนสีเขียว",
          color: 0x199c4a,
          fields,
          timestamp: new Date().toISOString(),
        }],
      });
    }
    await interaction.reply({ content: "อัปเดตคะแนนจาก JSON แล้ว", ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: `ไม่สำเร็จ: ${friendlyError(error)}`, ephemeral: true });
  }
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true, guildId, ready: client.isReady() });
});

app.get("/api/cheer-count", (_, res) => {
  res.json({ count: cheerState.count });
});

app.post("/api/cheer", (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId || typeof deviceId !== "string" || deviceId.length > 200) {
    return res.status(400).json({ error: "missing_device_id" });
  }
  if (cheerState.devices.includes(deviceId)) {
    return res.json({ ok: true, already: true, count: cheerState.count });
  }
  cheerState.devices.push(deviceId);
  cheerState.count += 1;
  saveCheerState();
  res.json({ ok: true, already: false, count: cheerState.count });
});

app.get("/api/announcements", async (_, res) => {
  try {
    const messages = await getChannelMessages(channels.announcements, 20);
    const items = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((message) => ({
        id: message.id,
        title: message.embeds[0]?.title || "ประกาศ",
        body: message.embeds[0]?.description || message.content,
        pinned: message.pinned,
        createdAt: message.createdAt,
      }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "failed_to_read_announcements", detail: String(error) });
  }
});

app.get("/api/cheer-wall", async (_, res) => {
  try {
    const messages = await getChannelMessages(channels.cheerWall, 100);
    const items = messages
      .map((message) => tryParseJson(message.content))
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "failed_to_read_cheer_wall", detail: String(error) });
  }
});

app.get("/api/matches", async (_, res) => {
  try {
    const messages = await getChannelMessages(channels.matches, 50);
    const items = messages
      .map((message) => normalizeMatch(parseMessageData(message)))
      .filter(Boolean);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "failed_to_read_matches", detail: String(error) });
  }
});

app.get("/api/roster", async (_, res) => {
  try {
    const messages = await getChannelMessages(channels.roster, 100);
    const items = messages
      .map((message) => parseMessageData(message))
      .filter(Boolean);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "failed_to_read_roster", detail: String(error) });
  }
});

app.get("/api/scores", async (_, res) => {
  try {
    const messages = await getChannelMessages(channels.scores, 20);
    const items = messages
      .map((message) => ({ createdAt: message.createdTimestamp, data: parseMessageData(message) }))
      .filter((m) => m.data)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(items.length > 0 ? items[0].data : {});
  } catch (error) {
    res.status(500).json({ error: "failed_to_read_scores", detail: String(error) });
  }
});

app.post("/api/cheer-wall", async (req, res) => {
  try {
    const note = req.body;
    if (!note || !note.message) return res.status(400).json({ error: "missing_message" });
    await sendToChannel(channels.cheerWall, { content: JSON.stringify(note) });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "failed_to_post_cheer", detail: String(error) });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, gender, level, sports } = req.body;
    const sportList = Array.isArray(sports) && sports.length > 0 ? sports : sports ? [sports] : [];
    if (!name || sportList.length === 0) return res.status(400).json({ error: "missing_name_or_sport" });
    await sendToChannel(channels.registrations, {
      content: "ใบสมัครใหม่ ทีมสีเขียว",
      embeds: [{
        title: `${name}${gender ? ` (${gender})` : ""}`,
        color: 0x199c4a,
        fields: [
          { name: "กีฬา", value: sportList.join(", "), inline: true },
          { name: "เพศ", value: gender || "-", inline: true },
          { name: "ระดับชั้น", value: level || "-", inline: true },
          { name: "ทีมสี", value: "Green" },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "failed_to_register", detail: String(error) });
  }
});

client.once("ready", async () => {
  console.log(`Discord bot ready as ${client.user?.tag}`);
  await registerCommands();
  app.listen(port, () => {
    console.log(`Bot API server listening on http://localhost:${port}`);
  });
});

client.login(token);
