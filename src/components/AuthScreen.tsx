import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { authApi } from "@/api";
import { User } from "@/types";

export function AuthScreen({ onAuth, theme, onThemeToggle }: { onAuth: (user: User) => void; theme: string; onThemeToggle: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "code">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", display_name: "", email: "", login: "", password: "" });
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const codeRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const codeStr = code.join("");

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleCodeInput = (i: number, val: string) => {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = ch;
    setCode(next);
    if (ch && i < 5) codeRefs[i + 1].current?.focus();
    if (!ch && i > 0) codeRefs[i - 1].current?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs[5].current?.focus();
    }
  };

  const sendCode = async () => {
    setError(""); setLoading(true);
    const res = await authApi.sendCode(form.email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setStep("code");
    setResendTimer(60);
    setCode(["", "", "", "", "", ""]);
    setTimeout(() => codeRefs[0].current?.focus(), 100);
  };

  const submitRegister = async () => {
    if (codeStr.length < 6) { setError("Введите 6-значный код"); return; }
    setError(""); setLoading(true);
    try {
      const res = await authApi.register({
        username: form.username,
        display_name: form.display_name,
        email: form.email,
        password: form.password,
        code: codeStr,
      });
      if (res.error) { setError(res.error); return; }
      localStorage.setItem("andrew_session", res.session_id);
      onAuth(res.user);
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async () => {
    setError(""); setLoading(true);
    try {
      const res = await authApi.login(form.login, form.password);
      if (res.error) { setError(res.error); return; }
      localStorage.setItem("andrew_session", res.session_id);
      onAuth(res.user);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForm = async () => {
    if (!form.display_name || !form.username || !form.email || !form.password) { setError("Заполните все поля"); return; }
    if (form.password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    if (form.username.length < 3) { setError("Логин минимум 3 символа"); return; }
    await sendCode();
  };

  const inp = "w-full surface rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";
  const inpStyle = { color: "var(--text-primary)", border: "1px solid var(--border-color)" };

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
          {/* Таб-переключатель — скрываем на шаге ввода кода */}
          {step === "form" && (
            <div className="flex gap-1 mb-6 surface2 rounded-xl p-1">
              {(["login", "register"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); setStep("form"); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "gradient-btn text-white" : ""}`}
                  style={tab !== t ? { color: "var(--text-secondary)" } : {}}>
                  {t === "login" ? "Войти" : "Регистрация"}
                </button>
              ))}
            </div>
          )}

          {/* ШАГ: форма */}
          {step === "form" && (
            <>
              <div className="space-y-3">
                {tab === "register" && <>
                  <input className={inp} style={inpStyle} placeholder="Имя и фамилия" value={form.display_name} onChange={e => set("display_name", e.target.value)} />
                  <input className={inp} style={inpStyle} placeholder="Логин (латиница, без пробелов)" value={form.username} onChange={e => set("username", e.target.value.toLowerCase())} />
                  <input className={inp} style={inpStyle} placeholder="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
                </>}
                {tab === "login" && <input className={inp} style={inpStyle} placeholder="Логин или Email" value={form.login} onChange={e => set("login", e.target.value)} />}
                <input className={inp} style={inpStyle} placeholder="Пароль" type="password" value={form.password}
                  onChange={e => set("password", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (tab === "login" ? submitLogin() : handleRegisterForm())} />
              </div>

              {error && <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

              <button onClick={tab === "login" ? submitLogin : handleRegisterForm} disabled={loading}
                className="mt-4 w-full py-3 rounded-xl gradient-btn text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50">
                {loading
                  ? "Подождите..."
                  : tab === "login"
                    ? "Войти"
                    : "Получить код на email"}
              </button>
            </>
          )}

          {/* ШАГ: ввод кода */}
          {step === "code" && (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-3">
                  <Icon name="Mail" size={22} className="text-white" />
                </div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Проверьте почту</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Отправили 6-значный код на<br />
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{form.email}</span>
                </p>
              </div>

              <div className="flex gap-2 justify-center mb-4" onPaste={handleCodePaste}>
                {code.map((ch, i) => (
                  <input
                    key={i}
                    ref={codeRefs[i]}
                    value={ch}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Backspace" && !ch && i > 0) codeRefs[i - 1].current?.focus();
                      if (e.key === "Enter" && codeStr.length === 6) submitRegister();
                    }}
                    maxLength={1}
                    inputMode="numeric"
                    className="w-11 h-12 rounded-xl text-center text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    style={{ background: "var(--input-bg)", border: `1px solid ${ch ? "hsl(var(--primary))" : "var(--border-color)"}`, color: "var(--text-primary)" }}
                  />
                ))}
              </div>

              {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

              <button onClick={submitRegister} disabled={loading || codeStr.length < 6}
                className="w-full py-3 rounded-xl gradient-btn text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50">
                {loading ? "Проверяю..." : "Подтвердить и создать аккаунт"}
              </button>

              <div className="flex items-center justify-between mt-3">
                <button onClick={() => { setStep("form"); setError(""); }}
                  className="text-xs transition-all hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
                  ← Назад
                </button>
                {resendTimer > 0
                  ? <span className="text-xs" style={{ color: "var(--text-muted)" }}>Повторно через {resendTimer}с</span>
                  : <button onClick={sendCode} disabled={loading}
                      className="text-xs transition-all hover:opacity-70 disabled:opacity-50" style={{ color: "var(--text-secondary)" }}>
                      Отправить снова
                    </button>
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
