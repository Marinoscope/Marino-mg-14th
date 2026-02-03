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

function renderHeatmap(summary){
  const { dates, slots, buckets, rejection } = summary;

  let html = `<table class="heatmap"><thead><tr><th></th>`;
  for (const s of slots) html += `<th>第${s}部</th>`;
  html += `</tr></thead><tbody>`;

  for (let i=0;i<dates.length;i++){
    html += `<tr><th style="text-align:left; padding-right:6px;">${formatJPDate(dates[i])}</th>`;
    for (let j=0;j<slots.length;j++){
      const b = buckets[i][j];
      const hasRej = !!rejection[i][j];
      html += `
        <td>
          <div class="cell b${b}">
            ${hasRej ? `<div class="rejDot" title="落選報告あり"></div>` : ``}
            <div class="tag">${b===0 ? "" : ""}</div>
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
          <div class="cell b0" style="display:flex; align-items:center; justify-content:center; font-weight:900;">
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
