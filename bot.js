import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

// ==========================================
// 1. CONFIGURATION & ENVIRONMENT
// ==========================================
const port = process.env.PORT || 3001;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const cleanId = (id) => (id ? String(id).trim().replace(/^0+/, "") : null);
const channels = {
  announcements: cleanId(process.env.DISCORD_CHANNEL_ANNOUNCEMENTS),
  cheerWall: cleanId(process.env.DISCORD_CHANNEL_CHEER_WALL),
  matches: cleanId(process.env.DISCORD_CHANNEL_MATCHES),
  roster: cleanId(process.env.DISCORD_CHANNEL_ROSTER),
  registrations: cleanId(process.env.DISCORD_CHANNEL_REGISTRATIONS),
  scores: cleanId(process.env.DISCORD_CHANNEL_SCORES),
};

// ==========================================
// 2. DATABASE ADAPTER (Supabase via PG or REST)
// ==========================================
let pgPool = null;
if (databaseUrl) {
  try {
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    console.log("✅ Supabase PostgreSQL Pool initialized!");
  } catch (err) {
    console.error("❌ Failed to initialize PG Pool:", err.message);
  }
}

let supabaseClient = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log("✅ Supabase REST Client initialized!");
  } catch (err) {
    console.error("❌ Failed to initialize Supabase REST Client:", err.message);
  }
}

// Memory fallback for cheer count when database is connecting
let memoryCheer = { count: 0, devices: new Set() };

