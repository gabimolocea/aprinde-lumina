import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
});

// Attach auth token when present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["Authorization"] = `Token ${token}`;
  return config;
});

/** Submit a contact form message */
export async function submitContact({ name, email, phone, message }) {
  const { data } = await api.post("/api/contact/", { name, email, phone, message });
  return data;
}

/** Fetch active candles within a row window */
export async function fetchCandles({ rowMin, rowMax }) {
  const { data } = await api.get("/api/candles/", {
    params: { row_min: rowMin, row_max: rowMax },
  });
  return data;
}

/** Fetch wall meta (dimensions, price thresholds) */
export async function fetchWallMeta() {
  const { data } = await api.get("/api/candles/meta/");
  return data;
}

/** Fetch full candle detail (with photo url) */
export async function fetchCandleDetail(id) {
  const { data } = await api.get(`/api/candles/${id}/`);
  return data;
}

/**
 * Create a pending candle + get Stripe client_secret.
 * formData is a FormData instance (supports file upload).
 */
export async function createCandle(formData) {
  const { data } = await api.post("/api/candles/create/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { candle_id, price_lei, client_secret }
}

/**
 * Light a free candle (bottom-zone 5 RON slots only).
 * No authentication required — just phone + requester_name + dedicated_to_name.
 */
export async function createFreeCandle({ phone, requester_name, dedicated_to_name, col, row }) {
  const { data } = await api.post("/api/candles/free/", {
    phone,
    requester_name,
    dedicated_to_name,
    col,
    row,
  });
  return data; // { candle_id, free: true }
}

// --- Auth ---

export async function requestOTP(phone) {
  const { data } = await api.post("/api/auth/request-otp/", { phone });
  return data;
}

export async function verifyOTP(phone, code) {
  const { data } = await api.post("/api/auth/verify-otp/", { phone, code });
  return data; // { token, user }
}

export async function fetchMe(token) {
  const { data } = await api.get("/api/auth/me/", {
    headers: { Authorization: `Token ${token}` },
  });
  return data;
}

export async function logout(token) {
  await api.post(
    "/api/auth/logout/",
    {},
    { headers: { Authorization: `Token ${token}` } }
  );
}

/**
 * Fetch active banners, optionally filtered by placement.
 * Placements: top_mobile | top_desktop | strip_mobile | inline_desktop
 */
export async function fetchBanners(placement) {
  const params = placement ? { placement } : {};
  const { data } = await api.get("/api/banners/", { params });
  return data; // array of { id, placement, image_url, link_url, width, height }
}

