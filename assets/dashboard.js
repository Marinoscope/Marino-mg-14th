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
 * - 0: 白
 * - >0: 最大値に対する相対濃淡（GAS側で0〜100に正規化済み）
 */
function heatStyleFromIntensity(p){
  const v = Number(p);
  if (!Number.isFinite(v) || v <= 0) {
    return "background:#ffffff;";
  }

  // 0〜100 → 見える範囲のalphaへ（薄すぎ問題を防ぐ）
  // 例：1でもうっすら分かり、100でしっかり濃い
  const alpha = 0.12 + (v / 100) * 0.82; // 0.12〜0.94

  // パールグリーン寄り（好みで微調整OK）
  // ※色は緑ベースで、濃淡はalphaで表現
  const r = 90, g = 170, b = 140;

  return `background: rgba(${r}, ${g}, ${b}, ${alpha});`;
}

function renderHeatmap(summary){
  // intensity方式に対応：bucketsは使わない
  const { dates, slots, intensity, rejection } = summary;

  // 互換：まだbucketsしか返ってこない場合はエラーにする（気づきやすくする）
  if (!Array.isArray(intensity)) {
    throw new Error("summary.intensity が見つかりません（GASのGETを intensity 返却に変更してください）");
  }

  let html = `<table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const p = intensity[i][j];          // 0〜100
      const hasRej = !!rejection[i][j];
      const style = heatStyleFromIntensity(p);

      html += `
        <td>
          <div class="cell" style="${style}">
            ${hasRej ? `<div class="rejDot" title="落選報告あり"></div>` : ``}
            <div class="tag">${p && p > 0 ? "" : ""}</div>
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
  const { dates, slots, rejection } = summary;
  const items = [];
  for (let i=0;i<dates.length;i++){
    for (let j=0;j<slots.length;j++){
      if (rejection[i][j]) items.push(`${formatJPDate(dates[i])} 第${slots[j]}部`);
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

    updated.textContent = `更新: ${summary.updatedAt || "-"}`;
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