// Unified DB helper functions
const db = {
  isConfigured: () => Boolean(pgPool || supabaseClient),

  async checkHealth() {
    if (pgPool) {
      try {
        const res = await pgPool.query("SELECT 1 as ok;");
        return res.rows?.[0]?.ok === 1;
      } catch {
        return false;
      }
    }
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from("scores").select("id").limit(1);
        return !error;
      } catch {
        return false;
      }
    }
    return false;
  },

  async getAnnouncements() {
    if (pgPool) {
      const res = await pgPool.query(
        "SELECT id, title, body, pinned, created_at FROM announcements ORDER BY pinned DESC, created_at DESC;"
      );
      return res.rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        pinned: Boolean(r.pinned),
        createdAt: r.created_at,
      }));
    }
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        pinned: Boolean(r.pinned),
        createdAt: r.created_at,
      }));
    }
    return [];
  },

  async addAnnouncement({ id, title, body, pinned, createdAt }) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO announcements (id, title, body, pinned, created_at) VALUES ($1, $2, $3, $4, $5);",
        [id, title, body, pinned, createdAt]
      );
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("announcements").insert({
        id,
        title,
        body,
        pinned,
        created_at: createdAt,
      });
      if (error) throw error;
    }
  },

  async deleteAnnouncement(id) {
    if (pgPool) {
      await pgPool.query("DELETE FROM announcements WHERE id = $1;", [id]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("announcements").delete().eq("id", id);
      if (error) throw error;
    }
  },

  async pinAnnouncement(id, pinned) {
    if (pgPool) {
      await pgPool.query("UPDATE announcements SET pinned = $2 WHERE id = $1;", [id, pinned]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from("announcements")
        .update({ pinned })
        .eq("id", id);
      if (error) throw error;
    }
  },

  async getMatches() {
    if (pgPool) {
      const res = await pgPool.query(
        "SELECT id, sport, time, category, vs, venue, created_at FROM matches ORDER BY time ASC;"
      );
      return res.rows.map((r) => ({
        id: r.id,
        sport: r.sport,
        time: r.time,
        category: r.category || "",
        vs: r.vs || "",
        venue: r.venue || "",
        createdAt: r.created_at,
      }));
    }
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("matches")
        .select("*")
        .order("time", { ascending: true });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        sport: r.sport,
        time: r.time,
        category: r.category || "",
        vs: r.vs || "",
        venue: r.venue || "",
        createdAt: r.created_at,
      }));
    }
    return [];
  },

  async addMatch({ id, sport, time, category, vs, venue, createdAt }) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO matches (id, sport, time, category, vs, venue, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [id, sport, time, category || "", vs || "", venue || "", createdAt]
      );
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("matches").insert({
        id,
        sport,
        time,
        category,
        vs,
        venue,
        created_at: createdAt,
      });
      if (error) throw error;
    }
  },

  async deleteMatch(id) {
    if (pgPool) {
      await pgPool.query("DELETE FROM matches WHERE id = $1;", [id]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("matches").delete().eq("id", id);
      if (error) throw error;
    }
  },

  async getCheerWall() {
    if (pgPool) {
      const res = await pgPool.query(
        "SELECT id, message, color, position_x, position_y, created_at FROM cheer_wall ORDER BY created_at ASC;"
      );
      return res.rows.map((r) => ({
        id: r.id,
        message: r.message,
        color: r.color || "neon",
        position: {
          x: Number(r.position_x) || 50,
          y: Number(r.position_y) || 50,
        },
        timestamp: r.created_at,
      }));
    }
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("cheer_wall")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        message: r.message,
        color: r.color || "neon",
        position: {
          x: Number(r.position_x) || 50,
          y: Number(r.position_y) || 50,
        },
        timestamp: r.created_at,
      }));
    }
    return [];
  },

  async addCheerWall({ id, message, color, position_x, position_y, timestamp }) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO cheer_wall (id, message, color, position_x, position_y, created_at) VALUES ($1, $2, $3, $4, $5, $6);",
        [id, message, color || "neon", position_x ?? 50, position_y ?? 50, timestamp]
      );
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("cheer_wall").insert({
        id,
        message,
        color: color || "neon",
        position_x: position_x ?? 50,
        position_y: position_y ?? 50,
        created_at: timestamp,
      });
      if (error) throw error;
    }
  },

  async deleteCheerWall(id) {
    if (pgPool) {
      await pgPool.query("DELETE FROM cheer_wall WHERE id = $1;", [id]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("cheer_wall").delete().eq("id", id);
      if (error) throw error;
    }
  },

  async getScores() {
    let s = null;
    if (pgPool) {
      const res = await pgPool.query("SELECT * FROM scores WHERE id = 'latest' LIMIT 1;");
      s = res.rows[0];
    } else if (supabaseClient) {
      const { data } = await supabaseClient
        .from("scores")
        .select("*")
        .eq("id", "latest")
        .maybeSingle();
      s = data;
    }

    const val = s || {
      gold: "0",
      silver: "0",
      bronze: "0",
      total: "0",
      goal: "100",
      rank: "1",
      colors: "5",
      cheer: "0",
    };

    return {
      gold: val.gold ?? "0",
      "เหรียญทอง": val.gold ?? "0",
      "ทอง": val.gold ?? "0",
      silver: val.silver ?? "0",
      "เหรียญเงิน": val.silver ?? "0",
      "เงิน": val.silver ?? "0",
      bronze: val.bronze ?? "0",
      "เหรียญทองแดง": val.bronze ?? "0",
      "ทองแดง": val.bronze ?? "0",
      total: val.total ?? "0",
      "คะแนนรวม": val.total ?? "0",
      goal: val.goal ?? "100",
      "เป้าหมาย": val.goal ?? "100",
      rank: val.rank ?? "1",
      "อันดับ": val.rank ?? "1",
      colors: val.colors ?? "5",
      "จำนวนสี": val.colors ?? "5",
      cheer: val.cheer ?? "0",
      "กองเชียร์": val.cheer ?? "0",
      updated_at: val.updated_at,
    };
  },

  async updateScores(fields) {
    const cur = await db.getScores();
    const merged = {
      gold: fields.gold ?? cur.gold,
      silver: fields.silver ?? cur.silver,
      bronze: fields.bronze ?? cur.bronze,
      total: fields.total ?? cur.total,
      goal: fields.goal ?? cur.goal,
      rank: fields.rank ?? cur.rank,
      colors: fields.colors ?? cur.colors,
      cheer: fields.cheer ?? cur.cheer,
      updated_at: new Date().toISOString(),
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO scores (id, gold, silver, bronze, total, goal, rank, colors, cheer, updated_at)
         VALUES ('latest', $1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           gold = EXCLUDED.gold,
           silver = EXCLUDED.silver,
           bronze = EXCLUDED.bronze,
           total = EXCLUDED.total,
           goal = EXCLUDED.goal,
           rank = EXCLUDED.rank,
           colors = EXCLUDED.colors,
           cheer = EXCLUDED.cheer,
           updated_at = EXCLUDED.updated_at;`,
        [
          merged.gold,
          merged.silver,
          merged.bronze,
          merged.total,
          merged.goal,
          merged.rank,
          merged.colors,
          merged.cheer,
          merged.updated_at,
        ]
      );
      return merged;
    }

    if (supabaseClient) {
      const { error } = await supabaseClient
        .from("scores")
        .upsert({ id: "latest", ...merged });
      if (error) throw error;
      return merged;
    }

    return merged;
  },

  async getRoster() {
    if (pgPool) {
      const res = await pgPool.query(
        "SELECT id, name, sport, note, created_at FROM roster ORDER BY created_at ASC;"
      );
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        sport: r.sport || "",
        note: r.note || "",
        "ชื่อ": r.name,
        "กีฬา": r.sport || "",
        "หมายเหตุ": r.note || "",
        createdAt: r.created_at,
      }));
    }
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("roster")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        sport: r.sport || "",
        note: r.note || "",
        "ชื่อ": r.name,
        "กีฬา": r.sport || "",
        "หมายเหตุ": r.note || "",
        createdAt: r.created_at,
      }));
    }
    return [];
  },

  async addRoster({ id, name, sport, note, createdAt }) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO roster (id, name, sport, note, created_at) VALUES ($1, $2, $3, $4, $5);",
        [id, name, sport || "", note || "", createdAt]
      );
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("roster").insert({
        id,
        name,
        sport,
        note,
        created_at: createdAt,
      });
      if (error) throw error;
    }
  },

  async deleteRoster(id) {
    if (pgPool) {
      await pgPool.query("DELETE FROM roster WHERE id = $1;", [id]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("roster").delete().eq("id", id);
      if (error) throw error;
    }
  },

  async getRegistrations() {
    if (pgPool) {
      const res = await pgPool.query(
        "SELECT id, name, gender, level, sports, team_color, status, created_at FROM registrations ORDER BY created_at DESC;"
      );
      return res.rows;
    }
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return [];
  },

  async addRegistration({ id, name, gender, level, sports, createdAt }) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO registrations (id, name, gender, level, sports, team_color, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);",
        [
          id,
          name,
          gender || "-",
          level || "-",
          JSON.stringify(sports),
          "Green",
          "pending",
          createdAt,
        ]
      );
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.from("registrations").insert({
        id,
        name,
        gender: gender || "-",
        level: level || "-",
        sports,
        team_color: "Green",
        status: "pending",
        created_at: createdAt,
      });
      if (error) throw error;
    }
  },

  async updateRegistrationStatus(id, status) {
    if (pgPool) {
      await pgPool.query("UPDATE registrations SET status = $2 WHERE id = $1;", [id, status]);
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from("registrations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    }
  },

  async getCheerCount() {
    if (pgPool) {
      const res = await pgPool.query("SELECT count FROM cheer_counter WHERE id = 'main';");
      if (res.rows?.[0]) return Number(res.rows[0].count) || 0;
    } else if (supabaseClient) {
      const { data } = await supabaseClient
        .from("cheer_counter")
        .select("count")
        .eq("id", "main")
        .maybeSingle();
      if (data) return Number(data.count) || 0;
    }
    return memoryCheer.count;
  },

  async registerCheer(deviceId) {
    if (pgPool) {
      const devCheck = await pgPool.query(
        "SELECT device_id FROM cheer_devices WHERE device_id = $1;",
        [deviceId]
      );
      if (devCheck.rows.length > 0) {
        const curCount = await db.getCheerCount();
        return { ok: true, already: true, count: curCount };
      }

      await pgPool.query(
        "INSERT INTO cheer_devices (device_id, created_at) VALUES ($1, now()) ON CONFLICT (device_id) DO NOTHING;",
        [deviceId]
      );
      const res = await pgPool.query(
        `INSERT INTO cheer_counter (id, count, updated_at) VALUES ('main', 1, now())
         ON CONFLICT (id) DO UPDATE SET count = cheer_counter.count + 1, updated_at = now()
         RETURNING count;`
      );
      const count = Number(res.rows[0]?.count) || 1;
      return { ok: true, already: false, count };
    }

    if (supabaseClient) {
      const { data: existing } = await supabaseClient
        .from("cheer_devices")
        .select("device_id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing) {
        const count = await db.getCheerCount();
        return { ok: true, already: true, count };
      }

      await supabaseClient.from("cheer_devices").insert({ device_id: deviceId });
      const cur = await db.getCheerCount();
      const newCount = cur + 1;
      await supabaseClient.from("cheer_counter").upsert({
        id: "main",
        count: newCount,
        updated_at: new Date().toISOString(),
      });
      return { ok: true, already: false, count: newCount };
    }

    if (memoryCheer.devices.has(deviceId)) {
      return { ok: true, already: true, count: memoryCheer.count };
    }
    memoryCheer.devices.add(deviceId);
    memoryCheer.count += 1;
    return { ok: true, already: false, count: memoryCheer.count };
  },

  async setCheerCount(count) {
    if (pgPool) {
      await pgPool.query(
        "INSERT INTO cheer_counter (id, count, updated_at) VALUES ('main', $1, now()) ON CONFLICT (id) DO UPDATE SET count = $1, updated_at = now();",
        [count]
      );
    } else if (supabaseClient) {
      await supabaseClient.from("cheer_counter").upsert({
        id: "main",
        count,
        updated_at: new Date().toISOString(),
      });
    }
    memoryCheer.count = count;
  },

  async resetCheer() {
    if (pgPool) {
      await pgPool.query("UPDATE cheer_counter SET count = 0, updated_at = now() WHERE id = 'main';");
      await pgPool.query("DELETE FROM cheer_devices;");
    } else if (supabaseClient) {
      await supabaseClient.from("cheer_counter").upsert({
        id: "main",
        count: 0,
        updated_at: new Date().toISOString(),
      });
      await supabaseClient.from("cheer_devices").delete().neq("device_id", "");
    }
    memoryCheer.count = 0;
    memoryCheer.devices.clear();
  },

  async getDbStats() {
    if (!pgPool) return null;
    const [ann, mat, cw, reg, ros, dev, cnt] = await Promise.all([
      pgPool.query("SELECT COUNT(*) FROM announcements;"),
      pgPool.query("SELECT COUNT(*) FROM matches;"),
      pgPool.query("SELECT COUNT(*) FROM cheer_wall;"),
      pgPool.query("SELECT COUNT(*) FROM registrations;"),
      pgPool.query("SELECT COUNT(*) FROM roster;"),
      pgPool.query("SELECT COUNT(*) FROM cheer_devices;"),
      pgPool.query("SELECT count FROM cheer_counter WHERE id = 'main';"),
    ]);
    return {
      announcements: Number(ann.rows[0].count),
      matches: Number(mat.rows[0].count),
      cheerWall: Number(cw.rows[0].count),
      registrations: Number(reg.rows[0].count),
      roster: Number(ros.rows[0].count),
      devices: Number(dev.rows[0].count),
      cheerCount: Number(cnt.rows[0]?.count || 0),
    };
  },
};

// ==========================================
// 3. EXPRESS API SERVER (Render.com Backend)
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function sendToChannel(channelId, payload) {
  if (!channelId || !client.isReady()) return null;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      return await channel.send(payload);
    }
  } catch (err) {
    console.warn(`Channel notice skipped (${channelId}):`, err.message);
  }
  return null;
}

// Footer ที่ copy ID ได้ง่าย (คลิกขวา -> Copy ID)
function idFooter(id, label = "ID") {
  return { text: `${label}: \`${id}\` • คลิกขวาที่ข้อความนี้เพื่อคัดลอก ID` };
}

// ปุ่มลบที่ผูกกับ id ของรายการ ใช้ลบจาก Supabase ได้โดยไม่ต้องพิมพ์คำสั่ง
function deleteButtonRow(kind, id, label = "🗑️ ลบออกจากเว็บ") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`del:${kind}:${id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Danger)
  );
}

// Health check endpoint for Render.com
app.get("/api/health", async (_, res) => {
  const isHealthy = await db.checkHealth();
  res.json({
    ok: true,
    service: "saraphee-backend",
    host: "render.com",
    database: "supabase",
    database_connected: isHealthy,
    connection_mode: pgPool ? "postgresql-direct" : supabaseClient ? "rest-api" : "none",
    discord_ready: client.isReady(),
    guildId: guildId || null,
    channels: Object.fromEntries(
      Object.entries(channels).map(([k, v]) => [k, Boolean(v)])
    ),
    timestamp: new Date().toISOString(),
  });
});

// REST Endpoints
app.get("/api/announcements", async (_, res) => {
  try {
    const items = await db.getAnnouncements();
    res.json(items);
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    res.status(500).json({ error: "failed_to_read_announcements", detail: String(error) });
  }
});

app.get("/api/matches", async (_, res) => {
  try {
    const items = await db.getMatches();
    res.json(items);
  } catch (error) {
    console.error("GET /api/matches error:", error);
    res.status(500).json({ error: "failed_to_read_matches", detail: String(error) });
  }
});

app.get("/api/cheer-wall", async (_, res) => {
  try {
    const items = await db.getCheerWall();
    res.json(items);
  } catch (error) {
    console.error("GET /api/cheer-wall error:", error);
    res.status(500).json({ error: "failed_to_read_cheer_wall", detail: String(error) });
  }
});

app.post("/api/cheer-wall", async (req, res) => {
  try {
    const note = req.body;
    if (!note || !note.message) {
      return res.status(400).json({ error: "missing_message" });
    }

    const id = note.id || crypto.randomUUID();
    const color = note.color || "neon";
    const x = note.position?.x ?? 50;
    const y = note.position?.y ?? 50;
    const timestamp = note.timestamp || new Date().toISOString();

    await db.addCheerWall({
      id,
      message: String(note.message).slice(0, 80),
      color,
      position_x: x,
      position_y: y,
      timestamp,
    });

    if (channels.cheerWall) {
      sendToChannel(channels.cheerWall, {
        embeds: [
          {
            title: "📌 ข้อความใหม่บนเชียร์วอลล์",
            description: note.message,
            color: 0x199c4a,
            fields: [
              { name: "สีกระดาษ", value: color, inline: true },
              { name: "พิกัด", value: `${x}%, ${y}%`, inline: true },
            ],
            timestamp,
            footer: idFooter(id),
          },
        ],
        components: [deleteButtonRow("cheer_wall", id, "🗑️ ลบโพสต์นี้")],
      });
    }

    res.json({ ok: true, id });
  } catch (error) {
    console.error("POST /api/cheer-wall error:", error);
    res.status(500).json({ error: "failed_to_post_cheer", detail: String(error) });
  }
});

app.get("/api/scores", async (_, res) => {
  try {
    const scores = await db.getScores();
    res.json(scores);
  } catch (error) {
    console.error("GET /api/scores error:", error);
    res.status(500).json({ error: "failed_to_read_scores", detail: String(error) });
  }
});

app.get("/api/roster", async (_, res) => {
  try {
    const items = await db.getRoster();
    res.json(items);
  } catch (error) {
    console.error("GET /api/roster error:", error);
    res.status(500).json({ error: "failed_to_read_roster", detail: String(error) });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, gender, level, sports } = req.body || {};
    const sportList = Array.isArray(sports) && sports.length > 0 ? sports : sports ? [sports] : [];
    if (!name || sportList.length === 0) {
      return res.status(400).json({ error: "missing_name_or_sport" });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.addRegistration({
      id,
      name,
      gender: gender || "-",
      level: level || "-",
      sports: sportList,
      createdAt,
    });

    if (channels.registrations) {
      sendToChannel(channels.registrations, {
        content: `📋 ใบสมัครใหม่: **${name}** (ทีมสีเขียว)`,
        embeds: [
          {
            title: `ใบสมัครนักกีฬา — ${name}`,
            color: 0x199c4a,
            fields: [
              { name: "ชื่อ", value: name, inline: true },
              { name: "กีฬา", value: sportList.join(", "), inline: true },
              { name: "เพศ", value: gender || "-", inline: true },
              { name: "ระดับชั้น", value: level || "-", inline: true },
              { name: "ID ใบสมัคร", value: `\`${id}\``, inline: false },
            ],
            timestamp: createdAt,
          },
        ],
      });
    }

    res.json({ ok: true, id });
  } catch (error) {
    console.error("POST /api/register error:", error);
    res.status(500).json({ error: "failed_to_register", detail: String(error) });
  }
});

