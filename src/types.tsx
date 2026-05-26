import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

/* ─── Types ─── */
export interface User { id: number; username: string; display_name: string; avatar_letters: string }
export interface Chat { id: number; partner_id: number; partner_name: string; partner_avatar: string; partner_last_seen: string | null; last_msg: string | null; last_msg_time: string | null }
export interface Message { id: number; sender_id: number; sender_name: string; sender_avatar: string; text: string; created_at: string; is_mine: boolean; file_url?: string; file_name?: string; file_type?: string }

/* ─── Utils ─── */
export function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.includes("+") || iso.includes("Z") ? iso : iso + "Z");
  const now = new Date();
  if (now.getTime() - d.getTime() < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Theme hook ─── */
export function useTheme() {
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

/* ─── Avatar ─── */
export function Av({ letters, size = "md" }: { letters: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  return (
    <div className={`${s} rounded-full gradient-btn flex items-center justify-center font-bold text-white flex-shrink-0`}>{letters || "?"}</div>
  );
}
