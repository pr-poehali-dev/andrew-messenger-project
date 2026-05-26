import { useState } from "react";
import Icon from "@/components/ui/icon";
import { authApi } from "@/api";
import { User } from "@/types";

export function AuthScreen({ onAuth, theme, onThemeToggle }: { onAuth: (user: User) => void; theme: string; onThemeToggle: () => void }) {
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