app.get("/api/cheer-count", async (_, res) => {
  try {
    const count = await db.getCheerCount();
    res.json({ count });
  } catch {
    res.json({ count: memoryCheer.count });
  }
});

app.post("/api/cheer", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId || typeof deviceId !== "string" || deviceId.length > 200) {
    return res.status(400).json({ error: "missing_device_id" });
  }

  try {
    const result = await db.registerCheer(deviceId);
    res.json(result);
  } catch (error) {
    console.error("POST /api/cheer error:", error);
    res.status(500).json({ error: "failed_to_cheer", detail: String(error) });
  }
});

// Start Express immediately
app.listen(port, () => {
  console.log(`🚀 Render Backend API running on port ${port} (http://localhost:${port})`);
});

// ==========================================
// 4. DISCORD SLASH COMMANDS (Configuring Data in Supabase)
// ==========================================

async function registerCommands() {
  const commands = [
    // Announcements
    new SlashCommandBuilder()
      .setName("announce-add")
      .setDescription("เพิ่มประกาศใหม่ลง Supabase")
      .addStringOption((o) => o.setName("title").setDescription("หัวข้อประกาศ").setRequired(true))
      .addStringOption((o) => o.setName("detail").setDescription("รายละเอียดประกาศ").setRequired(true))
      .addBooleanOption((o) => o.setName("urgent").setDescription("ปักหมุดเป็นประกาศด่วน")),

    new SlashCommandBuilder()
      .setName("announce-list")
      .setDescription("ดูรายการประกาศทั้งหมดจาก Supabase"),

    new SlashCommandBuilder()
      .setName("announce-delete")
      .setDescription("ลบประกาศออกจาก Supabase ด้วย ID")
      .addStringOption((o) => o.setName("id").setDescription("ID ของประกาศ").setRequired(true)),

    new SlashCommandBuilder()
      .setName("announce-pin")
      .setDescription("ปรับสถานะปักหมุด/ปลดหมุดประกาศ")
      .addStringOption((o) => o.setName("id").setDescription("ID ของประกาศ").setRequired(true))
      .addBooleanOption((o) => o.setName("urgent").setDescription("ปักหมุดเป็นด่วนหรือไม่").setRequired(true)),

    // Matches
    new SlashCommandBuilder()
      .setName("match-add")
      .setDescription("เพิ่มแมตช์ลงตารางแข่งใน Supabase")
      .addStringOption((o) => o.setName("sport").setDescription("กีฬา เช่น ฟุตบอล").setRequired(true))
      .addStringOption((o) => o.setName("time").setDescription("เวลาเริ่ม เช่น 09:00").setRequired(true))
      .addStringOption((o) => o.setName("category").setDescription("ประเภท เช่น ชาย ม.ต้น"))
      .addStringOption((o) => o.setName("vs").setDescription("คู่แข่ง เช่น สีฟ้า"))
      .addStringOption((o) => o.setName("venue").setDescription("สนาม เช่น โดมใหญ่")),

    new SlashCommandBuilder()
      .setName("match-list")
      .setDescription("ดูรายการแมตช์การแข่งขันทั้งหมดจาก Supabase"),

    new SlashCommandBuilder()
      .setName("match-delete")
      .setDescription("ลบแมตช์ออกจาก Supabase ด้วย ID")
      .addStringOption((o) => o.setName("id").setDescription("ID ของแมตช์").setRequired(true)),

    // Scores
    new SlashCommandBuilder()
      .setName("score-update")
      .setDescription("อัปเดตคะแนนสีสารภีใน Supabase")
      .addStringOption((o) => o.setName("gold").setDescription("เหรียญทอง"))
      .addStringOption((o) => o.setName("silver").setDescription("เหรียญเงิน"))
      .addStringOption((o) => o.setName("bronze").setDescription("เหรียญทองแดง"))
      .addStringOption((o) => o.setName("total").setDescription("คะแนนรวม"))
      .addStringOption((o) => o.setName("goal").setDescription("เป้าหมายคะแนน"))
      .addStringOption((o) => o.setName("rank").setDescription("อันดับปัจจุบัน"))
      .addStringOption((o) => o.setName("colors").setDescription("จำนวนสีทั้งหมด"))
      .addStringOption((o) => o.setName("cheer").setDescription("คะแนนกองเชียร์")),

    new SlashCommandBuilder()
      .setName("score-view")
      .setDescription("ดูสรุปคะแนนปัจจุบันจาก Supabase"),

    new SlashCommandBuilder()
      .setName("score-edit")
      .setDescription("แก้ไขคะแนนทุกช่องผ่าน JSON Modal หน้าต่างเดียว"),

    // Roster
    new SlashCommandBuilder()
      .setName("roster-add")
      .setDescription("เพิ่มนักกีฬาเข้ารายชื่อใน Supabase")
      .addStringOption((o) => o.setName("name").setDescription("ชื่อ–นามสกุล").setRequired(true))
      .addStringOption((o) => o.setName("sport").setDescription("กีฬา"))
      .addStringOption((o) => o.setName("note").setDescription("หมายเหตุ เช่น ระดับชั้น/ห้อง")),

    new SlashCommandBuilder()
      .setName("roster-list")
      .setDescription("ดูรายชื่อนักกีฬาจาก Supabase"),

    new SlashCommandBuilder()
      .setName("roster-delete")
      .setDescription("ลบนักกีฬาออกจาก Supabase ด้วย ID")
      .addStringOption((o) => o.setName("id").setDescription("ID นักกีฬา").setRequired(true)),

    // Registrations
    new SlashCommandBuilder()
      .setName("register-list")
      .setDescription("ดูใบสมัครนักกีฬาล่าสุดจาก Supabase"),

    new SlashCommandBuilder()
      .setName("register-status")
      .setDescription("ปรับสถานะใบสมัครใน Supabase")
      .addStringOption((o) => o.setName("id").setDescription("ID ใบสมัคร").setRequired(true))
      .addStringOption((o) =>
        o
          .setName("status")
          .setDescription("สถานะใหม่")
          .setRequired(true)
          .addChoices(
            { name: "อนุมัติ (approved)", value: "approved" },
            { name: "ปฏิเสธ (rejected)", value: "rejected" },
            { name: "รอพิจารณา (pending)", value: "pending" }
          )
      ),

    // Cheer Wall
    new SlashCommandBuilder()
      .setName("cheer-post")
      .setDescription("ปักโพสต์อิตบนเชียร์วอลล์ลง Supabase")
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
          )
      ),

    new SlashCommandBuilder()
      .setName("cheer-list")
      .setDescription("ดูโพสต์อิตล่าสุดบนเชียร์วอลล์จาก Supabase"),

    new SlashCommandBuilder()
      .setName("cheer-delete")
      .setDescription("ลบโพสต์อิตออกจากเชียร์วอลล์ด้วย ID")
      .addStringOption((o) => o.setName("id").setDescription("ID โพสต์อิต").setRequired(true)),

    // Cheer Counter & DB Status
    new SlashCommandBuilder()
      .setName("cheer-set")
      .setDescription("ตั้งค่าตัวเลขพลังเชียร์ใน Supabase")
      .addIntegerOption((o) => o.setName("count").setDescription("จำนวนพลังเชียร์").setRequired(true)),

    new SlashCommandBuilder()
      .setName("cheer-reset")
      .setDescription("รีเซ็ตพลังเชียร์และประวัติอุปกรณ์ใน Supabase"),

    new SlashCommandBuilder()
      .setName("db-status")
      .setDescription("ตรวจสอบสถานะฐานข้อมูล Supabase และจำนวนแถวข้อมูล"),
  ];

  try {
    const target = guildId ? client.guilds.cache.get(guildId) : null;
    if (target) {
      await target.commands.set(commands);
      console.log(`✅ Registered ${commands.length} slash commands to guild ${guildId}`);
    } else {
      await client.application?.commands.set(commands);
      console.log(`✅ Registered ${commands.length} slash commands globally`);
    }
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err.message);
  }
}

