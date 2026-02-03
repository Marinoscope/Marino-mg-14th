import { CONFIG, formatJPDate, uuidv4, apiPostReport } from "./utils.js";

const roundSel = document.getElementById("round");
const slotGrid = document.getElementById("slotGrid");
const submitBtn = document.getElementById("submit");
const msg = document.getElementById("msg");

// sitekey 差し替え（HTMLにもあるが念のため）
const tsDiv = document.getElementById("ts");
tsDiv.setAttribute("data-sitekey", CONFIG.TURNSTILE_SITEKEY);

function renderRound(){
  roundSel.innerHTML = CONFIG.ROUNDS.map(r => `<option value="${r}">${r}</option>`).join("");
}

function makeSlotCard(date, slot){
  const id = `${date}_S${slot}`;
  return `
    <div class="slotCard">
      <div class="slotHead">
        <div class="slotTitle">${formatJPDate(date)} 第${slot}部</div>
        <div class="small mono">${date}</div>
      </div>
      <div class="inline" style="margin-top:8px;">
        <label style="flex:1; min-width:160px;">
          <div class="small">応募口数（0以上）</div>
          <input class="input" inputmode="numeric" pattern="[0-9]*"
                 id="cnt_${id}" type="number" min="0" value="0"/>
        </label>
        <label class="check">
          <input id="rej_${id}" type="checkbox"/>
          落選あり
        </label>
      </div>
    </div>
  `;
}

function renderSlots(){
  const html = [];
  for (const date of CONFIG.DATES){
    for (const slot of CONFIG.SLOTS){
      html.push(makeSlotCard(date, slot));
    }
  }
  slotGrid.innerHTML = html.join("");
}

function setMsg(type, text){
  msg.innerHTML = `<div class="${type}">${text}</div>`;
}

function collectRecords(){
  const records = [];
  for (const date of CONFIG.DATES){
    for (const slot of CONFIG.SLOTS){
      const id = `${date}_S${slot}`;
      const cntEl = document.getElementById(`cnt_${id}`);
      const rejEl = document.getElementById(`rej_${id}`);

      const appliedCount = Number(cntEl.value);
      if (!Number.isFinite(appliedCount) || appliedCount < 0) {
        throw new Error(`${formatJPDate(date)} 第${slot}部：応募口数が不正です`);
      }

      records.push({
        date,
        slot,
        appliedCount: Math.floor(appliedCount),
        hasRejection: !!rejEl.checked,
      });
    }
  }
  return records;
}

async function onSubmit(){
  submitBtn.disabled = true;
  setMsg("notice", "送信中…");

  try{
    // Turnstile token 取得
    // ※ turnstile グローバルが使える前提
    const token = window.turnstile?.getResponse();
    if (!token) throw new Error("Turnstileが未完了です（チェックしてください）");

    const submissionId = uuidv4();
    const payload = {
      submissionId,
      round: roundSel.value,
      turnstileToken: token,
      userAgent: navigator.userAgent,
      records: collectRecords(),
    };

    await apiPostReport(payload);

    // token リセット（次の投稿に備える）
    window.turnstile?.reset();

    setMsg("success", "送信しました！ありがとうございます。ダッシュボードで反映を確認できます。");
  }catch(err){
    setMsg("error", `送信に失敗：${err.message || err}`);
  }finally{
    submitBtn.disabled = false;
  }
}

renderRound();
renderSlots();
submitBtn.addEventListener("click", onSubmit);

