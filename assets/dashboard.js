import { CONFIG, formatJPDate, apiGetSummary, apiPostPin } from "./utils.js";

const mapWrap = document.getElementById("mapWrap");
const rejList = document.getElementById("rejList");
const updated = document.getElementById("updated");
const msg = document.getElementById("msg");

const pinEl = document.getElementById("pin");
const unlockBtn = document.getElementById("unlock");
const totalsWrap = document.getElementById("totalsWrap");

function setMsg(type, text){
  msg.innerHTML = `<div class="${type}">${text}</div>`;
}

/**
 * intensity(0〜100) → 背景色（緑ベース）
 * 0は白
 */
function heatStyleFromIntensity(p){
  const v = Number(p);
  if (!Number.isFinite(v) || v <= 0) return "background:#ffffff;";

  // 薄すぎ回避：最低でも少し色が付く
  const alpha = 0.12 + (v / 100) * 0.82; // 0.12〜0.94

  // パールグリーン寄り（緑ベース）
  const r = 90, g = 170, b = 140;
  return `background: rgba(${r}, ${g}, ${b}, ${alpha});`;
}

/**
 * summary の形を吸収して「必ず intensity(6x6)」を返す
 * - summary.intensity があればそれを使う（ただし欠けても落ちない）
 * - なければ summary.buckets(0〜4) を 0/25/50/75/100 に変換して使う
 */
function normalizeIntensity_(summary){
  const dates = summary?.dates || CONFIG.DATES;
  const slots = summary?.slots || CONFIG.SLOTS;

  // 1) intensity がある場合（ただし壊れてても落ちないように補完）
  if (Array.isArray(summary?.intensity)) {
    const src = summary.intensity;
    return dates.map((_, i) =>
      slots.map((__, j) => Number(src?.[i]?.[j] ?? 0))
    );
  }

  // 2) buckets しかない場合は変換
  if (Array.isArray(summary?.buckets)) {
    const src = summary.buckets;
    const map = [0, 25, 50, 75, 100];
    return dates.map((_, i) =>
      slots.map((__, j) => {
        const b = Number(src?.[i]?.[j] ?? 0);
        return map[Math.max(0, Math.min(4, b))];
      })
    );
  }

  // 3) どっちも無い場合は全部0
  return dates.map(() => slots.map(() => 0));
}

function renderHeatmap(summary){
  const dates = summary?.dates || CONFIG.DATES;
  const slots = summary?.slots || CONFIG.SLOTS;
  const rejection = summary?.rejection || dates.map(() => slots.map(() => false));

  const intensity = normalizeIntensity_(summary);

  let html = `<table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const p = Number(intensity?.[i]?.[j] ?? 0);
      const hasRej = !!(rejection?.[i]?.[j]);
      const style = heatStyleFromIntensity(p);

      html += `
        <td>
          <div class="cell" style="${style}">
            ${hasRej ? `<div class="rejDot" title="落選報告あり"></div>` : ``}
            <div class="tag"></div>
          </div>
        </td>
      `;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  mapWrap.innerHTML = html;

  // デバッグ表示（必要なら後で消してOK）
  const mode = Array.isArray(summary?.intensity) ? "intensity" : (Array.isArray(summary?.buckets) ? "buckets→intensity変換" : "none");
  updated.textContent = `更新: ${summary.updatedAt || "-"} / mode: ${mode}`;
}

function renderRejectionList(summary){
  const dates = summary?.dates || CONFIG.DATES;
  const slots = summary?.slots || CONFIG.SLOTS;
  const rejection = summary?.rejection || dates.map(() => slots.map(() => false));

  const items = [];
  for (let i=0;i<dates.length;i++){
    for (let j=0;j<slots.length;j++){
      if (rejection?.[i]?.[j]) items.push(`${formatJPDate(dates[i])} 第${slots[j]}部`);
    }
  }
  rejList.textContent = items.length ? items.join(" / ") : "（まだありません）";
}

function renderTotalsTable(totals){
  const { dates, slots, totals: mtx, rejection } = totals;
  let html = `<div class="notice">PIN認証OK：合算数値を表示します（スクショ共有など注意）。</div>`;
  html += `<div class="tablewrap" style="margin-top:10px;"><table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const v = mtx[i][j];
      const hasRej = !!rejection[i][j];
      html += `
        <td>
          <div class="cell" style="display:flex; align-items:center; justify-content:center; font-weight:900; background:#fff;">
            ${hasRej ? `<span style="margin-right:6px;">●</span>` : ``}
            <span>${v}</span>
          </div>
        </td>
      `;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  totalsWrap.innerHTML = html;
}

async function load(){
  setMsg("notice", "読み込み中…");
  try{
    const summary = await apiGetSummary();
    if (!summary.ok) throw new Error(summary.error || "summary error");

    renderHeatmap(summary);
    renderRejectionList(summary);

    setMsg("success", "表示しました。");
  }catch(err){
    setMsg("error", `読み込みに失敗：${err.message || err}`);
  }
}

async function unlock(){
  unlockBtn.disabled = true;
  totalsWrap.innerHTML = "";
  setMsg("notice", "PIN確認中…");
  try{
    const pin = pinEl.value.trim();
    if (!pin) throw new Error("PINを入力してください");
    const data = await apiPostPin(pin);
    if (!data.ok) throw new Error(data.error || "PIN error");
    renderTotalsTable(data.totals);
    setMsg("success", "PIN認証OK");
  }catch(err){
    setMsg("error", `PIN認証に失敗：${err.message || err}`);
  }finally{
    unlockBtn.disabled = false;
  }
}

unlockBtn.addEventListener("click", unlock);
load();