// Command Handlers
const COMMAND_HANDLERS = {
  "announce-add": async (interaction) => {
    const title = interaction.options.getString("title", true);
    const detail = interaction.options.getString("detail", true);
    const urgent = interaction.options.getBoolean("urgent") ?? false;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.addAnnouncement({ id, title, body: detail, pinned: urgent, createdAt });

    if (channels.announcements) {
      sendToChannel(channels.announcements, {
        embeds: [
          {
            title,
            description: detail,
            color: urgent ? 0xd63031 : 0x199c4a,
            timestamp: createdAt,
            footer: idFooter(id),
          },
        ],
        components: [deleteButtonRow("announcement", id, "🗑️ ลบประกาศนี้")],
      });
    }

    await interaction.editReply(
      `✅ **เพิ่มประกาศลง Supabase เรียบร้อยแล้ว!**\n📌 **หัวข้อ:** ${title}\n🚨 **ระดับ:** ${
        urgent ? "ด่วนพิเศษ (ปักหมุด)" : "ทั่วไป"
      }\n🔑 **ID:** \`${id}\``
    );
  },

  "announce-list": async (interaction) => {
    const items = await db.getAnnouncements();
    if (!items || items.length === 0) {
      return interaction.editReply("📭 ยังไม่มีประกาศใน Supabase");
    }

    const lines = items.slice(0, 10).map(
      (a, i) =>
        `${i + 1}. ${a.pinned ? "🚨 **[ด่วน]** " : "📢 "}**${a.title}**\n   └ ID: \`${a.id}\``
    );
    await interaction.editReply(
      `📢 **รายการประกาศใน Supabase (${items.length} รายการ):**\n\n${lines.join(
        "\n"
      )}\n\n💡 *ใช้ \`/announce-delete\` เพื่อลบ หรือ \`/announce-pin\` เพื่อเปลี่ยนสถานะ*`
    );
  },

  "announce-delete": async (interaction) => {
    const id = interaction.options.getString("id", true);
    await db.deleteAnnouncement(id);
    await interaction.editReply(`🗑️ ลบประกาศ ID \`${id}\` ออกจาก Supabase แล้ว`);
  },

  "announce-pin": async (interaction) => {
    const id = interaction.options.getString("id", true);
    const urgent = interaction.options.getBoolean("urgent", true);
    await db.pinAnnouncement(id, urgent);
    await interaction.editReply(
      `📌 อัปเดตประกาศ ID \`${id}\` เป็น: **${urgent ? "ด่วน (ปักหมุด)" : "ทั่วไป (ปลดหมุด)"}**`
    );
  },

  "match-add": async (interaction) => {
    const sport = interaction.options.getString("sport", true);
    const time = interaction.options.getString("time", true);
    const category = interaction.options.getString("category") || "";
    const vs = interaction.options.getString("vs") || "";
    const venue = interaction.options.getString("venue") || "";
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.addMatch({ id, sport, time, category, vs, venue, createdAt });

    if (channels.matches) {
      sendToChannel(channels.matches, {
        embeds: [
          {
            title: `🏆 ${sport}${category ? ` (${category})` : ""}${vs ? ` พบ ${vs}` : ""}`,
            color: 0x199c4a,
            fields: [
              { name: "กีฬา", value: sport, inline: true },
              { name: "เวลา", value: `${time} น.`, inline: true },
              ...(category ? [{ name: "ประเภท", value: category, inline: true }] : []),
              ...(vs ? [{ name: "คู่แข่ง", value: vs, inline: true }] : []),
              ...(venue ? [{ name: "สนาม", value: venue, inline: true }] : []),
            ],
            timestamp: createdAt,
            footer: idFooter(id),
          },
        ],
        components: [deleteButtonRow("match", id, "🗑️ ลบแมตช์นี้")],
      });
    }

    await interaction.editReply(
      `✅ **บันทึกแมตช์ลง Supabase เรียบร้อย!**\n🏆 **กีฬา:** ${sport} • **เวลา:** ${time} น. ${
        vs ? `• **พบ:** ${vs}` : ""
      }${venue ? ` • **สนาม:** ${venue}` : ""}\n🔑 **ID:** \`${id}\``
    );
  },

  "match-list": async (interaction) => {
    const items = await db.getMatches();
    if (!items || items.length === 0) {
      return interaction.editReply("📭 ยังไม่มีตารางการแข่งขันใน Supabase");
    }

    const lines = items.map(
      (m, i) =>
        `${i + 1}. ⏰ **${m.time} น.** — ${m.sport}${m.category ? ` (${m.category})` : ""}${
          m.vs ? ` พบ ${m.vs}` : ""
        }${m.venue ? ` @ ${m.venue}` : ""}\n   └ ID: \`${m.id}\``
    );
    await interaction.editReply(
      `🏆 **ตารางแข่งขันใน Supabase (${items.length} รายการ):**\n\n${lines.join(
        "\n"
      )}\n\n💡 *ใช้ \`/match-delete\` ด้วย ID เพื่อลบรายการ*`
    );
  },

  "match-delete": async (interaction) => {
    const id = interaction.options.getString("id", true);
    await db.deleteMatch(id);
    await interaction.editReply(`🗑️ ลบแมตช์ ID \`${id}\` ออกจาก Supabase เรียบร้อยแล้ว`);
  },

  "score-update": async (interaction) => {
    const rawPairs = {
      gold: interaction.options.getString("gold"),
      silver: interaction.options.getString("silver"),
      bronze: interaction.options.getString("bronze"),
      total: interaction.options.getString("total"),
      goal: interaction.options.getString("goal"),
      rank: interaction.options.getString("rank"),
      colors: interaction.options.getString("colors"),
      cheer: interaction.options.getString("cheer"),
    };

    const updateData = {};
    for (const [k, v] of Object.entries(rawPairs)) {
      if (v !== null) updateData[k] = v;
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error("ต้องระบุค่าอย่างน้อย 1 รายการ เช่น gold, silver, rank");
    }

    const merged = await db.updateScores(updateData);

    if (channels.scores) {
      sendToChannel(channels.scores, {
        embeds: [
          {
            title: "🏆 สรุปคะแนนสีสารภี (สีเขียว)",
            color: 0x199c4a,
            fields: [
              { name: "🥇 ทอง", value: String(merged.gold), inline: true },
              { name: "🥈 เงิน", value: String(merged.silver), inline: true },
              { name: "🥉 ทองแดง", value: String(merged.bronze), inline: true },
              { name: "🏆 อันดับ", value: `${merged.rank} / ${merged.colors} สี`, inline: true },
              { name: "🎯 คะแนนรวม", value: `${merged.total} / ${merged.goal}`, inline: true },
              { name: "📣 กองเชียร์", value: String(merged.cheer), inline: true },
            ],
            timestamp: merged.updated_at,
          },
        ],
      });
    }

    const desc = Object.entries(updateData)
      .map(([k, v]) => `• **${k}**: ${v}`)
      .join("\n");
    await interaction.editReply(`✅ **อัปเดตคะแนนลง Supabase เรียบร้อยแล้ว!**\n${desc}`);
  },

  "score-view": async (interaction) => {
    const s = await db.getScores();
    await interaction.editReply({
      embeds: [
        {
          title: "🏆 สรุปคะแนนทีมสีเขียว (Supabase)",
          color: 0x199c4a,
          fields: [
            { name: "🥇 ทอง", value: String(s.gold), inline: true },
            { name: "🥈 เงิน", value: String(s.silver), inline: true },
            { name: "🥉 ทองแดง", value: String(s.bronze), inline: true },
            { name: "🏆 อันดับปัจจุบัน", value: `${s.rank} (จาก ${s.colors} สี)`, inline: true },
            { name: "🎯 คะแนนรวม", value: `${s.total} (เป้าหมาย: ${s.goal})`, inline: true },
            { name: "📣 กองเชียร์", value: String(s.cheer), inline: true },
          ],
          footer: {
            text: `อัปเดตล่าสุด: ${
              s.updated_at ? new Date(s.updated_at).toLocaleString("th-TH") : "เริ่มต้น"
            }`,
          },
        },
      ],
    });
  },

  "score-edit": async (interaction) => {
    const current = await db.getScores();
    const modal = new ModalBuilder()
      .setCustomId("score-edit-modal")
      .setTitle("แก้ไขคะแนนผ่าน JSON (Supabase)");

    const textInput = new TextInputBuilder()
      .setCustomId("score-json")
      .setLabel("JSON คะแนน (gold, silver, bronze, rank...)")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(
        JSON.stringify(
          {
            gold: current.gold,
            silver: current.silver,
            bronze: current.bronze,
            total: current.total,
            goal: current.goal,
            rank: current.rank,
            colors: current.colors,
            cheer: current.cheer,
          },
          null,
          2
        )
      )
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    await interaction.showModal(modal);
  },

  "roster-add": async (interaction) => {
    const name = interaction.options.getString("name", true);
    const sport = interaction.options.getString("sport") || "";
    const note = interaction.options.getString("note") || "";
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.addRoster({ id, name, sport, note, createdAt });

    if (channels.roster) {
      sendToChannel(channels.roster, {
        embeds: [
          {
            title: `👤 นักกีฬา: ${name}${sport ? ` — ${sport}` : ""}`,
            color: 0x199c4a,
            fields: [
              { name: "ชื่อ", value: name, inline: true },
              ...(sport ? [{ name: "กีฬา", value: sport, inline: true }] : []),
              ...(note ? [{ name: "หมายเหตุ", value: note, inline: true }] : []),
            ],
            timestamp: createdAt,
            footer: idFooter(id),
          },
        ],
        components: [deleteButtonRow("roster", id, "🗑️ ลบนักกีฬาคนนี้")],
      });
    }

    await interaction.editReply(
      `✅ **เพิ่มนักกีฬาลง Supabase สำเร็จ!**\n👤 **ชื่อ:** ${name} ${
        sport ? `• **กีฬา:** ${sport}` : ""
      }${note ? ` • **หมายเหตุ:** ${note}` : ""}\n🔑 **ID:** \`${id}\``
    );
  },

  "roster-list": async (interaction) => {
    const items = await db.getRoster();
    if (!items || items.length === 0) {
      return interaction.editReply("📭 ยังไม่มีรายชื่อนักกีฬาใน Supabase");
    }

    const lines = items.slice(0, 15).map(
      (r, i) =>
        `${i + 1}. 🏃 **${r.name}** ${r.sport ? `(${r.sport})` : ""}${r.note ? ` - ${r.note}` : ""}\n   └ ID: \`${r.id}\``
    );
    await interaction.editReply(
      `🏃 **รายชื่อนักกีฬาใน Supabase (${items.length} รายการ):**\n\n${lines.join(
        "\n"
      )}\n\n💡 *ใช้ \`/roster-delete\` เพื่อลบรายการ*`
    );
  },

  "roster-delete": async (interaction) => {
    const id = interaction.options.getString("id", true);
    await db.deleteRoster(id);
    await interaction.editReply(`🗑️ ลบนักกีฬา ID \`${id}\` ออกจาก Supabase แล้ว`);
  },

  "register-list": async (interaction) => {
    const items = await db.getRegistrations();
    if (!items || items.length === 0) {
      return interaction.editReply("📭 ยังไม่มีใบสมัครใน Supabase");
    }

    const lines = items.slice(0, 10).map((r, i) => {
      let sportsStr = "-";
      if (Array.isArray(r.sports)) sportsStr = r.sports.join(", ");
      else if (typeof r.sports === "string") {
        try {
          const parsed = JSON.parse(r.sports);
          sportsStr = Array.isArray(parsed) ? parsed.join(", ") : r.sports;
        } catch {
          sportsStr = r.sports;
        }
      }
      const statusEmoji =
        r.status === "approved" ? "✅" : r.status === "rejected" ? "❌" : "⏳";
      return `${i + 1}. ${statusEmoji} **${r.name}** (${r.gender}/${r.level})\n   กีฬา: ${sportsStr} | สถานะ: ${r.status}\n   ID: \`${r.id}\``;
    });

    await interaction.editReply(
      `📋 **ใบสมัครล่าสุดใน Supabase (${items.length} รายการ):**\n\n${lines.join(
        "\n"
      )}\n\n💡 *ใช้ \`/register-status\` เพื่ออนุมัติหรือปฏิเสธใบสมัคร*`
    );
  },

  "register-status": async (interaction) => {
    const id = interaction.options.getString("id", true);
    const status = interaction.options.getString("status", true);
    await db.updateRegistrationStatus(id, status);
    await interaction.editReply(
      `📝 **ปรับสถานะใบสมัคร ID \`${id}\` เป็น:** **${status}** สำเร็จ!`
    );
  },

  "cheer-post": async (interaction) => {
    const message = interaction.options.getString("message", true).trim().slice(0, 80);
    const color = interaction.options.getString("color") || "neon";
    const id = crypto.randomUUID();
    const x = 15 + Math.round(Math.random() * 70);
    const y = 15 + Math.round(Math.random() * 70);
    const timestamp = new Date().toISOString();

    await db.addCheerWall({ id, message, color, position_x: x, position_y: y, timestamp });
    await interaction.editReply(
      `📌 **ปักโพสต์อิตลงเชียร์วอลล์ (Supabase) เรียบร้อย!**\n💬 "${message}"\n🎨 สี: ${color}\n🔑 **ID:** \`${id}\``
    );
  },

  "cheer-list": async (interaction) => {
    const items = await db.getCheerWall();
    if (!items || items.length === 0) {
      return interaction.editReply("📭 ยังไม่มีโพสต์อิตบนเชียร์วอลล์");
    }

    const lines = items.slice(0, 10).map(
      (c, i) => `${i + 1}. 📝 "${c.message}" (${c.color})\n   └ ID: \`${c.id}\``
    );
    await interaction.editReply(
      `📌 **โพสต์อิตล่าสุดใน Supabase (${items.length} รายการ):**\n\n${lines.join(
        "\n"
      )}\n\n💡 *ใช้ \`/cheer-delete\` เพื่อลบข้อความ*`
    );
  },

  "cheer-delete": async (interaction) => {
    const id = interaction.options.getString("id", true);
    await db.deleteCheerWall(id);
    await interaction.editReply(`🗑️ ลบโพสต์อิต ID \`${id}\` ออกจาก Supabase แล้ว`);
  },

  "cheer-set": async (interaction) => {
    const count = interaction.options.getInteger("count", true);
    await db.setCheerCount(count);
    await interaction.editReply(`📣 ตั้งค่าตัวนับพลังเชียร์ใน Supabase เป็น: **${count.toLocaleString()}** ครั้ง`);
  },

  "cheer-reset": async (interaction) => {
    await db.resetCheer();
    await interaction.editReply("🔄 รีเซ็ตพลังเชียร์และประวัติอุปกรณ์ใน Supabase เป็น 0 เรียบร้อย");
  },

  "db-status": async (interaction) => {
    const isConnected = await db.checkHealth();
    if (!isConnected) {
      return interaction.editReply(
        "⚠️ **Supabase ไม่ได้เชื่อมต่อ หรือยังไม่ได้รัน SQL Schema!**"
      );
    }

    const stats = (await db.getDbStats()) || {
      announcements: "-",
      matches: "-",
      cheerWall: "-",
      registrations: "-",
      roster: "-",
      devices: "-",
      cheerCount: "-",
    };

    await interaction.editReply({
      embeds: [
        {
          title: "🟢 สถานะระบบหลังบ้าน Render.com & Supabase",
          color: 0x199c4a,
          fields: [
            { name: "🌐 Backend Host", value: "Render.com (Node.js)", inline: true },
            { name: "🗄️ Database", value: "Supabase (PostgreSQL 17)", inline: true },
            { name: "🤖 Discord Bot", value: client.isReady() ? "Online ✅" : "Connecting", inline: true },
            { name: "📢 ประกาศ (announcements)", value: `${stats.announcements} รายการ`, inline: true },
            { name: "🏆 แมตช์แข่ง (matches)", value: `${stats.matches} รายการ`, inline: true },
            { name: "📌 เชียร์วอลล์ (cheer_wall)", value: `${stats.cheerWall} โพสต์`, inline: true },
            { name: "📋 ใบสมัคร (registrations)", value: `${stats.registrations} คน`, inline: true },
            { name: "🏃 นักกีฬา (roster)", value: `${stats.roster} คน`, inline: true },
            {
              name: "📣 พลังเชียร์ (cheer_counter)",
              value: `${stats.cheerCount} ครั้ง (${stats.devices} อุปกรณ์)`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  },
};

// Interaction handler: Chat Input Commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = COMMAND_HANDLERS[interaction.commandName];
  if (!handler) return;

  const publicCommands = ["score-view", "match-list", "roster-list", "cheer-list", "db-status"];
  if (
    !publicCommands.includes(interaction.commandName) &&
    !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)
  ) {
    return interaction.reply({
      content: "⚠️ เฉพาะทีมงาน (สิทธิ์ Manage Messages) เท่านั้นที่สามารถจัดการข้อมูลได้",
      ephemeral: true,
    });
  }

  if (interaction.commandName === "score-edit") {
    try {
      await handler(interaction);
    } catch (err) {
      console.error("score-edit error:", err);
      await interaction.reply({ content: `❌ ผิดพลาด: ${err.message}`, ephemeral: true });
    }
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await handler(interaction);
  } catch (err) {
    console.error(`Command ${interaction.commandName} error:`, err);
    await interaction.editReply(`❌ เกิดข้อผิดพลาด: ${err.message}`);
  }
});

// Modal Submit
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit() || interaction.customId !== "score-edit-modal") return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: "⚠️ เฉพาะทีมงานเท่านั้น", ephemeral: true });
  }

  const rawJson = interaction.fields.getTextInputValue("score-json");
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return interaction.reply({
      content: "❌ รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบรูปแบบข้อความ",
      ephemeral: true,
    });
  }

  try {
    await db.updateScores({
      gold: String(parsed.gold ?? parsed["เหรียญทอง"] ?? parsed["ทอง"] ?? "0"),
      silver: String(parsed.silver ?? parsed["เหรียญเงิน"] ?? parsed["เงิน"] ?? "0"),
      bronze: String(parsed.bronze ?? parsed["เหรียญทองแดง"] ?? parsed["ทองแดง"] ?? "0"),
      total: String(parsed.total ?? parsed["คะแนนรวม"] ?? "0"),
      goal: String(parsed.goal ?? parsed["เป้าหมาย"] ?? "100"),
      rank: String(parsed.rank ?? parsed["อันดับ"] ?? "1"),
      colors: String(parsed.colors ?? parsed["จำนวนสี"] ?? "5"),
      cheer: String(parsed.cheer ?? parsed["กองเชียร์"] ?? "0"),
    });

    await interaction.reply({
      content: "✅ อัปเดตคะแนนทั้งหมดลง Supabase เรียบร้อยแล้ว!",
      ephemeral: true,
    });
  } catch (err) {
    await interaction.reply({ content: `❌ ไม่สำเร็จ: ${err.message}`, ephemeral: true });
  }
});

