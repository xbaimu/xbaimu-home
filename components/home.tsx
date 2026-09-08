"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaGithub,
  FaBilibili,
  FaSteam,
  FaXTwitter,
  FaTelegram,
  FaRegEnvelope,
  FaExpand,
  FaCompress,
  FaCompactDisc,
  FaFeather,
  FaRegCommentDots,
  FaRotateRight,
  FaLocationDot,
  FaPaperclip,
  FaAngleRight,
  FaHeart,
} from "react-icons/fa6";
import { site as defaults } from "@/lib/site";
import type { HomeContent } from "@/lib/site-types";
import ServiceIcon from "@/components/service-icon";

const categories = [
  { id: "all", label: "全部服务" },
  { id: "personal", label: "生活随笔" },
  { id: "tools", label: "实用工具" },
];
const socials = (email: string) => [
  { label: "GitHub", href: "https://github.com/xbaimu", icon: FaGithub },
  { label: "哔哩哔哩", href: "https://www.bilibili.com", icon: FaBilibili },
  { label: "Steam", href: "https://store.steampowered.com", icon: FaSteam },
  { label: "电子邮件", href: `mailto:${email}`, icon: FaRegEnvelope },
  { label: "X / Twitter", href: "https://x.com", icon: FaXTwitter },
  { label: "Telegram", href: "https://telegram.org", icon: FaTelegram },
];
const pad = (n: number) => String(n).padStart(2, "0");

