import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { authApi, chatsApi, messagesApi, uploadApi } from "@/api";

/* ─── Theme ─── */
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("andrew_theme") as "dark" | "light") || "dark";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    localStorage.setItem("andrew_theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

/* ─── Types ─── */
interface User { id: number; username: string; display_name: string; avatar_letters: string }
interface Chat { id: number; partner_id: number; partner_name: string; partner_avatar: string; partner_last_seen: string | null; last_msg: string | null; last_msg_time: string | null }
interface Message { id: number; sender_id: number; sender_name: string; sender_avatar: string; text: string; created_at: string; is_mine: boolean; file_url?: string; file_name?: string; file_type?: string }

/* ─── Avatar ─── */
function Av({ letters, size = "md" }: { letters: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  return (
    <div className={`${s} rounded-full gradient-btn flex items-center justify-center font-bold text-white flex-shrink-0`}>{letters || "?"}</div>
  );
}

/* ─── Auth Screen ─── */
function AuthScreen({ onAuth, theme, onThemeToggle }: { onAuth: (user: User) => void; theme: string; onThemeToggle: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", display_name: "", email: "", login: "", password: "" });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      let res;
      if (tab === "login") {
        res = await authApi.login(form.login, form.password);
      } else {
        res = await authApi.register({ username: form.username, display_name: form.display_name, email: form.email, password: form.password });
      }
      if (res.error) { setError(res.error); return; }
      localStorage.setItem("andrew_session", res.session_id);
      onAuth(res.user);
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full surface rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--app-bg)" }}>
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8 relative">
          <button onClick={onThemeToggle} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            className="absolute right-0 top-0 p-2 rounded-xl transition-all opacity-50 hover:opacity-100"
            style={{ color: "var(--text-secondary)" }}>
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} />
          </button>
          <div className="w-14 h-14 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-4 pulse-glow">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Andrew</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Мессенджер</p>
        </div>

        <div className="surface rounded-2xl p-6 border border-white/5">
          <div className="flex gap-1 mb-6 surface2 rounded-xl p-1">
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "gradient-btn text-white" : ""}`}
                style={tab !== t ? { color: "var(--text-secondary)" } : {}}>
                {t === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {tab === "register" && <>
              <input className={inp} style={{ color: "var(--text-primary)", border: "1px solid var(--border-color)" }} placeholder="Имя и фамилия" value={form.display_name} onChange={e => set("display_name", e.target.value)} />
              <input className={inp} style={{ color: "var(--text-primary)", border: "1px solid var(--border-color)" }} placeholder="Логин (латиница, без пробелов)" value={form.username} onChange={e => set("username", e.target.value.toLowerCase())} />
              <input className={inp} style={{ color: "var(--text-primary)", border: "1px solid var(--border-color)" }} placeholder="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </>}
            {tab === "login" && <input className={inp} style={{ color: "var(--text-primary)", border: "1px solid var(--border-color)" }} placeholder="Логин или Email" value={form.login} onChange={e => set("login", e.target.value)} />}
            <input className={inp} style={{ color: "var(--text-primary)", border: "1px solid var(--border-color)" }} placeholder="Пароль" type="password" value={form.password} onChange={e => set("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} />
          </div>

          {error && <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

          <button onClick={submit} disabled={loading}
            className="mt-4 w-full py-3 rounded-xl gradient-btn text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50">
            {loading ? "Подождите..." : tab === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const sid = localStorage.getItem("andrew_session");
    if (!sid) { setLoading(false); return; }
    authApi.me().then(res => {
      if (res.id) setUser(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--app-bg)" }}>
      <div className="w-10 h-10 rounded-full gradient-btn pulse-glow" />
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser} theme={theme} onThemeToggle={toggle} />;
  return <Messenger user={user} onLogout={() => { localStorage.removeItem("andrew_session"); setUser(null); }} onUserUpdate={setUser} theme={theme} onThemeToggle={toggle} />;
}

/* ─── Messenger ─── */
function Messenger({ user, onLogout, onUserUpdate, theme, onThemeToggle }: { user: User; onLogout: () => void; onUserUpdate: (u: User) => void; theme: string; onThemeToggle: () => void }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [section, setSection] = useState<"chats" | "search" | "profile">("chats");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadChats = useCallback(async () => {
    const res = await chatsApi.list();
    if (res.chats) setChats(res.chats);
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);
  useEffect(() => {
    const t = setInterval(loadChats, 5000);
    return () => clearInterval(t);
  }, [loadChats]);

  const openChat = async (partner_id: number) => {
    const res = await chatsApi.open(partner_id);
    if (res.chat_id) {
      const r2 = await chatsApi.list();
      if (r2.chats) {
        setChats(r2.chats);
        const found = r2.chats.find((c: Chat) => c.id === res.chat_id);
        if (found) { setActiveChat(found); setSection("chats"); }
      }
    }
  };

  const navItems = [
    { id: "chats", icon: "MessageCircle", label: "Чаты" },
    { id: "search", icon: "Search", label: "Найти людей" },
    { id: "profile", icon: "User", label: "Профиль" },
  ] as const;

  // Мобильный: показываем чат если открыт, иначе панель
  const mobileShowChat = isMobile && activeChat !== null;

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--app-bg)" }}>
        {/* Основная область */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
          {mobileShowChat ? (
            <ChatWindow key={activeChat!.id} chat={activeChat!} currentUser={user} onBack={() => setActiveChat(null)} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {section === "chats" && <ChatList chats={chats} activeChat={activeChat} onSelect={setActiveChat} />}
              {section === "search" && <SearchPeople onOpenChat={openChat} />}
              {section === "profile" && <ProfilePanel user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />}
            </div>
          )}
        </div>

        {/* Нижний nav-bar (скрывается когда открыт чат) */}
        {!mobileShowChat && (
          <nav style={{ background: "var(--sidebar-bg)", borderTop: "1px solid var(--border-color)", flexShrink: 0 }}
            className="flex items-center justify-around py-2 px-4">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                style={{ color: section === item.id ? "var(--text-primary)" : "var(--text-secondary)" }}
                className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all">
                <Icon name={item.icon} size={22} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
            <button onClick={onThemeToggle} style={{ color: "var(--text-secondary)" }}
              className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all">
              <Icon name={theme === "dark" ? "Sun" : "Moon"} size={22} />
              <span className="text-[10px]">Тема</span>
            </button>
            <button onClick={onLogout} className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl text-red-400/60">
              <Icon name="LogOut" size={22} />
              <span className="text-[10px]">Выйти</span>
            </button>
          </nav>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden", background: "var(--app-bg)" }}>
      {/* Sidebar */}
      <nav className="w-16 flex flex-col items-center py-4 gap-1 flex-shrink-0" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border-color)" }}>
        <div className="mb-4">
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center pulse-glow cursor-default">
            <span className="text-white font-black text-sm">A</span>
          </div>
        </div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setSection(item.id)} title={item.label}
            style={{ color: section === item.id ? undefined : "var(--text-secondary)" }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${section === item.id ? "gradient-btn text-white" : "hover:bg-white/5"}`}>
            <Icon name={item.icon} size={18} />
            <span className="absolute left-14 surface border text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
              style={{ color: "var(--text-primary)" }}>
              {item.label}
            </span>
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={onThemeToggle} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}>
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} />
            <span className="absolute left-14 surface border text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
              style={{ color: "var(--text-primary)" }}>
              {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            </span>
          </button>
          <button onClick={onLogout} title="Выйти"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all group relative">
            <Icon name="LogOut" size={18} />
            <span className="absolute left-14 surface border text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
              style={{ color: "var(--text-primary)" }}>Выйти</span>
          </button>
        </div>
      </nav>

      {/* Панель слева */}
      <div style={{ width: "288px", flexShrink: 0, borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {section === "chats" && <ChatList chats={chats} activeChat={activeChat} onSelect={setActiveChat} />}
        {section === "search" && <SearchPeople onOpenChat={openChat} />}
        {section === "profile" && <ProfilePanel user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />}
      </div>

      {/* Диалог */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
        {activeChat
          ? <ChatWindow key={activeChat.id} chat={activeChat} currentUser={user} />
          : <EmptyState />}
      </div>
    </div>
  );
}

/* ─── Chat List ─── */
function ChatList({ chats, activeChat, onSelect }: { chats: Chat[]; activeChat: Chat | null; onSelect: (c: Chat) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Сообщения</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <div className="text-center mt-16 px-4" style={{ color: "var(--text-muted)" }}>
            <Icon name="MessageCircle" size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет чатов. Найдите людей через поиск</p>
          </div>
        )}
        {chats.map(c => (
          <button key={c.id} onClick={() => onSelect(c)}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left ${activeChat?.id === c.id ? "border-l-2 border-blue-500" : ""}`}
            style={{ background: activeChat?.id === c.id ? "var(--hover-bg)" : "transparent" }}
            onMouseEnter={e => { if (activeChat?.id !== c.id) (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)"; }}
            onMouseLeave={e => { if (activeChat?.id !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <Av letters={c.partner_avatar} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.partner_name}</span>
                {c.last_msg_time && <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{formatTime(c.last_msg_time)}</span>}
              </div>
              <span className="text-xs truncate block mt-0.5" style={{ color: "var(--text-secondary)" }}>{c.last_msg || "Нет сообщений"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Chat Window ─── */
function ChatWindow({ chat, currentUser, onBack }: { chat: Chat; currentUser: User; onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка истории и запуск polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const res = await messagesApi.history(chat.id, lastIdRef.current);
      if (res.messages && res.messages.length > 0) {
        setMessages(prev => [...prev, ...res.messages]);
        lastIdRef.current = res.messages[res.messages.length - 1].id;
      }
    }, 2500);
  }, [chat.id]);

  useEffect(() => {
    setMessages([]);
    lastIdRef.current = 0;
    setError("");
    // Начальная загрузка
    messagesApi.history(chat.id, 0).then(res => {
      if (res.messages) {
        setMessages(res.messages);
        if (res.messages.length > 0) {
          lastIdRef.current = res.messages[res.messages.length - 1].id;
        }
      }
    });
    startPolling();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [chat.id, startPolling]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    setText("");
    try {
      const res = await messagesApi.send(chat.id, t);
      if (res.error) {
        setError(res.error);
        setText(t); // вернуть текст при ошибке
      } else if (res.id) {
        setMessages(prev => [...prev, res]);
        lastIdRef.current = res.id;
      }
    } catch {
      setError("Ошибка отправки");
      setText(t);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Файл слишком большой (макс 20 МБ)"); return; }
    setUploading(true);
    setError("");
    try {
      const b64 = await fileToBase64(file);
      const res = await uploadApi.file(chat.id, b64, file.name, file.type);
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        setMessages(prev => [...prev, res]);
        lastIdRef.current = res.id;
      }
    } catch {
      setError("Ошибка загрузки файла");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImage = (type?: string) => type?.startsWith("image/");

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* Шапка */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border-color)" }}>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-white/8 transition-all flex-shrink-0 -ml-1 mr-1"
            style={{ color: "var(--text-secondary)" }}>
            <Icon name="ChevronLeft" size={22} />
          </button>
        )}
        <Av letters={chat.partner_avatar} size="md" />
        <div>
          <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{chat.partner_name}</div>
          <div className="text-xs text-green-400/70">в сети</div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-1.5">
        {messages.length === 0 && (
          <div className="text-center mt-16" style={{ color: "var(--text-muted)" }}>
            <Icon name="MessageCircle" size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Начните диалог</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"} animate-fade-in`}>
            {!m.is_mine && <div className="mr-2 mt-auto mb-1"><Av letters={m.sender_avatar} size="sm" /></div>}
            <div className={`max-w-[70%] ${m.is_mine ? "message-out text-white" : "message-in"}`}
              style={m.is_mine ? {} : { color: "var(--text-primary)" }}>
              {m.file_url ? (
                isImage(m.file_type) ? (
                  <div className="p-1">
                    <img src={m.file_url} alt={m.file_name} className="rounded-xl max-w-full max-h-64 object-cover" />
                    <p className={`text-xs mt-1 px-1 ${m.is_mine ? "text-white/55 text-right" : ""}`}
                      style={m.is_mine ? {} : { color: "var(--text-muted)" }}>{formatTime(m.created_at)}</p>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <a href={m.file_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <Icon name="FileText" size={20} className={m.is_mine ? "text-white/80" : ""} style={m.is_mine ? {} : { color: "var(--text-secondary)" }} />
                      <span className="text-sm underline underline-offset-2 break-all">{m.file_name}</span>
                    </a>
                    <p className={`text-xs mt-1.5 ${m.is_mine ? "text-white/55 text-right" : ""}`}
                      style={m.is_mine ? {} : { color: "var(--text-muted)" }}>{formatTime(m.created_at)}</p>
                  </div>
                )
              ) : (
                <div className="px-4 py-2.5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-xs mt-1 ${m.is_mine ? "text-white/55 text-right" : ""}`}
                    style={m.is_mine ? {} : { color: "var(--text-muted)" }}>{formatTime(m.created_at)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><Icon name="X" size={12} /></button>
        </div>
      )}

      {/* Ввод */}
      <div className="px-4 py-4 flex-shrink-0" style={{ background: "var(--header-bg)", borderTop: "1px solid var(--border-color)" }}>
        <div className="flex items-end gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="p-2.5 rounded-xl hover:bg-white/8 transition-all flex-shrink-0 disabled:opacity-50" style={{ color: "var(--text-secondary)" }} title="Прикрепить файл">
            {uploading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Paperclip" size={18} />}
          </button>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-blue-500/40 transition-all resize-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            placeholder="Написать сообщение..."
            style={{ maxHeight: "120px" }}
          />
          <button onClick={send} disabled={!text.trim() || sending}
            className={`p-3 rounded-xl flex-shrink-0 transition-all ${text.trim() && !sending ? "gradient-btn" : "bg-white/8"} disabled:opacity-40`}>
            {sending ? <Icon name="Loader2" size={18} className="text-white animate-spin" /> : <Icon name="Send" size={18} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Search People ─── */
function SearchPeople({ onOpenChat }: { onOpenChat: (partner_id: number) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: number; username: string; display_name: string; avatar_letters: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await chatsApi.search(q);
      if (res.users) setResults(res.users);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Найти людей</h2>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            placeholder="Имя или логин..." />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <div className="text-center text-xs mt-4" style={{ color: "var(--text-secondary)" }}>Поиск...</div>}
        {!loading && q.length >= 2 && results.length === 0 && <div className="text-center mt-8 text-sm" style={{ color: "var(--text-muted)" }}>Никого не найдено</div>}
        {!loading && q.length < 2 && <div className="text-center mt-8 text-sm px-4" style={{ color: "var(--text-muted)" }}>Введите имя или логин пользователя</div>}
        {results.map(u => (
          <button key={u.id} onClick={() => onOpenChat(u.id)}
            className="w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all text-left hover:bg-white/5">
            <Av letters={u.avatar_letters} size="md" />
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{u.display_name}</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>@{u.username}</div>
            </div>
            <Icon name="MessageCircle" size={16} className="ml-auto" style={{ color: "var(--text-muted)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Profile Panel ─── */
function ProfilePanel({ user, onLogout, onUserUpdate }: { user: User; onLogout: () => void; onUserUpdate: (u: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name);
  const [avatarLetters, setAvatarLetters] = useState(user.avatar_letters);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const save = async () => {
    if (!displayName.trim()) { setError("Имя не может быть пустым"); return; }
    setSaving(true); setError(""); setSuccess(false);
    const res = await authApi.updateProfile(displayName.trim(), avatarLetters.trim());
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onUserUpdate({ ...user, display_name: res.display_name, avatar_letters: res.avatar_letters });
    setSuccess(true);
    setEditing(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  const inp = "w-full surface rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/40";

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Профиль</h2>
      <div className="surface rounded-2xl p-6 text-center mb-4" style={{ border: "1px solid var(--border-color)" }}>
        <Av letters={user.avatar_letters} size="lg" />
        <h3 className="text-lg font-bold mt-3" style={{ color: "var(--text-primary)" }}>{user.display_name}</h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
      </div>

      {editing ? (
        <div className="surface rounded-2xl p-4 mb-4 space-y-3" style={{ border: "1px solid var(--border-color)" }}>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Имя</label>
            <input className={inp} style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ваше имя" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Буквы аватара (1–2 символа)</label>
            <input className={inp} style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              value={avatarLetters} maxLength={2}
              onChange={e => setAvatarLetters(e.target.value.toUpperCase())} placeholder="АБ" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 py-2 rounded-xl gradient-btn text-white text-sm font-medium disabled:opacity-50">
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
            <button onClick={() => { setEditing(false); setDisplayName(user.display_name); setAvatarLetters(user.avatar_letters); setError(""); }}
              className="flex-1 py-2 rounded-xl text-sm transition-all" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className="w-full py-2.5 rounded-xl text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2 mb-2"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          <Icon name="Pencil" size={14} /> Редактировать профиль
        </button>
      )}

      {success && <p className="text-green-400 text-xs text-center mb-2">Профиль обновлён!</p>}

      <button onClick={onLogout}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/70 text-sm hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 mt-auto">
        <Icon name="LogOut" size={15} /> Выйти из аккаунта
      </button>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl gradient-btn opacity-20 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-black text-3xl">A</span>
        </div>
        <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>Andrew Messenger</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Выберите чат или найдите людей</p>
      </div>
    </div>
  );
}

/* ─── Utils ─── */
function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.includes("+") || iso.includes("Z") ? iso : iso + "Z");
  const now = new Date();
  if (now.getTime() - d.getTime() < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}