// ปุ่มลบบนข้อความที่บอทส่งลงห้อง — ลบจาก Supabase โดยตรง
const DELETE_TARGETS = {
  announcement: { label: "ประกาศ", fn: (id) => db.deleteAnnouncement(id) },
  match: { label: "แมตช์", fn: (id) => db.deleteMatch(id) },
  roster: { label: "นักกีฬา", fn: (id) => db.deleteRoster(id) },
  cheer_wall: { label: "โพสต์เชียร์", fn: (id) => db.deleteCheerWall(id) },
};

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split(":");
  if (parts[0] !== "del" || parts.length < 3) return;

  const target = DELETE_TARGETS[parts[1]];
  const id = parts.slice(2).join(":");
  if (!target) return;

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
    interaction.user.id === client.user?.id;
  if (!isStaff) {
    return interaction.reply({
      content: "⚠️ เฉพาะทีมงาน (สิทธิ์ Manage Messages) เท่านั้นที่กดลบได้",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await target.fn(id);
    // ปิดปุ่มทิ้ง และแก้ embed ให้เห็นว่าถูกลบแล้ว
    await interaction.update({
      embeds: [
        {
          ...(interaction.message.embeds[0]?.toJSON?.() ?? {}),
          color: 0x666666,
          footer: { text: `🗑️ ลบ${target.label}ออกจากเว็บแล้ว • ID: \`${id}\`` },
        },
      ],
      components: [],
    });
    await interaction.editReply(`🗑️ ลบ${target.label} ID \`${id}\` ออกจากเว็บเรียบร้อยแล้ว`);
  } catch (err) {
    console.error(`Button delete error (${id}):`, err);
    await interaction.editReply(`❌ ลบไม่สำเร็จ: ${err.message}`);
  }
});

