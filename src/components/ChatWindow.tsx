import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { messagesApi, uploadApi, chatsApi, authApi } from "@/api";
import { User, Chat, Message, Av, formatTime, fileToBase64 } from "@/types";

export function ChatWindow({ chat, currentUser, onBack }: { chat: Chat; currentUser: User; onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setText(t);
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

      {error && (
        <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><Icon name="X" size={12} /></button>
        </div>
      )}

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
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", maxHeight: "120px" }}
            placeholder="Написать сообщение..."
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

export function SearchPeople({ onOpenChat }: { onOpenChat: (partner_id: number) => void }) {
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

export function ProfilePanel({ user, onLogout, onUserUpdate }: { user: User; onLogout: () => void; onUserUpdate: (u: User) => void }) {
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
