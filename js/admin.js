// Lapak.AI — Admin Panel logic
// All data is stored in localStorage on this browser only.

const STORE_KEY = 'lapakai_state_v1';

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) throw new Error('empty');
    return JSON.parse(raw);
  }catch(e){
    return {
      profile: { name:'', desc:'', phone:'', hours:'', tone:'ramah dan santai, sesekali pakai emoji' },
      kb: [],
      ai: { key:'', model:'openai/gpt-oss-120b' },
      testHistory: [],
      msgCount: 0
    };
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

let state = loadState();

/* ---------------- Tabs ---------------- */
const navButtons = document.querySelectorAll('.admin-nav button');
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab === 'ringkasan') refreshSummary();
    if(btn.dataset.tab === 'ai') refreshPromptPreview();
  });
});

/* ---------------- Profil Toko ---------------- */
const shopName = document.getElementById('shopName');
const shopDesc = document.getElementById('shopDesc');
const shopPhone = document.getElementById('shopPhone');
const shopHours = document.getElementById('shopHours');
const shopTone = document.getElementById('shopTone');

function fillProfileForm(){
  shopName.value = state.profile.name;
  shopDesc.value = state.profile.desc;
  shopPhone.value = state.profile.phone;
  shopHours.value = state.profile.hours;
  shopTone.value = state.profile.tone;
}

document.getElementById('saveProfile').addEventListener('click', () => {
  state.profile = {
    name: shopName.value.trim(),
    desc: shopDesc.value.trim(),
    phone: shopPhone.value.trim(),
    hours: shopHours.value.trim(),
    tone: shopTone.value
  };
  saveState();
  flashSaved('profileSaved');
  refreshSummary();
  refreshPromptPreview();
});

function flashSaved(id){
  const el = document.getElementById(id);
  el.style.display = 'inline';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

/* ---------------- Basis Pengetahuan ---------------- */
const kbList = document.getElementById('kbList');

function renderKb(){
  kbList.innerHTML = '';
  if(state.kb.length === 0){
    kbList.innerHTML = '<div class="panel"><p class="panel-sub" style="margin:0;">Belum ada item. Klik "+ Tambah Item" buat mulai isi produk atau FAQ.</p></div>';
    return;
  }
  state.kb.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'kb-item';
    row.innerHTML = `
      <div>
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px;">Judul / Nama Produk</label>
        <input type="text" data-idx="${idx}" data-field="title" value="${escapeHtml(item.title)}" placeholder="Contoh: Kopi Robusta 200gr">
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px;">Detail / Jawaban</label>
        <textarea data-idx="${idx}" data-field="detail" placeholder="Contoh: Harga Rp32.000, stok selalu ready, roasting tiap hari Senin.">${escapeHtml(item.detail)}</textarea>
      </div>
      <button class="kb-remove" data-idx="${idx}">Hapus</button>
    `;
    kbList.appendChild(row);
  });

  kbList.querySelectorAll('input, textarea').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      state.kb[idx][field] = e.target.value;
      saveState();
      refreshPromptPreview();
    });
  });
  kbList.querySelectorAll('.kb-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.idx);
      state.kb.splice(idx, 1);
      saveState();
      renderKb();
      refreshSummary();
      refreshPromptPreview();
    });
  });
}

document.getElementById('addKbItem').addEventListener('click', () => {
  state.kb.push({ title:'', detail:'' });
  saveState();
  renderKb();
  refreshSummary();
});