// ==========================================
// 5. DISCORD CHANNELS AUTO-SYNC (MESSAGE LISTENERS)
// ==========================================
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
  if (e.fields) {
    for (const f of e.fields) data[f.name] = f.value;
  }
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

// Sync when a new message is posted in Discord channels
client.on("messageCreate", async (message) => {
  if (message.author?.id === client.user?.id) return; // avoid looping bot's own responses

  try {
    // 1. Announcements channel
    if (channels.announcements && message.channelId === channels.announcements) {
      const title =
        message.embeds[0]?.title ||
        (message.content ? message.content.split("\n")[0].slice(0, 50) : "ประกาศจาก Discord");
      const body = message.embeds[0]?.description || message.content;
      if (body) {
        await db.addAnnouncement({
          id: message.id,
          title,
          body,
          pinned: Boolean(message.pinned),
          createdAt: message.createdAt.toISOString(),
        });
        console.log(`📢 Auto-synced announcement from Discord: ${title}`);
      }
    }

    // 2. Matches channel
    if (channels.matches && message.channelId === channels.matches) {
      const data = parseMessageData(message);
      if (data) {
        const m = normalizeMatch(data);
        await db.addMatch({
          id: message.id,
          sport: m.sport || "กีฬา",
          time: m.time || "00:00",
          category: m.category || "",
          vs: m.vs || "",
          venue: m.venue || "",
          createdAt: message.createdAt.toISOString(),
        });
        console.log(`🏆 Auto-synced match from Discord: ${m.sport}`);
      }
    }

    // 3. Cheer Wall channel
    if (channels.cheerWall && message.channelId === channels.cheerWall) {
      const parsed = tryParseJson(message.content);
      const msg = parsed?.message || message.content;
      if (msg) {
        await db.addCheerWall({
          id: message.id,
          message: msg.slice(0, 80),
          color: parsed?.color || "neon",
          position_x: parsed?.position?.x ?? (15 + Math.round(Math.random() * 70)),
          position_y: parsed?.position?.y ?? (15 + Math.round(Math.random() * 70)),
          timestamp: message.createdAt.toISOString(),
        });
        console.log("📌 Auto-synced cheer note from Discord");
      }
    }

    // 4. Scores channel
    if (channels.scores && message.channelId === channels.scores) {
      const data = parseMessageData(message);
      if (data) {
        await db.updateScores(data);
        console.log("📊 Auto-synced scores from Discord");
      }
    }

    // 5. Roster channel
    if (channels.roster && message.channelId === channels.roster) {
      const data = parseMessageData(message);
      const name = data?.name || data?.["ชื่อ"] || message.content.split("\n")[0];
      const sport = data?.sport || data?.["กีฬา"] || "";
      const note = data?.note || data?.["หมายเหตุ"] || "";
      if (name) {
        await db.addRoster({
          id: message.id,
          name,
          sport,
          note,
          createdAt: message.createdAt.toISOString(),
        });
        console.log(`👤 Auto-synced athlete from Discord: ${name}`);
      }
    }
  } catch (err) {
    console.warn("Message sync warning:", err.message);
  }
});

