import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { chatsApi } from "@/api";
import { User, Chat, Av, formatTime } from "@/types";
import { ChatWindow, ProfilePanel, SearchPeople } from "./ChatWindow";
import { DevConsole } from "./DevConsole";

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

export function Messenger({ user, onLogout, onUserUpdate, theme, onThemeToggle }: { user: User; onLogout: () => void; onUserUpdate: (u: User) => void; theme: string; onThemeToggle: () => void }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [section, setSection] = useState<"chats" | "search" | "profile">("chats");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [devOpen, setDevOpen] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setDevOpen(true);
    } else {
      logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 1500);
    }
  };

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

  const mobileShowChat = isMobile && activeChat !== null;

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--app-bg)" }}>
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
        {devOpen && <DevConsole onClose={() => setDevOpen(false)} />}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden", background: "var(--app-bg)" }}>
      <nav className="w-16 flex flex-col items-center py-4 gap-1 flex-shrink-0" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border-color)" }}>
        <div className="mb-4">
          <div onClick={handleLogoClick} className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center pulse-glow cursor-pointer select-none">
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

      <div style={{ width: "288px", flexShrink: 0, borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {section === "chats" && <ChatList chats={chats} activeChat={activeChat} onSelect={setActiveChat} />}
        {section === "search" && <SearchPeople onOpenChat={openChat} />}
        {section === "profile" && <ProfilePanel user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />}
      </div>

      <div style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
        {activeChat
          ? <ChatWindow key={activeChat.id} chat={activeChat} currentUser={user} />
          : <EmptyState />}
      </div>
      {devOpen && <DevConsole onClose={() => setDevOpen(false)} />}
    </div>
  );
}