function escapeHtml(str){
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------- Pengaturan AI ---------------- */
const groqKey = document.getElementById('groqKey');
const groqModel = document.getElementById('groqModel');

function fillAiForm(){
  groqKey.value = state.ai.key;
  groqModel.value = state.ai.model;
}

document.getElementById('saveAiSettings').addEventListener('click', () => {
  state.ai.key = groqKey.value.trim();
  state.ai.model = groqModel.value;
  saveState();
  flashSaved('aiSaved');
  refreshSummary();
});

function buildSystemPrompt(){
  const p = state.profile;
  const kbText = state.kb
    .filter(i => i.title || i.detail)
    .map(i => `- ${i.title}: ${i.detail}`)
    .join('\n');

  return [
    `Kamu adalah asisten chat untuk toko "${p.name || '(nama toko belum diisi)'}".`,
    p.desc ? `Deskripsi toko: ${p.desc}` : null,
    p.hours ? `Jam operasional: ${p.hours}` : null,
    p.phone ? `Kontak WhatsApp toko: ${p.phone}` : null,
    `Gaya bahasa balasan: ${p.tone}.`,
    `Jawab HANYA berdasarkan informasi produk/FAQ berikut. Jika pelanggan menanyakan hal di luar data ini, jawab dengan jujur bahwa kamu akan menanyakan ke pemilik toko dulu.`,
    kbText ? `Data produk & FAQ:\n${kbText}` : `(Belum ada data produk/FAQ — jawab secara umum dan ramah dulu.)`
  ].filter(Boolean).join('\n\n');
}

function refreshPromptPreview(){
  const el = document.getElementById('promptPreview');
  if(el) el.textContent = buildSystemPrompt();
}

/* ---------------- Ringkasan ---------------- */
function refreshSummary(){
  document.getElementById('statShopName').textContent = state.profile.name || 'Belum diisi';
  document.getElementById('statKbCount').textContent = state.kb.length;
  document.getElementById('statModel').textContent = state.ai.model;
  document.getElementById('statMsgCount').textContent = state.msgCount;

  const badge = document.getElementById('setupBadge');
  if(state.ai.key){
    badge.textContent = 'Tersambung ke Groq';
    badge.className = 'badge ok';
  } else {
    badge.textContent = 'Belum disambungkan ke AI';
    badge.className = 'badge warn';
  }
}

/* ---------------- Uji Coba Chat (real Groq API call) ---------------- */
const testChatBody = document.getElementById('testChatBody');
const testInput = document.getElementById('testInput');
const testSend = document.getElementById('testSend');

function renderTestLine(role, text){
  const line = document.createElement('div');
  line.className = 'chat-line ' + (role === 'assistant' ? 'bot' : 'me');
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = role === 'assistant' ? 'AI' : 'A';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  line.appendChild(avatar);
  line.appendChild(bubble);
  testChatBody.appendChild(line);
  testChatBody.scrollTop = testChatBody.scrollHeight;
}

async function sendTestMessage(){
  const text = testInput.value.trim();
  if(!text) return;

  if(!state.ai.key){
    renderTestLine('assistant', 'Masukin dulu Groq API key kamu di tab "Pengaturan AI" ya, biar saya bisa jawab beneran.');
    return;
  }

  renderTestLine('user', text);
  testInput.value = '';
  state.testHistory.push({ role:'user', content:text });
  state.msgCount++;
  saveState();
  refreshSummary();

  const thinkingLine = document.createElement('div');
  thinkingLine.className = 'chat-line bot';
  thinkingLine.id = 'thinkingLine';
  thinkingLine.innerHTML = '<div class="chat-avatar">AI</div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  testChatBody.appendChild(thinkingLine);
  testChatBody.scrollTop = testChatBody.scrollHeight;

  try{
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.ai.key}`
      },
      body: JSON.stringify({
        model: state.ai.model,
        messages: [
          { role:'system', content: buildSystemPrompt() },
          ...state.testHistory.slice(-8)
        ],
        temperature: 0.6
      })
    });

    const data = await response.json();
    document.getElementById('thinkingLine')?.remove();

    if(!response.ok){
      const msg = data?.error?.message || 'Terjadi kesalahan saat menghubungi Groq API.';
      renderTestLine('assistant', `⚠️ ${msg}`);
      return;
    }

    const reply = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses itu.';
    renderTestLine('assistant', reply);
    state.testHistory.push({ role:'assistant', content:reply });
    saveState();
  }catch(err){
    document.getElementById('thinkingLine')?.remove();
    renderTestLine('assistant', '⚠️ Gagal terhubung ke Groq API. Cek koneksi internet & API key kamu.');
  }
}

testSend.addEventListener('click', sendTestMessage);
testInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendTestMessage(); });

/* ---------------- Init ---------------- */
fillProfileForm();
fillAiForm();
renderKb();
refreshSummary();
refreshPromptPreview();
state.testHistory.forEach(m => renderTestLine(m.role, m.content));
