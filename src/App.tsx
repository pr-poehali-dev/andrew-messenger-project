import { useState } from "react";
import Icon from "@/components/ui/icon";

type Section = "chats" | "contacts" | "gallery" | "search" | "profile" | "privacy";

const mockChats = [
  { id: 1, name: "Алексей Петров", msg: "Увидимся завтра в 10?", time: "14:32", unread: 3, online: true, avatar: "АП" },
  { id: 2, name: "Мария Иванова", msg: "Отличная идея! Давай попробуем 🔥", time: "13:10", unread: 0, online: true, avatar: "МИ" },
  { id: 3, name: "Команда Андрей", msg: "Голосование: кто за пятницу?", time: "12:00", unread: 12, online: false, avatar: "КА" },
  { id: 4, name: "Дмитрий Соколов", msg: "Файлы скинул на почту", time: "11:45", unread: 0, online: false, avatar: "ДС" },
  { id: 5, name: "Анна Новикова", msg: "Голосовое 0:23", time: "10:20", unread: 1, online: true, avatar: "АН" },
  { id: 6, name: "Сергей Лебедев", msg: "Спасибо за помощь!", time: "Вчера", unread: 0, online: false, avatar: "СЛ" },
];

const mockMessages = [
  { id: 1, out: false, text: "Привет! Как дела?", time: "10:01" },
  { id: 2, out: true, text: "Всё отлично! Работаем над проектом 🚀", time: "10:02" },
  { id: 3, out: false, text: "Когда будет готова презентация?", time: "10:05" },
  { id: 4, out: true, text: "Думаю к пятнице сделаем. Осталось немного.", time: "10:06" },
  { id: 5, out: false, text: "Отлично. Увидимся завтра в 10?", time: "14:32" },
];

const mockContacts = [
  { id: 1, name: "Алексей Петров", status: "В сети", online: true, avatar: "АП", phone: "+7 900 123-45-67" },
  { id: 2, name: "Анна Новикова", status: "Был(а) 5 мин назад", online: false, avatar: "АН", phone: "+7 911 234-56-78" },
  { id: 3, name: "Дмитрий Соколов", status: "В сети", online: true, avatar: "ДС", phone: "+7 922 345-67-89" },
  { id: 4, name: "Мария Иванова", status: "Был(а) час назад", online: false, avatar: "МИ", phone: "+7 933 456-78-90" },
  { id: 5, name: "Сергей Лебедев", status: "В сети", online: true, avatar: "СЛ", phone: "+7 944 567-89-01" },
];

const mockMedia = [
  { id: 1, type: "image", label: "Фото из чата", emoji: "🌅" },
  { id: 2, type: "image", label: "Скриншот", emoji: "📱" },
  { id: 3, type: "video", label: "Видео 0:45", emoji: "🎬" },
  { id: 4, type: "image", label: "Фото встречи", emoji: "📸" },
  { id: 5, type: "file", label: "Документ.pdf", emoji: "📄" },
  { id: 6, type: "image", label: "Аватар", emoji: "🖼️" },
  { id: 7, type: "video", label: "Видео 1:12", emoji: "🎥" },
  { id: 8, type: "file", label: "Таблица.xlsx", emoji: "📊" },
  { id: 9, type: "image", label: "Природа", emoji: "🌿" },
];

const navItems = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "contacts", icon: "Users", label: "Контакты" },
  { id: "gallery", icon: "Image", label: "Галерея" },
  { id: "search", icon: "Search", label: "Поиск" },
  { id: "privacy", icon: "Shield", label: "Приватность" },
  { id: "profile", icon: "User", label: "Профиль" },
] as const;

function AvatarBlock({ letters, size = "md", online }: { letters: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div className={`relative inline-block ${online ? "online-dot" : ""}`}>
      <div className={`${sizes[size]} rounded-full gradient-btn flex items-center justify-center font-semibold text-white flex-shrink-0`}>
        {letters}
      </div>
    </div>
  );
}

