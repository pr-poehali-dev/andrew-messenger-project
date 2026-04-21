import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { authApi, chatsApi, messagesApi } from "@/api";

/* ─── Types ─── */
interface User { id: number; username: string; display_name: string; avatar_letters: string }
interface Chat { id: number; partner_id: number; partner_name: string; partner_avatar: string; partner_last_seen: string | null; last_msg: string | null; last_msg_time: string | null }
interface Message { id: number; sender_id: number; sender_name: string; sender_avatar: string; text: string; created_at: string; is_mine: boolean }

/* ─── Avatar ─── */
function Av({ letters, size = "md", online }: { letters: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  return (
    <div className={`relative inline-flex flex-shrink-0 ${online ? "online-dot" : ""}`}>
      <div className={`${s} rounded-full gradient-btn flex items-center justify-center font-bold text-white`}>{letters || "?"}</div>
    </div>
  );
}

/* ─── Auth Screen ─── */
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
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

  const inp = "w-full surface rounded-xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all border border-white/8";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(224, 30%, 7%)" }}>
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-4 pulse-glow">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Andrew</h1>
          <p className="text-white/40 text-sm mt-1">Мессенджер с шифрованием</p>
        </div>

        <div className="surface rounded-2xl p-6 border border-white/5">
          <div className="flex gap-1 mb-6 surface2 rounded-xl p-1">
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "gradient-btn text-white" : "text-white/50"}`}>
                {t === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {tab === "register" && <>
              <input className={inp} placeholder="Имя и фамилия" value={form.display_name} onChange={e => set("display_name", e.target.value)} />
              <input className={inp} placeholder="Логин (латиница, без пробелов)" value={form.username} onChange={e => set("username", e.target.value.toLowerCase())} />
              <input className={inp} placeholder="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </>}
            {tab === "login" && <input className={inp} placeholder="Логин или Email" value={form.login} onChange={e => set("login", e.target.value)} />}
            <input className={inp} placeholder="Пароль" type="password" value={form.password} onChange={e => set("password", e.target.value)}
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

  useEffect(() => {
    const sid = localStorage.getItem("andrew_session");
    if (!sid) { setLoading(false); return; }
    authApi.me().then(res => {
      if (res.id) setUser(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(224, 30%, 7%)" }}>
      <div className="w-10 h-10 rounded-full gradient-btn pulse-glow" />
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser} />;
  return <Messenger user={user} onLogout={() => { localStorage.removeItem("andrew_session"); setUser(null); }} />;
}

/* ─── Messenger ─── */
function Messenger({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [section, setSection] = useState<"chats" | "search" | "profile">("chats");

  const loadChats = useCallback(async () => {
    const res = await chatsApi.list();
    if (res.chats) setChats(res.chats);
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Polling чатов каждые 5 сек
  useEffect(() => {
    const t = setInterval(loadChats, 5000);
    return () => clearInterval(t);
  }, [loadChats]);

  const openChat = async (partner_id: number) => {
    const res = await chatsApi.open(partner_id);
    if (res.chat_id) {
      await loadChats();
      const found = chats.find(c => c.id === res.chat_id);
      if (found) setActiveChat(found);
      else {
        const r2 = await chatsApi.list();
        if (r2.chats) {
          setChats(r2.chats);
          const f2 = r2.chats.find((c: Chat) => c.id === res.chat_id);
          if (f2) setActiveChat(f2);
        }
      }
      setSection("chats");
    }
  };

  const navItems = [
    { id: "chats", icon: "MessageCircle", label: "Чаты" },
    { id: "search", icon: "Search", label: "Найти людей" },
    { id: "profile", icon: "User", label: "Профиль" },
  ] as const;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "hsl(224, 30%, 7%)", fontFamily: "'Golos Text', sans-serif" }}>
      {/* Sidebar навигации */}
      <nav className="w-16 flex flex-col items-center py-4 gap-1 border-r border-white/5 flex-shrink-0" style={{ background: "hsl(225, 30%, 9%)" }}>
        <div className="mb-4">
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center pulse-glow cursor-default">
            <span className="text-white font-black text-sm">A</span>
          </div>
        </div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setSection(item.id)} title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${section === item.id ? "gradient-btn text-white" : "text-white/40 hover:text-white/70 hover:bg-white/6"}`}>
            <Icon name={item.icon} size={18} />
            <span className="absolute left-14 bg-gray-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-white/10">
              {item.label}
            </span>
          </button>
        ))}
        <div className="mt-auto">
          <button onClick={onLogout} title="Выйти"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all group relative">
            <Icon name="LogOut" size={18} />
            <span className="absolute left-14 bg-gray-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-white/10">
              Выйти
            </span>
          </button>
        </div>
      </nav>

      {/* Список чатов / Поиск / Профиль */}
      <div className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col">
        {section === "chats" && <ChatList chats={chats} activeChat={activeChat} onSelect={setActiveChat} currentUserId={user.id} />}
        {section === "search" && <SearchPeople currentUser={user} onOpenChat={openChat} />}
        {section === "profile" && <ProfilePanel user={user} onLogout={onLogout} />}
      </div>

      {/* Диалог */}
      <div className="flex-1 min-w-0">
        {activeChat
          ? <ChatWindow key={activeChat.id} chat={activeChat} currentUser={user} />
          : <EmptyState />}
      </div>
    </div>
  );
}

