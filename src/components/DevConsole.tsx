import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { adminApi } from "@/api";
import { formatTime } from "@/types";

type Tab = "stats" | "users" | "chats" | "messages";

interface Stats { users: number; chats: number; messages: number; sessions: number; active_today: number }
interface AdminUser { id: number; username: string; display_name: string; email: string; avatar_letters: string; created_at: string; last_seen_at: string }
interface AdminChat { id: number; created_at: string; user1_name: string; user1_username: string; user2_name: string; user2_username: string; msg_count: number; last_msg_at: string }
interface AdminMessage { id: number; chat_id: number; text: string; created_at: string; sender_name: string; sender_username: string; sender_avatar: string; file_url?: string; file_name?: string; file_type?: string }

export function DevConsole({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"password" | "panel">("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("stats");

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<AdminChat | null>(null);
  const [pwd, setPwd] = useState("");

  const tryLogin = async () => {
    setLoading(true); setError("");
    const res = await adminApi.stats(password);
    setLoading(false);
    if (res.error) { setError("Неверный пароль"); return; }
    setPwd(password);
    setStats(res);
    setStep("panel");
  };

  const loadTab = async (t: Tab) => {
    setTab(t);
    setSelectedChat(null);
    if (t === "stats" && !stats) {
      const res = await adminApi.stats(pwd);
      if (!res.error) setStats(res);
    } else if (t === "users" && users.length === 0) {
      const res = await adminApi.users(pwd);
      if (res.users) setUsers(res.users);
    } else if (t === "chats" && chats.length === 0) {
      const res = await adminApi.chats(pwd);
      if (res.chats) setChats(res.chats);
    } else if (t === "messages" && messages.length === 0) {
      const res = await adminApi.messages(pwd);
      if (res.messages) setMessages(res.messages);
    }
  };

  const openChatMessages = async (chat: AdminChat) => {
    setSelectedChat(chat);
    const res = await adminApi.messages(pwd, chat.id);
    if (res.messages) setMessages(res.messages);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabItems: { id: Tab; icon: string; label: string }[] = [
    { id: "stats", icon: "BarChart2", label: "Статистика" },
    { id: "users", icon: "Users", label: "Пользователи" },
    { id: "chats", icon: "MessageSquare", label: "Чаты" },
    { id: "messages", icon: "MessageCircle", label: "Сообщения" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
      {step === "password" ? (
        <div className="w-full max-w-xs animate-scale-in">
          <div className="surface rounded-2xl p-6" style={{ border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(99,102,241,0.2)" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon name="Terminal" size={18} className="text-indigo-400" />
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Dev Console</span>
              </div>
              <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-70 transition-opacity">
                <Icon name="X" size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Введите пароль разработчика</p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tryLogin()}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all mb-3"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              placeholder="••••••••••••••••"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button onClick={tryLogin} disabled={loading || !password}
              className="w-full py-2.5 rounded-xl text-sm font-medium gradient-btn text-white disabled:opacity-50 transition-all">
              {loading ? "Проверяю..." : "Войти"}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-4 animate-scale-in flex flex-col" style={{ height: "85vh" }}>
          <div className="surface rounded-2xl flex flex-col h-full overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 60px rgba(99,102,241,0.15)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)", background: "var(--header-bg)" }}>
              <div className="flex items-center gap-2">
                <Icon name="Terminal" size={16} className="text-indigo-400" />
                <span className="font-bold text-sm text-indigo-400">Dev Console</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">v1.0</span>
              </div>
              <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-70 transition-opacity p-1">
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-2 gap-1 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
              {tabItems.map(t => (
                <button key={t.id} onClick={() => loadTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 ${tab === t.id ? "border-indigo-500 text-indigo-400" : "border-transparent"}`}
                  style={{ color: tab === t.id ? undefined : "var(--text-secondary)" }}>
                  <Icon name={t.icon} size={13} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">

              {/* STATS */}
              {tab === "stats" && stats && (
                <div>
                  <p className="text-xs mb-4 font-mono" style={{ color: "var(--text-muted)" }}>// Общая статистика проекта</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Пользователей", value: stats.users, icon: "Users", color: "text-blue-400" },
                      { label: "Чатов", value: stats.chats, icon: "MessageSquare", color: "text-purple-400" },
                      { label: "Сообщений", value: stats.messages, icon: "MessageCircle", color: "text-green-400" },
                      { label: "Сессий", value: stats.sessions, icon: "Key", color: "text-yellow-400" },
                    ].map(s => (
                      <div key={s.label} className="surface2 rounded-xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--border-color)" }}>
                        <Icon name={s.icon} size={22} className={s.color} />
                        <div>
                          <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{s.value}</div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="surface2 rounded-xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--border-color)" }}>
                    <Icon name="Activity" size={22} className="text-emerald-400" />
                    <div>
                      <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{stats.active_today}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>Активных сессий за 24ч</div>
                    </div>
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab === "users" && (
                <div>
                  <p className="text-xs mb-3 font-mono" style={{ color: "var(--text-muted)" }}>// Зарегистрированные пользователи ({users.length})</p>
                  {users.length === 0
                    ? <div className="text-center py-8" style={{ color: "var(--text-muted)" }}><Icon name="Loader2" size={20} className="animate-spin mx-auto" /></div>
                    : (
                      <div className="space-y-1">
                        {users.map(u => (
                          <div key={u.id} className="surface2 rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid var(--border-color)" }}>
                            <div className="w-9 h-9 rounded-full gradient-btn flex items-center justify-center font-bold text-white text-xs flex-shrink-0">{u.avatar_letters || "?"}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{u.display_name}</span>
                                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>@{u.username}</span>
                              </div>
                              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{u.email}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>#{u.id}</div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(u.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* CHATS */}
              {tab === "chats" && (
                <div>
                  <p className="text-xs mb-3 font-mono" style={{ color: "var(--text-muted)" }}>// Все диалоги ({chats.length}) — нажми чтобы открыть переписку</p>
                  {chats.length === 0
                    ? <div className="text-center py-8" style={{ color: "var(--text-muted)" }}><Icon name="Loader2" size={20} className="animate-spin mx-auto" /></div>
                    : (
                      <div className="space-y-1">
                        {chats.map(c => (
                          <button key={c.id} onClick={() => { setTab("messages"); openChatMessages(c); }}
                            className="w-full surface2 rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-all hover:border-indigo-500/40"
                            style={{ border: "1px solid var(--border-color)" }}>
                            <Icon name="MessageSquare" size={16} className="text-indigo-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                {c.user1_name} <span style={{ color: "var(--text-muted)" }}>↔</span> {c.user2_name}
                              </div>
                              <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                                @{c.user1_username} ↔ @{c.user2_username}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-indigo-400 font-medium">{c.msg_count} сообщ.</div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.last_msg_at ? formatTime(c.last_msg_at) : "—"}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* MESSAGES */}
              {tab === "messages" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {selectedChat && (
                      <button onClick={() => { setSelectedChat(null); setMessages([]); loadTab("chats"); }}
                        className="p-1 rounded-lg transition-all hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                        <Icon name="ChevronLeft" size={16} />
                      </button>
                    )}
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {selectedChat
                        ? `// Чат: ${selectedChat.user1_name} ↔ ${selectedChat.user2_name}`
                        : `// Последние 200 сообщений`}
                    </p>
                  </div>
                  {messages.length === 0
                    ? <div className="text-center py-8" style={{ color: "var(--text-muted)" }}><Icon name="Loader2" size={20} className="animate-spin mx-auto" /></div>
                    : (
                      <div className="space-y-1">
                        {messages.map(m => (
                          <div key={m.id} className="surface2 rounded-xl px-4 py-2.5 flex items-start gap-3" style={{ border: "1px solid var(--border-color)" }}>
                            <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center font-bold text-white text-xs flex-shrink-0 mt-0.5">{m.sender_avatar || "?"}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{m.sender_name}</span>
                                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>#{m.chat_id}</span>
                              </div>
                              {m.file_url
                                ? <div className="flex items-center gap-1.5">
                                    <Icon name={m.file_type?.startsWith("image/") ? "Image" : "FileText"} size={13} className="text-indigo-400" />
                                    <a href={m.file_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 underline underline-offset-2 break-all">{m.file_name}</a>
                                  </div>
                                : <p className="text-sm break-words" style={{ color: "var(--text-primary)" }}>{m.text}</p>
                              }
                            </div>
                            <div className="text-xs flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{formatTime(m.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
