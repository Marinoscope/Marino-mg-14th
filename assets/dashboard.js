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

// intensity(0〜100) → 背景色（緑ベース） / 0は白
function heatStyleFromIntensity(p){
  const v = Number(p);
  if (!Number.isFinite(v) || v <= 0) return "background:#ffffff;";

  // 薄すぎ回避
  const alpha = 0.12 + (v / 100) * 0.82; // 0.12〜0.94
  const r = 90, g = 170, b = 140;        // パールグリーン寄り
  return `background: rgba(${r}, ${g}, ${b}, ${alpha});`;
}

function renderHeatmap(summary){
  const dates = summary?.dates || CONFIG.DATES;
  const slots = summary?.slots || CONFIG.SLOTS;

  const intensity = summary?.intensity;
  const rejectionCounts = summary?.rejectionCounts;

  if (!Array.isArray(intensity) || !Array.isArray(rejectionCounts)) {
    throw new Error("summary.intensity / summary.rejectionCounts が見つかりません（GASを更新してください）");
  }

  let html = `<table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const p = Number(intensity?.[i]?.[j] ?? 0);
      const cnt = Number(rejectionCounts?.[i]?.[j] ?? 0);
      const style = heatStyleFromIntensity(p);

      html += `
        <td>
          <div class="cell" style="${style}">
            ${cnt > 0 ? `<div class="rejStar" title="落選報告 ${cnt}件">★</div>` : ``}
          </div>
        </td>
      `;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  mapWrap.innerHTML = html;
}

function renderRejectionList(summary){
  const dates = summary?.dates || CONFIG.DATES;
  const slots = summary?.slots || CONFIG.SLOTS;
  const rejectionCounts = summary?.rejectionCounts || dates.map(() => slots.map(() => 0));

  const items = [];
  for (let i=0;i<dates.length;i++){
    for (let j=0;j<slots.length;j++){
      const c = Number(rejectionCounts?.[i]?.[j] ?? 0);
      if (c > 0) items.push(`${formatJPDate(dates[i])} 第${slots[j]}部：${c}件`);
    }
  }
  rejList.textContent = items.length ? items.join(" / ") : "（まだありません）";
}

function renderTotalsTable(totals){
  const { dates, slots, totals: mtx, rejectionCounts } = totals;

  let html = `<div class="notice">コード認証OK：合算数値を表示します（スクショ共有など注意）。</div>`;
  html += `<div class="tablewrap" style="margin-top:10px;"><table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const v = Number(mtx?.[i]?.[j] ?? 0);
      const c = Number(rejectionCounts?.[i]?.[j] ?? 0);
      html += `
        <td>
          <div class="cell" style="display:flex; align-items:center; justify-content:center; font-weight:900; background:#fff;">
            ${c > 0 ? `<span style="margin-right:6px;">★</span>` : ``}
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

    updated.textContent = `更新: ${summary.updatedAt || "-"}`;
    setMsg("success", "表示しました。");
  }catch(err){
    setMsg("error", `読み込みに失敗：${err.message || err}`);
  }
}

async function unlock(){
  unlockBtn.disabled = true;
  totalsWrap.innerHTML = "";
  setMsg("notice", "コード確認中…");
  try{
    const pin = pinEl.value.trim();
    if (!pin) throw new Error("コードを入力してください");
    const data = await apiPostPin(pin);
    if (!data.ok) throw new Error(data.error || "PIN error");
    renderTotalsTable(data.totals);
    setMsg("success", "コード認証OK");
  }catch(err){
    setMsg("error", `コード認証に失敗：${err.message || err}`);
  }finally{
    unlockBtn.disabled = false;
  }
}

unlockBtn.addEventListener("click", unlock);
load();
