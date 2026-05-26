import { useState, useEffect } from "react";
import { authApi } from "@/api";
import { User, useTheme } from "@/types";
import { AuthScreen } from "@/components/AuthScreen";
import { Messenger } from "@/components/Messenger";

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
