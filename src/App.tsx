import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "./utils/cn";
import config from "./data/config.json";
import texts from "./data/texts.json";

const T = texts;
import {
  BallBasket,
  BallChair,
  BallSoccer,
  BallVolley,
  IconBell,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconChevron,
  IconInfo,
  IconClock,
  IconMusic,
  IconPersonAdd,
  IconPin,
  IconPushPin,
  IconRefresh,
  IconRun,
  IconSend,
  IconMedal,
  IconThermo,
  IconTrophy,
  LeafMark,
} from "./components/icons";

const EVENT_DATE = config.event.date;
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=14.0753455&longitude=101.8194655&hourly=temperature_2m";

const API_BASE = config.api.baseUrl || "http://localhost:3001";

const DEVICE_KEY = "sarapee-cheer-device";
const CHEERED_KEY = "sarapee-cheer-done";

type Announcement = {
  level: "urgent" | "info";
  title: string;
  detail: string;
  when: string;
};



type SportIcon = ComponentType<SVGProps<SVGSVGElement>>;

const SPORT_ICONS: Record<string, SportIcon> = {
  ฟุตบอล: BallSoccer,
  วอลเลย์บอล: BallVolley,
  บาสเกตบอล: BallBasket,
  แชร์บอล: BallChair,
  กรีฑา: IconRun,
  เชียร์ลีดเดอร์: IconMusic,
};



const SONGS: { title: string; hook: string; lyrics: string[] }[] = config.songs;

const SPORTS = config.sports;

type PostitColor = "neon" | "mint" | "ink" | "lemon";

const POSTIT_THEMES: Record<PostitColor, { note: string; label: string }> = {
  neon: { note: "bg-[#b8ec51] text-[#1e3a06] shadow-[0_12px_28px_rgba(184,236,81,0.28)]", label: T.cheerWall.colorLabels[0] },
  mint: { note: "bg-[#d9f2d0] text-[#17391c] shadow-[0_12px_28px_rgba(122,196,120,0.25)]", label: T.cheerWall.colorLabels[1] },
  ink: { note: "bg-[#12271a] text-[#cdf6b8] ring-1 ring-[#3fae62] shadow-[0_12px_28px_rgba(63,174,98,0.2)]", label: T.cheerWall.colorLabels[2] },
  lemon: { note: "bg-[#f5f7ae] text-[#3d4506] shadow-[0_12px_28px_rgba(245,247,174,0.22)]", label: T.cheerWall.colorLabels[3] },
};



function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function useApi<T>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!url) { setData(null); setLoading(false); return; }
    let alive = true;
    const u: string = url;
    function load() {
      fetch(u)
        .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<T>; })
        .then((d) => { if (alive) { setData(d); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    }
    load();
    if (intervalMs > 0) {
      const id = window.setInterval(load, intervalMs);
      return () => { alive = false; window.clearInterval(id); };
    }
    return () => { alive = false; };
  }, [url, intervalMs]);
  return { data, loading };
}