function ChatsSection() {
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [msg, setMsg] = useState("");
  const chat = mockChats.find((c) => c.id === activeChat);

  return (
    <div className="flex h-full">
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/5">
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
              placeholder="Поиск чатов..."
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockChats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c.id)}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-white/5 ${activeChat === c.id ? "bg-white/5 border-l-2 border-blue-500" : ""}`}
            >
              <AvatarBlock letters={c.avatar} size="md" online={c.online} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90 truncate">{c.name}</span>
                  <span className="text-xs text-white/35 flex-shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-white/45 truncate">{c.msg}</span>
                  {c.unread > 0 && (
                    <span className="ml-2 flex-shrink-0 gradient-btn text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {chat ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass">
              <div className="flex items-center gap-3">
                <AvatarBlock letters={chat.avatar} size="md" online={chat.online} />
                <div>
                  <div className="font-semibold text-white/90">{chat.name}</div>
                  <div className="text-xs text-white/40">{chat.online ? "В сети" : "Был(а) недавно"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl hover:bg-white/8 transition-all group">
                  <Icon name="Phone" size={18} className="text-white/50 group-hover:text-green-400 transition-colors" />
                </button>
                <button className="p-2.5 rounded-xl hover:bg-white/8 transition-all group">
                  <Icon name="Video" size={18} className="text-white/50 group-hover:text-blue-400 transition-colors" />
                </button>
                <button className="p-2.5 rounded-xl hover:bg-white/8 transition-all">
                  <Icon name="MoreVertical" size={18} className="text-white/50" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {mockMessages.map((m) => (
                <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"} animate-fade-in`}>
                  <div className={`max-w-[70%] px-4 py-2.5 ${m.out ? "message-out text-white" : "message-in text-white/85"}`}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <p className={`text-xs mt-1 ${m.out ? "text-white/60 text-right" : "text-white/35"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/5 glass">
              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-xl hover:bg-white/8 transition-all flex-shrink-0">
                  <Icon name="Paperclip" size={18} className="text-white/40" />
                </button>
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  className="flex-1 bg-white/5 rounded-2xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                  placeholder="Написать сообщение..."
                />
                <button className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${msg ? "gradient-btn pulse-glow" : "bg-white/8"}`}>
                  <Icon name="Send" size={18} className="text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white/25">
              <Icon name="MessageCircle" size={48} className="mx-auto mb-3 opacity-30" />
              <p>Выберите чат</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactsSection() {
  const [selected, setSelected] = useState<number | null>(null);
  const contact = mockContacts.find((c) => c.id === selected);

  return (
    <div className="flex h-full">
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/5">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <h2 className="font-semibold text-white/80">Контакты</h2>
          <button className="p-2 rounded-xl hover:bg-white/8 transition-all">
            <Icon name="UserPlus" size={18} className="text-white/50" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {mockContacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 ${selected === c.id ? "bg-white/5 glow-ring" : ""}`}
            >
              <AvatarBlock letters={c.avatar} size="md" online={c.online} />
              <div className="text-left">
                <div className="text-sm font-medium text-white/90">{c.name}</div>
                <div className="text-xs text-white/40">{c.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {contact ? (
          <div className="w-full max-w-sm animate-scale-in">
            <div className="surface rounded-2xl p-8 text-center border border-white/5">
              <div className="flex justify-center mb-4">
                <AvatarBlock letters={contact.avatar} size="lg" online={contact.online} />
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-1">{contact.name}</h3>
              <p className="text-sm text-white/40 mb-6">{contact.status}</p>
              <div className="surface2 rounded-xl px-4 py-3 mb-6 text-sm text-white/60">{contact.phone}</div>
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl gradient-btn text-white font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Icon name="MessageCircle" size={16} /> Написать
                </button>
                <button className="flex-1 py-3 rounded-xl surface2 text-white/70 font-medium text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <Icon name="Phone" size={16} /> Позвонить
                </button>
              </div>
              <button className="mt-3 w-full py-3 rounded-xl border border-white/8 text-white/40 text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <Icon name="Video" size={15} /> Видеозвонок
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-white/25">
            <Icon name="Users" size={48} className="mx-auto mb-3 opacity-30" />
            <p>Выберите контакт</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GallerySection() {
  const [filter, setFilter] = useState<"all" | "image" | "video" | "file">("all");
  const filtered = filter === "all" ? mockMedia : mockMedia.filter((m) => m.type === filter);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white/90">Галерея медиафайлов</h2>
      </div>
      <div className="flex gap-2 mb-6">
        {(["all", "image", "video", "file"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "gradient-btn text-white" : "surface2 text-white/50 hover:text-white/70"}`}
          >
            {{ all: "Все", image: "Фото", video: "Видео", file: "Файлы" }[f]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="surface rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-white/8 transition-all border border-white/5 hover:border-white/10 animate-scale-in group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{item.emoji}</span>
            <span className="text-xs text-white/40">{item.label}</span>
            {item.type === "video" && (
              <span className="mt-1 text-xs text-blue-400 font-medium">Видео</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchSection() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"messages" | "contacts">("messages");

  const filteredContacts = mockContacts.filter(
    (c) => query && c.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredMessages = mockMessages.filter(
    (m) => query && m.text.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-white/90 mb-6">Поиск</h2>
      <div className="relative mb-4">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full surface rounded-2xl pl-12 pr-4 py-4 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all border border-white/5"
          placeholder="Поиск по сообщениям и контактам..."
        />
      </div>
      <div className="flex gap-2 mb-6">
        {(["messages", "contacts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? "gradient-btn text-white" : "surface2 text-white/50"}`}
          >
            {t === "messages" ? "Сообщения" : "Контакты"}
          </button>
        ))}
      </div>

      {!query && (
        <div className="text-center text-white/25 mt-16">
          <Icon name="Search" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Начните вводить запрос</p>
        </div>
      )}

      {query && tab === "contacts" && (
        <div className="flex flex-col gap-2">
          {filteredContacts.length === 0 ? (
            <p className="text-white/30 text-sm text-center mt-8">Ничего не найдено</p>
          ) : filteredContacts.map((c) => (
            <div key={c.id} className="surface rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5 animate-fade-in">
              <AvatarBlock letters={c.avatar} size="md" online={c.online} />
              <div>
                <div className="font-medium text-white/85 text-sm">{c.name}</div>
                <div className="text-xs text-white/40">{c.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {query && tab === "messages" && (
        <div className="flex flex-col gap-2">
          {filteredMessages.length === 0 ? (
            <p className="text-white/30 text-sm text-center mt-8">Ничего не найдено</p>
          ) : filteredMessages.map((m) => (
            <div key={m.id} className="surface rounded-xl px-4 py-3 border border-white/5 animate-fade-in">
              <p className="text-sm text-white/75">{m.text}</p>
              <p className="text-xs text-white/35 mt-1">{m.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrivacySection() {
  const [settings, setSettings] = useState({
    e2e: true,
    readReceipts: true,
    onlineStatus: false,
    notifications: true,
    soundNotif: true,
    previewNotif: false,
    twoFactor: false,
    activeSessions: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const ToggleRow = ({ label, desc, k, icon }: { label: string; desc: string; k: keyof typeof settings; icon: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl surface2 flex items-center justify-center">
          <Icon name={icon} fallback="Circle" size={16} className="text-white/60" />
        </div>
        <div>
          <div className="text-sm font-medium text-white/85">{label}</div>
          <div className="text-xs text-white/40 mt-0.5">{desc}</div>
        </div>
      </div>
      <button
        onClick={() => toggle(k)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${settings[k] ? "gradient-btn" : "bg-white/10"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${settings[k] ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-white/90 mb-6">Приватность и уведомления</h2>
      <div className="space-y-4">
        <div className="surface rounded-2xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Безопасность</h3>
          <ToggleRow label="Сквозное шифрование" desc="Все сообщения зашифрованы E2E" k="e2e" icon="Lock" />
          <ToggleRow label="Двухфакторная аутентификация" desc="Дополнительная защита аккаунта" k="twoFactor" icon="ShieldCheck" />
          <ToggleRow label="Активные сессии" desc="Контроль входов с других устройств" k="activeSessions" icon="Monitor" />
        </div>
        <div className="surface rounded-2xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Приватность</h3>
          <ToggleRow label="Подтверждение прочтения" desc="Показывать галочки прочтения" k="readReceipts" icon="CheckCheck" />
          <ToggleRow label="Статус «В сети»" desc="Скрыть время последнего визита" k="onlineStatus" icon="Eye" />
        </div>
        <div className="surface rounded-2xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Уведомления</h3>
          <ToggleRow label="Push-уведомления" desc="Уведомления о новых сообщениях" k="notifications" icon="Bell" />
          <ToggleRow label="Звуки" desc="Звуковые уведомления" k="soundNotif" icon="Volume2" />
          <ToggleRow label="Предпросмотр" desc="Показывать текст в уведомлении" k="previewNotif" icon="MessageSquare" />
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Андрей Смирнов");
  const [bio, setBio] = useState("Люблю технологии и качественное общение ✨");

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <div className="relative mb-8">
          <div className="h-32 rounded-2xl gradient-btn opacity-40 mb-[-40px]" />
          <div className="flex items-end gap-4 px-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl gradient-btn flex items-center justify-center text-2xl font-bold text-white border-4 border-background">АС</div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full surface2 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Icon name="Camera" size={12} className="text-white/60" />
              </button>
            </div>
            <div className="pb-2 flex-1">
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-bold bg-white/5 rounded-lg px-3 py-1 outline-none border border-white/10 text-white w-full"
                />
              ) : (
                <h2 className="text-lg font-bold text-white/90">{name}</h2>
              )}
              <p className="text-sm text-white/40">@andrew_user</p>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className={`pb-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${editing ? "gradient-btn text-white" : "surface2 text-white/60 hover:text-white/80"}`}
            >
              {editing ? "Сохранить" : "Изменить"}
            </button>
          </div>
        </div>

        <div className="surface rounded-2xl p-4 border border-white/5 mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">О себе</h3>
          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm outline-none border border-white/10 text-white/80 resize-none"
              rows={3}
            />
          ) : (
            <p className="text-sm text-white/70">{bio}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Чатов", value: "24" },
            { label: "Контактов", value: "138" },
            { label: "Медиа", value: "512" },
          ].map((s) => (
            <div key={s.label} className="surface rounded-xl p-4 text-center border border-white/5">
              <div className="text-xl font-bold gradient-text">{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <button className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/70 text-sm hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
          <Icon name="LogOut" size={15} /> Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("chats");

  const sections: Record<Section, React.ReactNode> = {
    chats: <ChatsSection />,
    contacts: <ContactsSection />,
    gallery: <GallerySection />,
    search: <SearchSection />,
    privacy: <PrivacySection />,
    profile: <ProfileSection />,
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "hsl(224, 30%, 7%)", fontFamily: "'Golos Text', sans-serif" }}>
      {/* Боковая навигация */}
      <nav className="w-16 flex flex-col items-center py-4 gap-1 border-r border-white/5 flex-shrink-0" style={{ background: "hsl(225, 30%, 9%)" }}>
        <div className="mb-4">
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center pulse-glow cursor-default">
            <span className="text-white font-black text-sm">A</span>
          </div>
        </div>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as Section)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
              section === item.id
                ? "gradient-btn text-white shadow-lg shadow-blue-900/30"
                : "text-white/40 hover:text-white/70 hover:bg-white/6"
            }`}
          >
            <Icon name={item.icon} size={18} />
            <span className="absolute left-14 bg-gray-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 border border-white/10 shadow-xl">
              {item.label}
            </span>
          </button>
        ))}

        <div className="mt-auto">
          <button
            title="Звонок"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-all group relative"
          >
            <Icon name="PhoneCall" size={18} />
            <span className="absolute left-14 bg-gray-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 border border-white/10 shadow-xl">
              Звонок
            </span>
          </button>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <div key={section} className="h-full animate-fade-in">
          {sections[section]}
        </div>
      </main>
    </div>
  );
}