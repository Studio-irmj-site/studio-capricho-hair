type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { id: string; email?: string };
};

let configPromise: Promise<{ url: string; anonKey: string } | null> | null = null;

export async function getSupabaseConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const value = await response.json();
        return value.url && value.anonKey ? value : null;
      })
      .catch(() => null);
  }
  return configPromise;
}

export function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("capricho_admin_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem("capricho_admin_session", JSON.stringify(session));
  else localStorage.removeItem("capricho_admin_session");
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body.message || body.error_description || body.hint || body.error || "Não foi possível concluir a operação.";
}

export async function signIn(email: string, password: string) {
  const config = await getSupabaseConfig();
  if (!config) throw new Error("Conecte o projeto ao Supabase para acessar o painel.");
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  const session: Session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
  };
  storeSession(session);
  return session;
}

export async function signOut() {
  const config = await getSupabaseConfig();
  const session = getStoredSession();
  if (config && session) {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: config.anonKey, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
  storeSession(null);
}

async function validSession(config: { url: string; anonKey: string }) {
  const session = getStoredSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
  if (!session.expires_at || session.expires_at * 1000 > Date.now() + 60_000) return session;
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    storeSession(null);
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  const data = await response.json();
  const refreshed: Session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: data.expires_at,
    user: data.user || session.user,
  };
  storeSession(refreshed);
  return refreshed;
}

export async function supabaseRequest<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const config = await getSupabaseConfig();
  if (!config) throw new Error("Supabase ainda não foi conectado.");
  const session = authenticated ? await validSession(config) : null;
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session?.access_token || config.anonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) storeSession(null);
    throw new Error(await parseError(response));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function rpc<T>(name: string, body: unknown, authenticated = false) {
  return supabaseRequest<T>(`rpc/${name}`, { method: "POST", cache: "no-store", body: JSON.stringify(body) }, authenticated);
}

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export function dateBR(value: string) {
  if (!value) return "—";
  const [, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${value.slice(0, 4)}`;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}