function useCountdown(target: string) {
  const calc = () => {
    const diff = Math.max(new Date(target).getTime() - Date.now(), 0);
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor(diff / 3_600_000) % 24,
      minutes: Math.floor(diff / 60_000) % 60,
      seconds: Math.floor(diff / 1_000) % 60,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = window.setInterval(() => setT(calc()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return t;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ no, title, sub, icon: Icon }: { no: string; title: string; sub?: string; icon: SportIcon }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leaf-deep text-limepop shadow-[0_6px_16px_rgba(15,107,51,0.28)]">
        <Icon className="h-5.5 w-5.5" />
      </span>
      <div>
        <span className="font-display block text-xs font-semibold tracking-[0.28em] text-leaf-deep uppercase">{no}</span>
        <h2 className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1.5 text-sm text-ink-soft sm:text-base">{sub}</p>}
      </div>
    </div>
  );
}

function Header() {
  const now = useNow(1000);
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-leaf-deep text-limepop">
            <img
              src={`${import.meta.env.BASE_URL}icon.png`}
              alt={config.event.title}
              className="h-9 w-9 rounded-lg object-cover"
            />
          </span>
          <span className="leading-none">
            <span className="font-display block text-base font-bold text-ink">{config.event.title}</span>
            <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.22em] text-leaf-deep">{config.event.yearLabel}</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-5 text-sm font-medium text-ink-soft md:flex">
            <a className="transition hover:text-leaf-deep" href="#announcements">{T.nav[0]}</a>
            <a className="transition hover:text-leaf-deep" href="#schedule">{T.nav[1]}</a>
            <a className="transition hover:text-leaf-deep" href="#wall">{T.nav[2]}</a>
            <a className="transition hover:text-leaf-deep" href="#register">{T.nav[3]}</a>
            <a className="transition hover:text-leaf-deep" href="#score">{T.nav[4]}</a>
          </nav>
          <span className="flex items-center gap-1.5 rounded-full border border-leaf/30 bg-mint px-3 py-1.5 text-sm font-semibold text-leaf-deep tabular-nums">
            <IconClock className="h-3.5 w-3.5" />
            {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>
    </header>
  );
}

function AnnouncementsBanner() {
  const { data: raw } = useApi<{ id: string; title: string; body: string; pinned: boolean; createdAt: string }[]>(`${API_BASE}/api/announcements`, 15_000);
  const announcements: Announcement[] = useMemo(() => {
    if (!raw) return [];
    return raw.map((a) => ({
      level: a.pinned ? "urgent" as const : "info" as const,
      title: a.title,
      detail: a.body,
      when: new Date(a.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
    }));
  }, [raw]);

  const [activeIdx, setActiveIdx] = useState(0);

  if (announcements.length === 0) return null;

  const a = announcements[activeIdx];
  const urgent = a.level === "urgent";
  const Icon = urgent ? IconBell : IconInfo;
  const hasMore = announcements.length > 1;

  function next() {
    setActiveIdx((i) => (i + 1) % announcements.length);
  }

  return (
    <section id="announcements" className="px-5 pt-5 pb-2">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "mx-auto flex max-w-4xl flex-col items-start gap-4 rounded-2xl border p-4 shadow-[0_8px_24px_rgba(14,36,21,0.06)] sm:flex-row sm:items-center sm:p-5",
          urgent ? "border-leaf-deep/30 bg-mint" : "border-ink/10 bg-white"
        )}
      >
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
            urgent ? "bg-leaf-deep text-limepop shadow-[0_6px_16px_rgba(15,107,51,0.25)]" : "bg-mint text-leaf-deep"
          )}
        >
          <Icon className={cn("h-5 w-5", urgent && "motion-safe:animate-pulse")} />
        </span>
        
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {urgent && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                {T.announcements.urgent}
              </span>
            )}
            <h3 className="font-display text-[15px] font-bold text-ink sm:text-base">{a.title}</h3>
          </div>
          <p className="mt-1 text-sm leading-snug text-ink-soft sm:text-[15px]">{a.detail}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-leaf-deep">
            <IconClock className="h-3.5 w-3.5" />
            {a.when}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 border-t border-ink/10 pt-3 sm:w-auto sm:border-0 sm:pt-0">
          {hasMore && (
            <button
              type="button"
              onClick={next}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:flex-none",
                urgent ? "border-leaf-deep/20 bg-white/50 text-leaf-deep hover:bg-white" : "border-ink/15 bg-paper text-ink-soft hover:border-leaf hover:text-leaf-deep"
              )}
            >
              {T.announcements.readMore} ({activeIdx + 1}/{announcements.length})
              <IconChevron className="h-4 w-4 -rotate-90" />
            </button>
          )}
        </div>
      </motion.div>
    </section>
  );
}