export default function Home({
  version,
  content,
}: {
  version: string;
  content: HomeContent;
}) {
  const { site, services, quotes } = content;
  const [now, setNow] = useState<Date | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [category, setCategory] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    const syncFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      void audio.current?.close();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menu.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setNotice("");
    } catch {
      setNotice("当前浏览器暂不支持全屏浏览。");
    }
  }

  async function toggleAudio() {
    try {
      if (!audio.current) {
        const context = new AudioContext();
        audio.current = context;
        const gain = context.createGain();
        gain.gain.value = 0.025;
        gain.connect(context.destination);
        // 本地合成轻柔和弦，无需远程音频请求；仅在点击后播放。
        [130.81, 164.81, 196, 261.63].forEach((frequency) => {
          const oscillator = context.createOscillator();
          oscillator.frequency.value = frequency;
          oscillator.type = "sine";
          oscillator.connect(gain);
          oscillator.start();
        });
      }
      if (playing) await audio.current.suspend();
      else await audio.current.resume();
      setPlaying(!playing);
      setNotice("");
    } catch {
      setNotice("当前浏览器暂不支持氛围音播放。");
    }
  }

  const seconds = now?.getSeconds() ?? 0;
  const minutes = (now?.getMinutes() ?? 10) + seconds / 60;
  const hours = ((now?.getHours() ?? 10) % 12) + minutes / 60;
  const quote = quotes[quoteIndex % quotes.length] ?? {
    text: "暂无寄语",
    author: "",
  };
  const date = now
    ? `${now.getFullYear()}年 ${pad(now.getMonth() + 1)}月 ${pad(now.getDate())}日 星期${"日一二三四五六"[now.getDay()]}`
    : "正在读取本地日期";

  return (
    <div className="homepage">
      <header className="topbar">
        <div className="online">
          <span className="status-dot" />
          <span className="online-label">ONLINE</span>
          <span className="separator">/</span>
          <span className="topbar-description">独立探索与随想起始页</span>
        </div>
        <div className="utilities">
          <button
            className="paper-card icon-button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "退出全屏" : "全屏浏览"}
            title={fullscreen ? "退出全屏" : "全屏浏览"}
          >
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </button>
          <button
            className={`paper-card icon-button music-toggle ${playing ? "is-playing" : ""}`}
            onClick={toggleAudio}
            aria-label={playing ? "暂停氛围音" : "播放氛围音"}
            aria-pressed={playing}
            title={playing ? "暂停氛围音" : "播放氛围音"}
          >
            <FaCompactDisc />
          </button>
        </div>
      </header>

      <main className="main-grid">
        <section className="identity" aria-label="个人介绍">
          <div className="brand">
            <div className="clock-rim" aria-hidden="true">
              <div className="clock-disk">
                {[0, 90, 180, 270].map((angle) => (
                  <span
                    className="clock-marker"
                    key={angle}
                    style={{ transform: `rotate(${angle}deg)` }}
                  />
                ))}
                <span
                  className="clock-hand hour-hand"
                  style={{ transform: `rotate(${hours * 30}deg)` }}
                />
                <span
                  className="clock-hand minute-hand"
                  style={{ transform: `rotate(${minutes * 6}deg)` }}
                />
                <span
                  className="clock-hand second-hand"
                  style={{ transform: `rotate(${seconds * 6}deg)` }}
                />
                <span className="clock-pin" />
              </div>
            </div>
            <div>
              <div className="brand-name">
                <h1>{site.name}</h1>
                <span>{site.domain}</span>
              </div>
              <p className="tagline">
                <FaFeather />
                {site.tagline}
              </p>
            </div>
          </div>
          <article className="paper-card note-card">
            <span className="quote-mark quote-open" aria-hidden="true">
              “
            </span>
            <div className="note-heading">
              <h2>Hello World!</h2>
            </div>
            <p>一个建立于 21 世纪的小站，存活于互联网的边缘。</p>
            <div className="note-footer">
              <span>代码、日常记录与生活偶得</span>
              <span>随遇而安</span>
            </div>
            <span className="quote-mark quote-close" aria-hidden="true">
              ”
            </span>
          </article>
          <nav className="social-dock" aria-label="社交媒体">
            {socials(site.email).map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                className="paper-card social-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
              >
                <Icon />
              </a>
            ))}
          </nav>
        </section>

        <section className="dashboard" aria-label="日常看板与服务">
          <div className="widgets">
            <button
              className="paper-card quote-card"
              disabled={quotes.length < 2}
              onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}
              aria-label="一言寄语，点击换一句"
            >
              <span className="widget-header">
                <span className="quote-label">
                  <FaRegCommentDots />
                  一言寄语
                </span>
                <span className="refresh">
                  <FaRotateRight />
                  换一句
                </span>
              </span>
              <span
                className="quote-content"
                key={quoteIndex}
                aria-live="polite"
              >
                <span className="quote-text">{quote.text}</span>
                <span className="quote-author">—「{quote.author}」</span>
              </span>
            </button>
            <div className="paper-card time-card">
              <div className="widget-header date-header">
                <span className="date">{date}</span>
                <span
                  className="weather"
                  title="模板天气示例，尚未接入实时天气"
                >
                  {defaults.weather.condition} {defaults.weather.temperature}°C
                </span>
              </div>
              <time className="digital-clock" dateTime={now?.toISOString()}>
                {now
                  ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(seconds)}`
                  : "--:--:--"}
              </time>
              <div className="weather-footer">
                <span>
                  <FaLocationDot />
                  {site.location || "未设置位置"}
                </span>
                <span title="模板空气质量示例，尚未接入实时数据">
                  空气质量 {defaults.weather.air}
                </span>
              </div>
            </div>
          </div>
          <div className="services-heading">
            <h2>
              <FaPaperclip />
              随风飘落·随性而为
            </h2>
            <div className="category-control" ref={menu}>
              <button
                className="category-trigger"
                aria-expanded={menuOpen}
                aria-controls="category-options"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {category === "all"
                  ? "分类导航"
                  : categories.find((item) => item.id === category)?.label}
                <FaAngleRight />
              </button>
              {menuOpen && (
                <div id="category-options" className="paper-card category-menu">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={item.id === category}
                      onClick={() => {
                        setCategory(item.id);
                        setMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <nav className="service-grid" aria-label="网站与服务">
            {services
              .filter(
                (item) => category === "all" || item.category === category,
              )
              .map((item) => {
                return (
                  <a
                    className={`paper-card service-tile theme-${item.color}`}
                    href={item.href}
                    key={item.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="service-icon">
                      <ServiceIcon name={item.icon} />
                    </span>
                    <span className="service-copy">
                      <span className="service-title">{item.title}</span>
                      <span className="service-description">
                        {item.description}
                      </span>
                    </span>
                  </a>
                );
              })}
          </nav>
          <nav className="pagination" aria-label="服务分类">
            {categories.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                aria-current={category === item.id ? "true" : undefined}
                className={category === item.id ? "active" : ""}
                onClick={() => setCategory(item.id)}
              >
                <span />
              </button>
            ))}
          </nav>
        </section>
      </main>

      <footer className="footer">
        <span>
          Copyright © 2020 - {now?.getFullYear() ?? 2026} &amp; Made with{" "}
          <FaHeart /> by {site.name}{" "}
          <span className="site-version" aria-label={`网站版本 ${version}`}>
            {version}
          </span>
        </span>
        <span className="footer-divider">|</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {site.registration}
        </a>
        <span className="footer-divider">|</span>
        <span className="system-status" title="模板展示数据，尚未接入运行监控">
          <span className="status-dot" />
          系统运行正常 (99.98%)
        </span>
      </footer>
      <span role="status" className={notice ? "notice paper-card" : "sr-only"}>
        {notice}
      </span>
    </div>
  );
}
