export const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbzIxirtGo1W-p3P0OjlS87l-EDDyXpySb65eDVP9VOj1dhhT6b72c260zt430KGihxs9w/exec",  // ここだけ差し替え
  TURNSTILE_SITEKEY: "0x4AAAAAACXGSWcz_G9TQ_K4", // ここだけ差し替え
  DATES: [
    "2026-03-15",
    "2026-03-29",
    "2026-04-05",
    "2026-04-19",
    "2026-05-30",
    "2026-05-31",
  ],
  SLOTS: [1,2,3,4,5,6],
  ROUNDS: Array.from({length:15}, (_,i)=> `${i+1}次`),
};

export function formatJPDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return `${m}月${d}日`;
}

export function uuidv4(){
  // crypto.randomUUID が使える環境ならそれを優先
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const toHex = (n)=> n.toString(16).padStart(2,"0");
  const s = Array.from(buf, toHex).join("");
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

export async function apiGetSummary(){
  const res = await fetch(CONFIG.GAS_URL, { method:"GET", cache:"no-store" });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return await res.json();
}

export async function apiPostReport(payload){
  const res = await fetch(CONFIG.GAS_URL, {
    method:"POST",
    cache:"no-store",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(()=> ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `POST failed: ${res.status}`);
  return json;
}

export async function apiPostPin(pin){
  const res = await fetch(CONFIG.GAS_URL, {
    method:"POST",
    cache:"no-store",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify({ pin }),
  });
  const json = await res.json().catch(()=> ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `PIN failed: ${res.status}`);
  return json;
}

