"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaArrowDown,
  FaArrowUpRightFromSquare,
  FaCheck,
  FaFeather,
  FaGear,
  FaLink,
  FaQuoteLeft,
  FaPlus,
  FaTrashCan,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaRightFromBracket,
  FaFloppyDisk,
} from "react-icons/fa6";
import type { HomeContent, Service, Quote } from "@/lib/site-types";
import ServiceIcon from "@/components/service-icon";
import { serviceIconNames, serviceIconLabels } from "@/lib/service-icons";
import { homeContentSchema } from "@/lib/settings-schema";

type Tab = "site" | "services" | "quotes";
const tabs = [
  {
    id: "site" as const,
    label: "站点信息",
    description: "让小站更像你",
    icon: FaGear,
  },
  {
    id: "services" as const,
    label: "服务链接",
    description: "收藏生活的入口",
    icon: FaLink,
  },
  {
    id: "quotes" as const,
    label: "一言寄语",
    description: "留下一些喜欢的话",
    icon: FaQuoteLeft,
  },
];
const colors = [
  { id: "green", name: "松绿" },
  { id: "sky", name: "晴蓝" },
  { id: "rose", name: "玫瑰" },
  { id: "teal", name: "青碧" },
  { id: "amber", name: "琥珀" },
  { id: "orange", name: "暖橙" },
];

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || "操作失败，请重试", response.status);
  return data;
}
function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`settings-field${wide ? " field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function Settings({
  initialContent,
  configured,
}: {
  initialContent: HomeContent | null;
  configured: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [authenticated, setAuthenticated] = useState(Boolean(initialContent));
  const [tab, setTab] = useState<Tab>("site");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const keyInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);

  useEffect(() => {
    if (!authenticated) keyInput.current?.focus();
  }, [authenticated]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(next: HomeContent) {
    setContent(next);
    setMessage("");
  }
  function updateService(index: number, patch: Partial<Service>) {
    if (content)
      edit({
        ...content,
        services: content.services.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
  }
  function updateQuote(index: number, patch: Partial<Quote>) {
    if (content)
      edit({
        ...content,
        quotes: content.quotes.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
  }
  function move(kind: "services" | "quotes", index: number, direction: number) {
    if (!content) return;
    const items = [...content[kind]];
    [items[index], items[index + direction]] = [
      items[index + direction],
      items[index],
    ];
    edit({
      ...content,
      [kind]: items.map((item, i) => ({ ...item, sort_order: i })),
    });
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await api("login", "POST", { key });
      // Cookie 是否成功保存也由读取接口验证，避免 HTTP 下 Secure Cookie 丢失后误报登录成功。
      const latest = await api<HomeContent>("settings");
      if (!content) {
        setContent(latest);
        setSaved(latest);
      }
      setAuthenticated(true);
      setKey("");
      setShowKey(false);
    } catch (error) {
      setLoginError(
        error instanceof ApiError &&
          error.status === 401 &&
          error.message === "请先登录"
          ? "会话未能保存。请使用 HTTPS；本地 HTTP 调试需关闭 Secure Cookie。"
          : error instanceof ApiError
            ? error.message
            : "连接失败，请检查网络后重试",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!content) return;
    const result = homeContentSchema.safeParse({
      ...content,
      services: content.services.map((item, i) => ({ ...item, sort_order: i })),
      quotes: content.quotes.map((item, i) => ({ ...item, sort_order: i })),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      setTab(issue.path[0] as Tab);
      setMessage(issue.message);
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await api<{ content: HomeContent }>(
        "settings",
        "PUT",
        result.data,
      );
      setContent(response.content);
      setSaved(response.content);
      setMessage("已保存，首页内容已更新。");
      setIsError(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthenticated(false);
        setLoginError("登录已过期，重新登录后可继续保存。你的修改已保留。");
      } else {
        setMessage(
          error instanceof ApiError
            ? error.message
            : "连接失败，修改仍已保留，请重试",
        );
        setIsError(true);
      }
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (
      dirty &&
      !window.confirm("还有未保存的修改，确定退出并放弃这些修改吗？")
    )
      return;
    setBusy(true);
    try {
      await api("logout", "POST");
      setAuthenticated(false);
      setContent(null);
      setSaved(null);
      setMessage("");
      setLoginError("");
      setKey("");
    } catch {
      setMessage("退出失败，请重试");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  const loginPanel = (
    <div className="settings-login-wrap">
      <section
        className="settings-login paper-card"
        aria-labelledby="login-title"
      >
        <span className="settings-emblem">
          <FaLock />
        </span>
        <span className="settings-eyebrow">YOUR LITTLE CORNER</span>
        <h1 id="login-title">打理你的小站</h1>
        <p>
          {content
            ? "重新登录，继续刚才的编辑。"
            : "一枚密钥，回到属于你的创作空间。"}
        </p>
        <form onSubmit={login}>
          <Field
            label="管理密钥"
            hint="输入 16 位管理密钥，登录状态保留 12 小时。"
          >
            <span className="settings-password">
              <input
                ref={keyInput}
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                minLength={16}
                maxLength={16}
                required
                autoComplete="current-password"
                spellCheck={false}
                placeholder="请输入管理密钥"
                disabled={busy || !configured}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                aria-pressed={showKey}
              >
                {showKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </span>
          </Field>
          {!configured && (
            <p className="settings-error" role="alert">
              尚未配置管理密钥，请先完成服务端环境变量配置。
            </p>
          )}
          {loginError && (
            <p className="settings-error" role="alert">
              {loginError}
            </p>
          )}
          <button
            className="settings-button primary login-submit"
            disabled={busy || !configured}
          >
            {busy ? "正在验证…" : "进入设置"}
            <FaArrowRight />
          </button>
        </form>
        <Link
          className="settings-back"
          href="/"
          onClick={(event) => {
            if (dirty && !window.confirm("确定离开并放弃未保存的修改吗？"))
              event.preventDefault();
          }}
        >
          <FaArrowLeft /> 返回首页
        </Link>
      </section>
      <p className="settings-login-caption">
        <FaFeather /> 留一点时间，整理生活与热爱。
      </p>
    </div>
  );

  if (!authenticated)
    return <main className="settings-page">{loginPanel}</main>;
  if (!content) return null;
  const current = tabs.find((item) => item.id === tab)!;

  return (
    <main className="settings-page">
      <header className="settings-topbar">
        <Link
          href="/"
          className="settings-wordmark"
          onClick={(event) => {
            if (dirty && !window.confirm("确定离开并放弃未保存的修改吗？"))
              event.preventDefault();
          }}
        >
          <FaFeather />
          <span>
            小站手记 <span>/ 设置</span>
          </span>
        </Link>
        <div className="settings-top-actions">
          <a href="/" target="_blank" rel="noopener noreferrer">
            查看首页 <FaArrowUpRightFromSquare />
          </a>
          <button type="button" onClick={logout} disabled={busy}>
            <FaRightFromBracket /> 退出
          </button>
        </div>
      </header>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-intro">
            <span className="settings-eyebrow">MAKE IT YOURS</span>
            <h1>
              小站，由你定义<span>。</span>
            </h1>
            <p>
              把喜欢的事物，
              <br />
              放在每天出发的地方。
            </p>
          </div>
          <nav className="settings-nav" aria-label="设置分区">
            {tabs.map(({ id, label, description, icon: Icon }, index) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => setTab(id)}
              >
                <Icon />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <span className="settings-nav-index">0{index + 1}</span>
              </button>
            ))}
          </nav>
          <div className="settings-mini-preview paper-card">
            <span className="settings-eyebrow">你的小站 · 即时预览</span>
            <div className="settings-preview-name">
              {content.site.name || "你的名字"}
              <small>{content.site.domain}</small>
            </div>
            <p>{content.site.tagline || "写一句喜欢的话吧。"}</p>
            <div className="settings-preview-stats">
              <span>
                <strong>
                  {content.services.filter((item) => item.enabled).length}
                </strong>{" "}
                个服务
              </span>
              <span>
                <strong>
                  {content.quotes.filter((item) => item.enabled).length}
                </strong>{" "}
                条寄语
              </span>
            </div>
          </div>
        </aside>
        <form className="settings-workspace" onSubmit={save} noValidate>
          <div className="settings-section-heading">
            <div>
              <span className="settings-eyebrow">
                0{tabs.findIndex((item) => item.id === tab) + 1} / PERSONALIZE
              </span>
              <h2>{current.label}</h2>
              <p>
                {tab === "site"
                  ? "从一个名字开始，让每次相遇都有记忆。"
                  : tab === "services"
                    ? "常去的地方，值得一个触手可及的入口。"
                    : "收藏打动你的句子，让首页多一点温度。"}
              </p>
            </div>
            <span className="settings-section-icon">
              <current.icon />
            </span>
          </div>
          <fieldset className="settings-editor" disabled={busy}>
            {tab === "site" && (
              <section className="settings-card paper-card">
                <div className="settings-card-heading">
                  <h3>关于小站</h3>
                  <span>名字、签名与联系方式</span>
                </div>
                <div className="settings-fields">
                  <Field label="站点名称" hint="显示在首页最醒目的位置。">
                    <input
                      value={content.site.name}
                      maxLength={80}
                      placeholder="例如 xbaimu"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, name: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="域名后缀">
                    <input
                      value={content.site.domain}
                      maxLength={100}
                      placeholder=".top"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, domain: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="个性签名" wide hint="一句话，表达此刻的你。">
                    <textarea
                      rows={3}
                      value={content.site.tagline}
                      maxLength={200}
                      placeholder="静水流深 · 沧笙踏歌"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, tagline: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="位置名称" hint="显示在首页时钟下方，可留空。">
                    <input
                      value={content.site.location}
                      maxLength={100}
                      placeholder="例如：杭州市 · 西湖区"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, location: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="地区 areacode" hint="填写天气服务对应的地区编码，可留空。">
                    <input
                      type="text"
                      value={content.site.areacode}
                      maxLength={64}
                      placeholder="填写所用天气服务的地区编码"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, areacode: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="联系邮箱">
                    <input
                      type="email"
                      value={content.site.email}
                      maxLength={254}
                      placeholder="hello@example.com"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: { ...content.site, email: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="备案信息">
                    <input
                      value={content.site.registration}
                      maxLength={100}
                      placeholder="没有备案可留空"
                      onChange={(e) =>
                        edit({
                          ...content,
                          site: {
                            ...content.site,
                            registration: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </section>
            )}
            {tab === "services" && (
              <div className="settings-item-list">
                {content.services.map((item, index) => (
                  <section className="settings-card paper-card" key={item.id}>
                    <div className="settings-item-heading">
                      <span
                        className={`settings-item-symbol theme-${item.color}`}
                      >
                        <ServiceIcon name={item.icon} />
                      </span>
                      <div>
                        <h3>{item.title || "新服务"}</h3>
                        <span>服务 {String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="settings-item-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => move("services", index, -1)}
                          aria-label={`上移服务 ${index + 1}`}
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          type="button"
                          disabled={index === content.services.length - 1}
                          onClick={() => move("services", index, 1)}
                          aria-label={`下移服务 ${index + 1}`}
                        >
                          <FaArrowDown />
                        </button>
                        <button
                          type="button"
                          className="delete"
                          aria-label={`删除服务 ${index + 1}`}
                          onClick={() =>
                            edit({
                              ...content,
                              services: content.services.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          <FaTrashCan />
                        </button>
                      </div>
                    </div>
                    <div className="settings-fields">
                      <Field label="服务名称">
                        <input
                          value={item.title}
                          maxLength={80}
                          placeholder="例如 我的博客"
                          onChange={(e) =>
                            updateService(index, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="简短描述">
                        <input
                          value={item.description}
                          maxLength={200}
                          placeholder="记录日常与灵感"
                          onChange={(e) =>
                            updateService(index, {
                              description: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="访问链接" wide>
                        <input
                          type="url"
                          value={item.href}
                          maxLength={2048}
                          placeholder="https://example.com"
                          onChange={(e) =>
                            updateService(index, { href: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="所属分类">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateService(index, {
                              category: e.target.value as Service["category"],
                            })
                          }
                        >
                          <option value="personal">生活随笔</option>
                          <option value="tools">实用工具</option>
                        </select>
                      </Field>
                      <Field label="卡片配色">
                        <select
                          value={item.color}
                          onChange={(e) =>
                            updateService(index, { color: e.target.value })
                          }
                        >
                          {colors.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <fieldset className={`settings-icon-picker theme-${item.color}`}>
                      <legend>服务图标</legend>
                      <div className="settings-icon-options">
                        {serviceIconNames.map((name) => (
                          <label key={name} className="settings-icon-option">
                            <input type="radio" name={`service-icon-${item.id}`} value={name}
                              checked={item.icon === name}
                              onChange={() => updateService(index, { icon: name })} />
                            <span><ServiceIcon name={name} /><small>{serviceIconLabels[name]}</small></span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updateService(index, { enabled: e.target.checked })
                        }
                      />
                      <span className="switch-track" />
                      <span>
                        在首页显示
                        <small>
                          {item.enabled
                            ? "访客可以看到这个服务"
                            : "已隐藏，内容仍会保留"}
                        </small>
                      </span>
                    </label>
                  </section>
                ))}
                {content.services.length === 0 && (
                  <div className="settings-empty paper-card">
                    <FaLink />
                    <h3>从一个喜欢的网站开始</h3>
                    <p>添加博客、工具或你自己的服务。</p>
                  </div>
                )}
                <button
                  type="button"
                  className="settings-add"
                  disabled={content.services.length >= 50}
                  onClick={() =>
                    edit({
                      ...content,
                      services: [
                        ...content.services,
                        {
                          id: Array.from(
                            crypto.getRandomValues(new Uint8Array(12)),
                            (byte) => byte.toString(16).padStart(2, "0"),
                          ).join(""),
                          title: "",
                          description: "",
                          href: "",
                          color: "green",
                          icon: "link",
                          category: "personal",
                          sort_order: content.services.length,
                          enabled: true,
                        },
                      ],
                    })
                  }
                >
                  <FaPlus /> 添加服务{" "}
                  <span>{content.services.length} / 50</span>
                </button>
              </div>
            )}
            {tab === "quotes" && (
              <div className="settings-item-list">
                {content.quotes.map((item, index) => (
                  <section className="settings-card paper-card" key={item.id}>
                    <div className="settings-item-heading">
                      <span className="settings-item-symbol quote-symbol">
                        <FaQuoteLeft />
                      </span>
                      <div>
                        <h3>寄语 {String(index + 1).padStart(2, "0")}</h3>
                        <span>总有一句，与你共鸣</span>
                      </div>
                      <div className="settings-item-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => move("quotes", index, -1)}
                          aria-label={`上移寄语 ${index + 1}`}
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          type="button"
                          disabled={index === content.quotes.length - 1}
                          onClick={() => move("quotes", index, 1)}
                          aria-label={`下移寄语 ${index + 1}`}
                        >
                          <FaArrowDown />
                        </button>
                        <button
                          type="button"
                          className="delete"
                          aria-label={`删除寄语 ${index + 1}`}
                          onClick={() =>
                            edit({
                              ...content,
                              quotes: content.quotes.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          <FaTrashCan />
                        </button>
                      </div>
                    </div>
                    <div className="settings-fields">
                      <Field label="寄语内容" wide>
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={item.text}
                          placeholder="愿你所行，皆为热爱。"
                          onChange={(e) =>
                            updateQuote(index, { text: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="作者 / 出处" wide>
                        <input
                          value={item.author}
                          maxLength={100}
                          placeholder="可以留空"
                          onChange={(e) =>
                            updateQuote(index, { author: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updateQuote(index, { enabled: e.target.checked })
                        }
                      />
                      <span className="switch-track" />
                      <span>
                        在首页显示
                        <small>
                          {item.enabled
                            ? "访客可点击切换到这条寄语"
                            : "已隐藏，内容仍会保留"}
                        </small>
                      </span>
                    </label>
                  </section>
                ))}
                {content.quotes.length === 0 && (
                  <div className="settings-empty paper-card">
                    <FaQuoteLeft />
                    <h3>把喜欢的句子留下来</h3>
                    <p>一段摘录，或一句写给自己的话。</p>
                  </div>
                )}
                <button
                  type="button"
                  className="settings-add"
                  disabled={content.quotes.length >= 100}
                  onClick={() =>
                    edit({
                      ...content,
                      quotes: [
                        ...content.quotes,
                        {
                          id:
                            Math.max(
                              0,
                              ...content.quotes.map((item) => item.id),
                            ) + 1,
                          text: "",
                          author: "",
                          enabled: true,
                          sort_order: content.quotes.length,
                        },
                      ],
                    })
                  }
                >
                  <FaPlus /> 添加寄语 <span>{content.quotes.length} / 100</span>
                </button>
              </div>
            )}
          </fieldset>
          <div className="settings-savebar">
            <div
              className={isError ? "settings-error" : "settings-save-status"}
              role="status"
              aria-live="polite"
            >
              {message || (
                <>
                  <span className={dirty ? "unsaved-dot" : "saved-dot"} />
                  {dirty ? "有未保存的修改" : "所有修改已保存"}
                </>
              )}
            </div>
            <div className="settings-save-actions">
              <button
                type="button"
                className="settings-button secondary"
                disabled={!dirty || busy}
                onClick={() => {
                  if (window.confirm("确定放弃所有未保存的修改吗？")) {
                    setContent(saved);
                    setMessage("");
                  }
                }}
              >
                还原
              </button>
              <button
                className="settings-button primary"
                disabled={!dirty || busy}
              >
                {busy ? (
                  "正在保存…"
                ) : (
                  <>
                    <FaFloppyDisk /> 保存更改
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="settings-footnote">
            <FaCheck /> 保存后，新访问的首页会显示更新后的内容。
          </p>
        </form>
      </div>
    </main>
  );
}
