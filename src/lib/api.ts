const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4100";
let inflightRequests = 0;
let refreshPromise: Promise<void> | null = null;

type JsonObject = Record<string, unknown>;

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  accountScope?: "STAFF" | "PUBLIC";
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    outletId?: string | null;
  };
};

function emitNetworkState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:network", { detail: { inFlight: inflightRequests } })
  );
}

function beginRequest() {
  inflightRequests += 1;
  emitNetworkState();
}

function endRequest() {
  inflightRequests = Math.max(0, inflightRequests - 1);
  emitNetworkState();
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asObject(value: unknown): JsonObject | null {
  if (typeof value === "object" && value !== null) {
    return value as JsonObject;
  }
  return null;
}

function getNestedObject(input: unknown, key: string): JsonObject | null {
  const obj = asObject(input);
  if (!obj) return null;
  return asObject(obj[key]);
}

function getNestedString(input: unknown, key: string): string | null {
  const obj = asObject(input);
  if (!obj) return null;
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

function payloadErrorMessage(payload: unknown, fallback: string): string {
  const directMessage = getNestedString(payload, "message");
  if (directMessage) return directMessage;

  const errorObj = getNestedObject(payload, "error");
  if (!errorObj) return fallback;

  const msg = errorObj.message;
  return typeof msg === "string" ? msg : fallback;
}

function payloadErrorCode(payload: unknown, fallback: string): string {
  const directCode = getNestedString(payload, "code");
  if (directCode) return directCode;

  const errorObj = getNestedObject(payload, "error");
  if (!errorObj) return fallback;

  const code = errorObj.code;
  return typeof code === "string" ? code : fallback;
}

function toRefreshResponse(payload: unknown): RefreshResponse | null {
  const root = asObject(payload);
  if (!root) return null;

  const accessToken = root.accessToken;
  const refreshToken = root.refreshToken;
  const user = asObject(root.user);

  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || !user) {
    return null;
  }

  const id = user.id;
  const role = user.role;
  const fullName = user.fullName;
  const email = user.email;
  const outletId = user.outletId;

  if (
    typeof id !== "string" ||
    typeof role !== "string" ||
    typeof fullName !== "string" ||
    typeof email !== "string"
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    accountScope: root.accountScope === "PUBLIC" ? "PUBLIC" : "STAFF",
    user: {
      id,
      role,
      fullName,
      email,
      outletId: typeof outletId === "string" || outletId === null || outletId === undefined ? outletId : null
    }
  };
}

export function setAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  accountScope?: "STAFF" | "PUBLIC";
  userRole: string;
  userName: string;
  userEmail: string;
  userId: string;
  outletId?: string | null;
}) {
  localStorage.setItem("accessToken", payload.accessToken);
  localStorage.setItem("refreshToken", payload.refreshToken);
  localStorage.setItem("accountScope", payload.accountScope || "STAFF");
  localStorage.setItem("userRole", payload.userRole);
  localStorage.setItem("userName", payload.userName);
  localStorage.setItem("userEmail", payload.userEmail);
  localStorage.setItem("userId", payload.userId);
  if (payload.outletId) {
    localStorage.setItem("outletId", payload.outletId);
  } else {
    localStorage.removeItem("outletId");
  }
}

export function getAccessToken() {
  return localStorage.getItem("accessToken") || "";
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken") || "";
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("accountScope");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("outletId");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userPhotoUrl");
}

export function updateStoredUserIdentity(input: { fullName: string; email: string }) {
  localStorage.setItem("userName", input.fullName);
  localStorage.setItem("userEmail", input.email);
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) {
    clearAuthSession();
    throw new Error("Missing refresh token");
  }

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefresh })
    });

    const payload = parseJson(await res.text());

    if (!res.ok) {
      clearAuthSession();
      throw Object.assign(new Error(payloadErrorMessage(payload, "Session expired")), {
        code: payloadErrorCode(payload, "UNAUTHORIZED")
      });
    }

    const data = toRefreshResponse(payload);
    if (!data) {
      clearAuthSession();
      throw new Error("Invalid refresh response");
    }

    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accountScope: data.accountScope,
      userRole: data.user.role,
      userName: data.user.fullName,
      userEmail: data.user.email,
      userId: data.user.id,
      outletId: data.user.outletId
    });
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function runRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-cache");
  }
  if (!headers.has("Pragma")) {
    headers.set("Pragma", "no-cache");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  beginRequest();
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: options.cache ?? "no-store"
    });
  } finally {
    endRequest();
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await runRequest(path, options);

  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshAccessToken();
      res = await runRequest(path, options);
    } catch {
      clearAuthSession();
      window.location.assign("/login");
      throw new Error("Session expired");
    }
  }

  const payload = parseJson(await res.text());

  if (!res.ok) {
    const message = payloadErrorMessage(payload, "Request failed");
    const code = payloadErrorCode(payload, "API_ERROR");
    throw Object.assign(new Error(message), { code, status: res.status, data: payload });
  }

  return payload as T;
}

export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  beginRequest();
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers }).finally(() => {
    endRequest();
  });

  const payload = parseJson(await res.text());

  if (!res.ok) {
    const message = payloadErrorMessage(payload, "Request failed");
    const code = payloadErrorCode(payload, "API_ERROR");
    throw Object.assign(new Error(message), { code, status: res.status, data: payload });
  }

  return payload as T;
}

export type StaffProfileResponse = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  locationLabel?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getStaffProfile() {
  return apiFetch<StaffProfileResponse>("/api/auth/me");
}

export function updateStaffProfile(input: {
  fullName: string;
  email: string;
  locationLabel?: string | null;
}) {
  return apiFetch<StaffProfileResponse>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function changeStaffPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiFetch<{ success: true }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
