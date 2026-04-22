const URLS = {
  auth: "https://functions.poehali.dev/06836859-af40-4083-a3a6-830d556c61d3",
  chats: "https://functions.poehali.dev/736eae88-8e3f-4328-a9f1-fb48ca0454d3",
  messages: "https://functions.poehali.dev/ac06b19c-7411-4c30-9072-9014aa1bb57c",
  upload: "https://functions.poehali.dev/b608be4a-53a8-4020-9e50-c936fa1780aa",
};

function getSession(): string {
  return localStorage.getItem("andrew_session") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", "X-Session-Id": getSession() };
}

async function post(url: string, body: object) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  return r.json();
}

async function get(url: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(qs ? `${url}?${qs}` : url, { method: "GET", headers: authHeaders() });
  return r.json();
}

// Auth
export const authApi = {
  me: () => get(URLS.auth, { action: "me" }),
  register: (data: { username: string; display_name: string; email: string; password: string }) =>
    post(URLS.auth, { action: "register", ...data }),
  login: (login: string, password: string) =>
    post(URLS.auth, { action: "login", login, password }),
  logout: () => post(URLS.auth, { action: "logout" }),
  updateProfile: (display_name: string, avatar_letters: string) =>
    post(URLS.auth, { action: "update_profile", display_name, avatar_letters }),
};

// Chats
export const chatsApi = {
  list: () => get(URLS.chats, { action: "list" }),
  search: (q: string) => get(URLS.chats, { action: "search", q }),
  open: (partner_id: number) => post(URLS.chats, { action: "open", partner_id }),
};

// Messages
export const messagesApi = {
  history: (chat_id: number, after_id = 0) =>
    get(URLS.messages, { action: "history", chat_id: String(chat_id), after_id: String(after_id) }),
  send: (chat_id: number, text: string) =>
    post(URLS.messages, { action: "send", chat_id, text }),
};

// Upload
export const uploadApi = {
  file: (chat_id: number, file_base64: string, file_name: string, file_type: string) =>
    post(URLS.upload, { chat_id, file_base64, file_name, file_type }),
};