// Sync when a message is deleted in Discord
client.on("messageDelete", async (message) => {
  try {
    if (channels.announcements && message.channelId === channels.announcements) {
      await db.deleteAnnouncement(message.id);
    }
    if (channels.matches && message.channelId === channels.matches) {
      await db.deleteMatch(message.id);
    }
    if (channels.cheerWall && message.channelId === channels.cheerWall) {
      await db.deleteCheerWall(message.id);
    }
    if (channels.roster && message.channelId === channels.roster) {
      await db.deleteRoster(message.id);
    }
  } catch {}
});

// Initial sync of existing channel messages
async function syncChannelsOnStartup() {
  try {
    if (channels.announcements) {
      const ch = await client.channels.fetch(channels.announcements).catch(() => null);
      if (ch && ch.isTextBased()) {
        const msgs = await ch.messages.fetch({ limit: 30 });
        for (const message of msgs.values()) {
          const title =
            message.embeds[0]?.title ||
            (message.content ? message.content.split("\n")[0].slice(0, 50) : "ประกาศ");
          const body = message.embeds[0]?.description || message.content;
          if (body) {
            await db.addAnnouncement({
              id: message.id,
              title,
              body,
              pinned: Boolean(message.pinned),
              createdAt: message.createdAt.toISOString(),
            }).catch(() => {});
          }
        }
      }
    }

    if (channels.matches) {
      const ch = await client.channels.fetch(channels.matches).catch(() => null);
      if (ch && ch.isTextBased()) {
        const msgs = await ch.messages.fetch({ limit: 30 });
        for (const message of msgs.values()) {
          const data = parseMessageData(message);
          if (data) {
            const m = normalizeMatch(data);
            await db.addMatch({
              id: message.id,
              sport: m.sport || "กีฬา",
              time: m.time || "00:00",
              category: m.category || "",
              vs: m.vs || "",
              venue: m.venue || "",
              createdAt: message.createdAt.toISOString(),
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.warn("Startup sync warning:", err.message);
  }
}

// ==========================================
// 6. DISCORD BOT LOGIN
// ==========================================
client.once("ready", () => {
  console.log(`🤖 Discord bot logged in as ${client.user?.tag}`);
  registerCommands().catch((err) => console.error("registerCommands failed:", err.message));
  syncChannelsOnStartup().catch(() => {});
});

async function loginWithRetry() {
  if (!token) {
    console.log("ℹ️ DISCORD_BOT_TOKEN not provided in .env (Discord bot features idle).");
    return;
  }
  let attempt = 0;
  while (!client.isReady()) {
    attempt++;
    try {
      await client.login(token);
      console.log("✅ Discord bot connected successfully!");
      return;
    } catch (err) {
      console.error(`⚠️ Discord login attempt ${attempt} failed:`, err.message);
      try {
        client.destroy();
      } catch {}
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
}

loginWithRetry();