function CountdownHero() {
  const t = useCountdown(EVENT_DATE);
  const units = [
    { label: T.hero.units[0], value: t.days },
    { label: T.hero.units[1], value: t.hours },
    { label: T.hero.units[2], value: t.minutes },
    { label: T.hero.units[3], value: t.seconds },
  ];

  return (
    <section id="top" className="stripes relative overflow-hidden border-b border-ink/10">
      <div
        aria-hidden="true"
        className="font-display pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[110px] font-extrabold tracking-tight text-transparent select-none sm:text-[170px]"
        style={{ WebkitTextStroke: "1.5px rgba(25,156,74,0.22)" }}
      >
        {T.hero.decor}
      </div>
      <div className="relative mx-auto max-w-5xl px-5 pt-12 pb-12 text-center sm:pt-16 sm:pb-16">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-leaf-deep">
          <span className="inline-block h-2 w-2 rounded-full bg-leaf motion-safe:animate-pulse" />
          {config.event.sub}
        </p>
        <h1 className="font-display mt-4 text-4xl leading-[1.1] font-extrabold text-ink sm:text-6xl">
          {config.event.name}
          <span className="text-leaf">{config.event.team}</span>
          <span className="block"></span>
        </h1>
        <div className="font-display mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-base font-semibold text-ink-soft sm:text-lg">
          <span className="flex items-center gap-2">
            <IconCalendar className="h-4.5 w-4.5 text-leaf" />
            {config.event.dateLabel}
          </span>
          <span className="flex items-center gap-2">
            <IconPin className="h-4.5 w-4.5 text-leaf" />
            {config.event.venue}
          </span>
        </div>

        <div className="mt-8 mx-auto flex max-w-md items-stretch gap-2 sm:gap-3" role="timer" aria-label={T.hero.timerLabel}>
          {units.map((u, i) => (
            <div key={u.label} className="contents">
              {i > 0 && <span className="font-display self-center text-2xl font-bold text-leaf/50">:</span>}
              <div className="flex-1 rounded-xl border border-ink/10 bg-white/70 px-1 py-3 text-center shadow-[0_8px_24px_rgba(14,36,21,0.06)]">
                <div className="font-display relative h-10 overflow-hidden text-3xl font-extrabold text-ink tabular-nums sm:h-14 sm:text-5xl">
                  <motion.span
                    key={u.value}
                    initial={{ y: "0.55em", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="block"
                  >
                    {String(u.value).padStart(2, "0")}
                  </motion.span>
                </div>
                <div className="mt-1 text-xs font-medium text-ink-soft">{u.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#wall"
            className="font-display inline-flex items-center gap-2 rounded-full bg-leaf-deep px-6 py-3 text-base font-semibold text-paper shadow-[0_10px_24px_rgba(15,107,51,0.3)] transition hover:-translate-y-0.5 hover:bg-leaf active:translate-y-0"
          >
            <IconPushPin className="h-4.5 w-4.5" />
            {T.hero.writeNote}
          </a>
          <a
            href="#register"
            className="font-display inline-flex items-center gap-2 rounded-full border-2 border-leaf-deep/25 bg-white/60 px-6 py-3 text-base font-semibold text-leaf-deep transition hover:-translate-y-0.5 hover:border-leaf-deep active:translate-y-0"
          >
            <IconPersonAdd className="h-4.5 w-4.5" />
            {T.hero.register}
          </a>
        </div>
      </div>
    </section>
  );
}

function ScheduleSection() {
  const { data: raw } = useApi<{ id: string; time: string; sport: string; vs: string; venue: string; category?: string }[]>(`${API_BASE}/api/matches`, 30_000);
  const schedule = useMemo(() => {
    return (raw ?? []).map((m) => ({ ...m, icon: (SPORT_ICONS[m.sport] || BallSoccer) as SportIcon }));
  }, [raw]);

  const now = useNow(30_000);

  const rows = useMemo(() => {
    const date = EVENT_DATE.slice(0, 10);
    return schedule
      .map((m) => {
        const start = new Date(`${date}T${m.time}:00+07:00`).getTime();
        const end = start + 60 * 60_000;
        const status = now.getTime() >= start && now.getTime() < end ? "live" : now.getTime() >= end ? "done" : "next";
        return { ...m, status, start };
      })
      .sort((a, b) => a.start - b.start);
  }, [now, schedule]);

  const firstUpcoming = rows.find((r) => r.status === "next")?.id;

  return (
    <section id="schedule" className="mx-auto max-w-5xl scroll-mt-20 px-5 pt-14 sm:pt-20">
      <Reveal>
        <SectionHead no="01" icon={IconCalendar} title={T.schedule.title} sub={T.schedule.sub} />
      </Reveal>
      <Reveal delay={0.05}>
        {rows.length === 0 ? (
          <p className="border-y border-ink/10 py-10 text-center text-sm text-ink-soft">{T.schedule.empty}</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {rows.map((m) => {
            const isNext = m.id === firstUpcoming;
            const Icon = m.icon;
            return (
              <li
                key={m.id}
                className={cn(
                  "flex items-center gap-4 py-4 transition sm:gap-5",
                  isNext && "border-l-4 border-leaf pl-3 sm:pl-4"
                )}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-leaf-deep">
                  <Icon className="h-5.5 w-5.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-base font-semibold text-ink sm:text-lg">
                    {m.sport}{" "}
                    <span className="font-body font-medium text-ink-soft">
                      {m.category ? `(${m.category})` : m.vs ? `${T.schedule.vs} ${m.vs}` : ""}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <IconClock className="h-3.5 w-3.5" /> {m.time} {T.schedule.timeSuffix}
                    <span className="mx-0.5">•</span>
                    <IconPin className="h-3.5 w-3.5" /> {m.venue}
                  </p>
                </div>
                {m.status === "live" ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    {T.schedule.live}
                  </span>
                ) : m.status === "done" ? (
                  <span className="shrink-0 rounded-full border border-ink/10 bg-mint/60 px-3 py-1 text-xs font-semibold text-ink-soft">
                    {T.schedule.done}
                  </span>
                ) : isNext ? (
                  <span className="shrink-0 rounded-full bg-leaf px-3 py-1 text-xs font-bold text-paper">{T.schedule.next}</span>
                ) : (
                  <span className="shrink-0 rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold text-ink-soft">
                    {T.schedule.waiting}
                  </span>
                )}
              </li>
            );
          })}
          </ul>
        )}
      </Reveal>
    </section>
  );
}

type OpenMeteo = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
  };
};

type WeatherState = {
  temp: number;
  hi: number;
  lo: number;
  at: string;
  next: { label: string; temp: number }[];
};

function WeatherSection() {
  const [data, setData] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const r = await fetch(WEATHER_URL);
        if (!r.ok) throw new Error();
        const json = (await r.json()) as OpenMeteo;
        if (!alive) return;
        const times = json.hourly?.time ?? [];
        const temps = json.hourly?.temperature_2m ?? [];
        if (!times.length || !temps.length) return;
        const nowMs = Date.now();
        let idx = 0;
        times.forEach((t, i) => {
          if (new Date(`${t}:00+07:00`).getTime() <= nowMs) idx = i;
        });
        const dayPrefix = times[idx].slice(0, 10);
        const dayTemps = temps.filter((_, i) => times[i].startsWith(dayPrefix));
        const next = times.slice(idx, idx + 8).map((t, i) => ({
          label: i === 0 ? T.weather.now : `${t.slice(11, 13)} ${T.schedule.timeSuffix}`,
          temp: temps[idx + i] ?? 0,
        }));
        setData({
          temp: temps[idx],
          hi: Math.max(...dayTemps),
          lo: Math.min(...dayTemps),
          at: times[idx].slice(11, 16),
          next,
        });
      } catch {
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const id = window.setInterval(load, 600_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const advice = !data
    ? ""
    : data.temp >= 32
      ? T.weather.adviceHot
      : data.temp >= 28
        ? T.weather.adviceWarm
        : T.weather.adviceCool;

  const temps = data?.next.map((h) => h.temp) ?? [0, 1];
  const min = Math.min(...temps);
  const range = Math.max(Math.max(...temps) - min, 0.5);

  return (
    <section className="mx-auto max-w-5xl px-5 pt-10 sm:pt-14">
      <Reveal>
        <div className="rounded-2xl border border-leaf/20 bg-mint/70 px-5 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display flex items-center gap-2 text-xs font-semibold tracking-[0.28em] text-leaf-deep uppercase">
              <IconThermo className="h-4 w-4" /> {T.weather.title}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              {loading && <IconRefresh className="h-3.5 w-3.5 animate-spin text-leaf" />}
              {data ? `${T.weather.updated} ${data.at} ${T.schedule.timeSuffix} • ${T.weather.source}` : T.weather.loading}
            </p>
          </div>

          {data ? (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="font-display text-4xl font-extrabold text-ink tabular-nums sm:text-6xl">
                  {data.temp.toFixed(1)}
                  <span className="text-2xl text-leaf-deep sm:text-4xl">°C</span>
                </p>
                <p className="text-sm text-ink-soft">
                  {T.weather.high} <strong className="font-display text-ink">{data.hi.toFixed(0)}°</strong> • {T.weather.low}{" "}
                  <strong className="font-display text-ink">{data.lo.toFixed(0)}°</strong>
                  <span className="mt-0.5 block">{advice}</span>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-1.5 border-t border-leaf-deep/15 pt-4 sm:grid-cols-8">
                {data.next.map((h) => (
                  <div key={h.label} className="flex flex-col items-center gap-1.5">
                    <span className="font-display text-xs font-bold text-ink tabular-nums">{Math.round(h.temp)}°</span>
                    <div className="flex h-16 w-full items-end justify-center">
                      <div className="w-3 rounded-full bg-leaf/70" style={{ height: `${28 + ((h.temp - min) / range) * 72}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-ink-soft">{h.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-32 items-center justify-center text-sm text-ink-soft">
              {loading ? T.weather.loadingDetail : T.weather.loadFailed}
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

type Postit = {
  id: string;
  message: string;
  color: PostitColor;
  position: { x: number; y: number };
  timestamp: string;
};

function CheerWall() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { data: apiNotes } = useApi<Postit[]>(`${API_BASE}/api/cheer-wall`, 15_000);
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<PostitColor>("neon");
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState("");
  const [localNotes, setLocalNotes] = useState<Postit[]>([]);

  const notes = useMemo(() => {
    const seen = new Set<string>();
    return [...(apiNotes ?? []), ...localNotes].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [apiNotes, localNotes]);

  function pickSpot(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(93, Math.max(7, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(90, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));
    setPending({ x: Math.round(x), y: Math.round(y) });
    setStatus("");
  }

  async function stick() {
    if (!message.trim() || !pending) {
      setStatus(T.cheerWall.errorNoMessage);
      return;
    }
    const note: Postit = {
      id: crypto.randomUUID(),
      message: message.trim().slice(0, 60),
      color,
      position: pending,
      timestamp: new Date().toISOString(),
    };
    setMessage("");
    setPending(null);
    setStatus(T.cheerWall.success);
    setLocalNotes((prev) => [...prev, note]);
    try {
      await fetch(`${API_BASE}/api/cheer-wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
    } catch {
    }
  }

  return (
    <section id="wall" className="mx-auto max-w-5xl scroll-mt-20 px-5 pt-14 sm:pt-20">
      <Reveal>
        <SectionHead no="02" icon={IconPushPin} title={T.cheerWall.title} sub={T.cheerWall.sub} />
      </Reveal>
      <Reveal delay={0.05}>
        <div
          ref={boardRef}
          onClick={pickSpot}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setPending({ x: 50, y: 50 })}
          className={cn(
            "board-grid relative h-[400px] cursor-crosshair overflow-hidden rounded-2xl border border-leaf-deep/50 bg-board sm:h-[480px]",
            pending && "ring-2 ring-limepop/70"
          )}
        >
          <span className="font-display absolute top-4 left-5 z-10 flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-limepop/80 uppercase">
            <IconPushPin className="h-3.5 w-3.5" />
            {T.cheerWall.boardLabel} • {notes.length} {T.cheerWall.boardUnit}
          </span>

          {pending && (
            <div
              className="font-hand absolute z-20 w-28 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-dashed border-limepop p-3 text-sm text-limepop/90"
              style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
            >
              {message.trim() ? message.trim().slice(0, 30) : T.cheerWall.pinHere}
            </div>
          )}

          {notes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.7, y: -14 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: i % 2 === 0 ? -2.5 : 2.5 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className={cn("font-hand absolute w-28 -translate-x-1/2 -translate-y-1/2 p-3 pt-4 text-[15px] leading-snug sm:w-32", POSTIT_THEMES[n.color].note)}
              style={{ left: `${n.position.x}%`, top: `${n.position.y}%` }}
            >
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-400 shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
              {n.message}
            </motion.div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-5 rounded-2xl border border-ink/10 bg-white/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label htmlFor="cheer-msg" className="font-display text-sm font-semibold text-ink">
                {T.cheerWall.yourMessage}
              </label>
              <textarea
                id="cheer-msg"
                rows={2}
                maxLength={60}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={T.cheerWall.placeholder}
                className="mt-2 w-full resize-none rounded-xl border border-ink/15 bg-paper px-4 py-3 text-base outline-none placeholder:text-ink-soft/50 focus:border-leaf focus:ring-2 focus:ring-leaf/25"
              />
              <p className="mt-1 text-right text-xs text-ink-soft">{message.length}/60</p>
            </div>
            <div className="sm:w-56">
              <span className="font-display text-sm font-semibold text-ink">{T.cheerWall.paperColor}</span>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(Object.keys(POSTIT_THEMES) as PostitColor[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    title={POSTIT_THEMES[key].label}
                    aria-label={POSTIT_THEMES[key].label}
                    className={cn(
                      "h-11 rounded-lg transition hover:scale-105 active:scale-95",
                      POSTIT_THEMES[key].note,
                      color === key ? "ring-2 ring-leaf-deep ring-offset-2 ring-offset-paper" : "opacity-75"
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={stick}
                className="font-display mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-leaf-deep px-5 py-3 text-base font-semibold text-paper transition hover:bg-leaf active:scale-[0.98]"
              >
                <IconPushPin className="h-4.5 w-4.5" />
                {T.cheerWall.stick}
              </button>
            </div>
          </div>
          <p className={cn("mt-3 text-sm", status ? "font-medium text-leaf-deep" : "text-ink-soft")}>
            {status || pending ? status || `${T.cheerWall.positionHint}: ${pending?.x}%, ${pending?.y}% — ${T.cheerWall.positionReady}` : T.cheerWall.defaultHint}
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function RegisterSection() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [level, setLevel] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  function toggleSport(s: string) {
    setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!gender || !level || sports.length === 0) {
      setStatus(T.register.errorIncomplete);
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender, level, sports }),
      });
      if (!res.ok) throw new Error();
    } catch {
    }
    setSending(false);
    setStatus(T.register.success);
    setName("");
    setGender("");
    setLevel("");
    setSports([]);
  }

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-base outline-none placeholder:text-ink-soft/50 focus:border-leaf focus:ring-2 focus:ring-leaf/25";
  const chipCls = (active: boolean) =>
    cn(
      "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-95",
      active
        ? "border-leaf-deep bg-leaf-deep text-paper shadow-[0_6px_14px_rgba(15,107,51,0.25)]"
        : "border-ink/15 bg-paper text-ink-soft hover:border-leaf hover:text-leaf-deep"
    );

  return (
    <section id="register" className="mx-auto max-w-5xl scroll-mt-20 px-5 pt-14 sm:pt-20">
      <Reveal>
        <SectionHead no="03" icon={IconPersonAdd} title={T.register.title} sub={T.register.sub} />
      </Reveal>
      <Reveal delay={0.05}>
        <form onSubmit={submit} className="rounded-2xl border border-ink/10 bg-white/70 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="font-display text-sm font-semibold text-ink">{T.register.yourTeam}</span>
            <span className="font-display flex items-center gap-2 rounded-full bg-leaf px-4 py-1.5 text-sm font-bold text-paper">
              <IconCheck className="h-4 w-4" /> {T.register.green}
            </span>
          </div>

          <div>
            <label htmlFor="reg-name" className="font-display text-sm font-semibold text-ink">{T.register.name}</label>
            <input id="reg-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={T.register.namePlaceholder} className={inputCls} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="font-display block text-sm font-semibold text-ink">{T.register.gender}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {T.register.genders.map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)} className={chipCls(gender === g)}>
                    {gender === g && <IconCheck className="h-4 w-4" />}
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-display block text-sm font-semibold text-ink">{T.register.level}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {T.register.levels.map((l) => (
                  <button key={l} type="button" onClick={() => setLevel(l)} className={chipCls(level === l)}>
                    {level === l && <IconCheck className="h-4 w-4" />}
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <span className="font-display block text-sm font-semibold text-ink">
              {T.register.sportsLabel} <span className="font-body font-normal text-ink-soft">{T.register.multiHint}</span>
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPORTS.map((s) => {
                const Icon = SPORT_ICONS[s];
                const active = sports.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSport(s)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95",
                      active
                        ? "border-leaf-deep bg-leaf-deep text-paper shadow-[0_6px_14px_rgba(15,107,51,0.25)]"
                        : "border-ink/15 bg-paper text-ink-soft hover:border-leaf hover:text-leaf-deep"
                    )}
                  >
                    {Icon && <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-limepop" : "text-leaf-deep")} />}
                    <span className="min-w-0 flex-1 text-left">{s}</span>
                    {active && <IconCheck className="h-4 w-4 shrink-0 text-limepop" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-soft">{T.register.sportsNote}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={sending}
              className="font-display flex w-full items-center justify-center gap-2 rounded-full bg-leaf-deep px-8 py-3.5 text-base font-semibold text-paper transition hover:bg-leaf active:scale-[0.98] disabled:opacity-60 sm:w-auto"
            >
              <IconSend className="h-4.5 w-4.5" />
              {sending ? T.register.sending : T.register.submit}
            </button>
            {status && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-leaf-deep" role="status">
                <IconCheck className="h-4 w-4" />
                {status}
              </p>
            )}
          </div>
        </form>
      </Reveal>
    </section>
  );
}

function ScoreSection() {
  const { data } = useApi<Record<string, string | number | boolean | null>>(`${API_BASE}/api/scores`, 30_000);
  const hasApi = !!data && Object.keys(data).length > 0;
  const s = (hasApi ? data : config.score) as Record<string, string | number>;

  const medals = [
    { label: T.score.medals[0], value: Number(s["เหรียญทอง"] ?? s["ทอง"]) || 0, tint: "text-amber-500" },
    { label: T.score.medals[1], value: Number(s["เหรียญเงิน"] ?? s["เงิน"]) || 0, tint: "text-zinc-400" },
    { label: T.score.medals[2], value: Number(s["เหรียญทองแดง"] ?? s["ทองแดง"]) || 0, tint: "text-orange-700" },
  ];
  const rank = s["อันดับ"] || "—";
  const totalColors = s["จำนวนสี"] || "—";

  return (
    <section id="score" className="mx-auto max-w-5xl scroll-mt-20 px-5 pt-14 sm:pt-20">
      <Reveal>
        <SectionHead no="04" icon={IconTrophy} title={T.score.title} sub={T.score.sub} />
      </Reveal>
      <Reveal delay={0.05}>
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-5 sm:p-7">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            {medals.map((m) => (
              <div key={m.label} className="flex items-center gap-2.5">
                <IconMedal className={cn("h-6 w-6", m.tint)} />
                <span className="text-sm text-ink-soft">{m.label}</span>
                <span className="font-display text-3xl font-extrabold text-ink tabular-nums sm:text-4xl">{m.value}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <IconTrophy className="h-8 w-8 text-leaf" />
              <div>
                <span className="font-display text-sm font-semibold text-leaf-deep">{T.score.currentRank}</span>
                <p className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                  {rank} <span className="text-base font-semibold text-ink-soft">{T.score.from} {totalColors} {T.score.colors}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function CheerHub() {
  const [count, setCount] = useState(0);
  const [cheered, setCheered] = useState(() => loadLS(CHEERED_KEY, false));
  const [burst, setBurst] = useState(0);
  const [openSong, setOpenSong] = useState<number | null>(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/cheer-count`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCount(Number(d.count) || 0))
      .catch(() => {});
  }, []);

  function getDeviceId() {
    let id = loadLS(DEVICE_KEY, "");
    if (!id) {
      id = crypto.randomUUID();
      saveLS(DEVICE_KEY, id);
    }
    return id;
  }

  async function cheer() {
    if (cheered) return;
    try {
      const r = await fetch(`${API_BASE}/api/cheer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setCount(Number(d.count) || 0);
      if (!d.already) setBurst((b) => b + 1);
      setCheered(true);
      saveLS(CHEERED_KEY, true);
    } catch {
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 pt-14 sm:pt-20">
      <Reveal>
        <SectionHead no="05" icon={IconMusic} title={T.cheerHub.title} sub={T.cheerHub.sub} />
      </Reveal>
      <Reveal delay={0.05}>
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 sm:p-6">
          <div className="space-y-2.5" role="list">
            {SONGS.map((song, i) => {
              const isOpen = openSong === i;
              return (
                <div
                  key={song.title}
                  role="listitem"
                  className={cn(
                    "overflow-hidden rounded-xl border transition",
                    isOpen
                      ? "border-leaf-deep/30 bg-paper shadow-[0_8px_20px_rgba(14,36,21,0.06)]"
                      : "border-ink/10 bg-paper/60 hover:border-leaf/50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSong(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`song-${i}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full transition",
                        isOpen ? "bg-leaf-deep text-limepop" : "bg-mint text-leaf-deep"
                      )}
                    >
                      <IconMusic className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-base font-bold text-ink">{song.title}</span>
                      <span className="block truncate text-xs text-ink-soft">{song.hook}</span>
                    </span>
                    <IconChevron
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-300",
                        isOpen ? "rotate-180 text-leaf-deep" : "text-ink-soft"
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="lyrics"
                        id={`song-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <ol className="space-y-2 border-t border-ink/10 px-5 py-4">
                          {song.lyrics.map((line, li) => (
                            <li key={li} className="flex items-baseline gap-3">
                              <span className="font-display w-6 shrink-0 text-xs font-bold text-ink-soft/50 tabular-nums">
                                {String(li + 1).padStart(2, "0")}
                              </span>
                              <span className="font-display text-[15px] leading-relaxed font-semibold text-leaf-deep">
                                {line}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-ink/10 pt-5">
            <button
              type="button"
              onClick={cheer}
              disabled={cheered}
              className="font-display relative inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-base font-semibold text-paper transition hover:bg-leaf-deep active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <IconBolt className="h-4.5 w-4.5" />
              {cheered ? T.cheerHub.cheered : T.cheerHub.cheer}
              {burst > 0 && (
                <motion.span
                  key={burst}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -28, scale: 1.25 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="font-display pointer-events-none absolute -top-2 right-3 text-limepop"
                >
                  +1
                </motion.span>
              )}
            </button>
            <p className="text-sm text-ink-soft">
              {T.cheerHub.sentPrefix} <strong className="font-display text-base font-bold text-leaf-deep tabular-nums">{count}</strong> {T.cheerHub.times}
              {cheered && <span className="ml-1 font-medium text-leaf-deep">• {T.cheerHub.already}</span>}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-ink/10">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center">
        <p className="flex items-center gap-2">
          <LeafMark className="h-4 w-4 text-leaf" />
          <span className="font-display font-semibold text-ink">{T.footer.title}</span>
          <span>• {T.footer.team}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <IconBolt className="h-3.5 w-3.5 text-leaf" />
          {T.footer.love}
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <main>
          <CountdownHero />
          <AnnouncementsBanner />
          <ScheduleSection />
          <CheerWall />
          <RegisterSection />
          <ScoreSection />
          <CheerHub />
          <WeatherSection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