/* ─── Chat List ─── */
function ChatList({ chats, activeChat, onSelect, currentUserId }: { chats: Chat[]; activeChat: Chat | null; onSelect: (c: Chat) => void; currentUserId: number }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/5">
        <h2 className="font-semibold text-white/80">Сообщения</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <div className="text-center text-white/25 mt-16 px-4">
            <Icon name="MessageCircle" size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет чатов.<br/>Найдите людей через поиск</p>
          </div>
        )}
        {chats.map(c => (
          <button key={c.id} onClick={() => onSelect(c)}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-white/5 text-left ${activeChat?.id === c.id ? "bg-white/5 border-l-2 border-blue-500" : ""}`}>
            <Av letters={c.partner_avatar} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90 truncate">{c.partner_name}</span>
                {c.last_msg_time && <span className="text-xs text-white/35 flex-shrink-0 ml-2">{formatTime(c.last_msg_time)}</span>}
              </div>
              <span className="text-xs text-white/40 truncate block mt-0.5">{c.last_msg || "Нет сообщений"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Chat Window ─── */
function ChatWindow({ chat, currentUser }: { chat: Chat; currentUser: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const fetchMessages = useCallback(async (initial = false) => {
    const after = initial ? 0 : lastIdRef.current;
    const res = await messagesApi.history(chat.id, after);
    if (res.messages && res.messages.length > 0) {
      setMessages(prev => initial ? res.messages : [...prev, ...res.messages]);
      lastIdRef.current = res.messages[res.messages.length - 1].id;
    }
  }, [chat.id]);

  useEffect(() => {
    setMessages([]);
    lastIdRef.current = 0;
    fetchMessages(true);
  }, [chat.id, fetchMessages]);

  // Polling новых сообщений каждые 2 сек
  useEffect(() => {
    const t = setInterval(() => fetchMessages(false), 2000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText(""); setSending(true);
    const res = await messagesApi.send(chat.id, t);
    if (res.id) {
      setMessages(prev => [...prev, res]);
      lastIdRef.current = res.id;
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 glass flex-shrink-0">
        <Av letters={chat.partner_avatar} size="md" />
        <div>
          <div className="font-semibold text-white/90">{chat.partner_name}</div>
          <div className="text-xs text-white/40">@{chat.partner_name.toLowerCase().replace(/\s/g, "")}</div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-center text-white/25 mt-16">
            <Icon name="MessageCircle" size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Начните диалог</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"} animate-fade-in`}>
            {!m.is_mine && <div className="mr-2 mt-auto"><Av letters={m.sender_avatar} size="sm" /></div>}
            <div className={`max-w-[70%] px-4 py-2.5 ${m.is_mine ? "message-out text-white" : "message-in text-white/85"}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`text-xs mt-1 ${m.is_mine ? "text-white/55 text-right" : "text-white/35"}`}>{formatTime(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Ввод */}
      <div className="px-6 py-4 border-t border-white/5 glass flex-shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            className="flex-1 bg-white/5 rounded-2xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all resize-none"
            placeholder="Написать сообщение... (Enter — отправить)"
            style={{ maxHeight: "120px" }}
          />
          <button onClick={send} disabled={!text.trim() || sending}
            className={`p-3 rounded-xl flex-shrink-0 transition-all ${text.trim() ? "gradient-btn pulse-glow" : "bg-white/8"} disabled:opacity-50`}>
            <Icon name="Send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Search People ─── */
function SearchPeople({ currentUser, onOpenChat }: { currentUser: User; onOpenChat: (partner_id: number) => void }) {
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
      <div className="p-4 border-b border-white/5">
        <h2 className="font-semibold text-white/80 mb-3">Найти людей</h2>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
            placeholder="Имя или логин..." />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <div className="text-center text-white/30 text-xs mt-4">Поиск...</div>}
        {!loading && q.length >= 2 && results.length === 0 && (
          <div className="text-center text-white/25 mt-8 text-sm">Никого не найдено</div>
        )}
        {!loading && q.length < 2 && (
          <div className="text-center text-white/20 mt-8 text-sm px-4">Введите имя или логин пользователя</div>
        )}
        {results.map(u => (
          <button key={u.id} onClick={() => onOpenChat(u.id)}
            className="w-full px-3 py-3 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-all text-left">
            <Av letters={u.avatar_letters} size="md" />
            <div>
              <div className="text-sm font-medium text-white/90">{u.display_name}</div>
              <div className="text-xs text-white/40">@{u.username}</div>
            </div>
            <Icon name="MessageCircle" size={16} className="ml-auto text-white/30" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Profile Panel ─── */
function ProfilePanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-semibold text-white/80 mb-6">Профиль</h2>
      <div className="surface rounded-2xl p-6 text-center border border-white/5 mb-4">
        <Av letters={user.avatar_letters} size="lg" />
        <h3 className="text-lg font-bold text-white/90 mt-3">{user.display_name}</h3>
        <p className="text-sm text-white/40">@{user.username}</p>
      </div>
      <div className="surface rounded-2xl p-4 border border-white/5 mb-4">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <Icon name="Lock" size={14} />
          <span>Сквозное шифрование включено</span>
        </div>
      </div>
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
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-white/20">
        <div className="w-16 h-16 rounded-2xl gradient-btn opacity-20 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-black text-3xl">A</span>
        </div>
        <p className="font-semibold text-white/40">Andrew Messenger</p>
        <p className="text-sm mt-1">Выберите чат или найдите людей</p>
      </div>
    </div>
  );
}

/* ─── Utils ─── */
function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.includes("+") || iso.includes("Z") ? iso : iso + "Z");
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}
