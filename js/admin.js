// Lapak.AI — Admin Panel logic (v2)
// All data lives in localStorage on this browser only — see js/shared.js
// for the schema + functions shared with the public storefront (store.js).

let state = lapakaiLoad();

/* ---------------- Auth gate ---------------- */
const authScreen = document.getElementById('authScreen');
const adminShell = document.getElementById('adminShell');
const authTitle = document.getElementById('authTitle');
const authSub = document.getElementById('authSub');
const authForm = document.getElementById('authForm');
const authPass = document.getElementById('authPass');
const authPass2Wrap = document.getElementById('authPass2Wrap');
const authPass2 = document.getElementById('authPass2');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');

const isFirstRun = !state.auth.passcode;

function renderAuthMode(){
  if(isFirstRun){
    authTitle.textContent = 'Buat Passcode Admin';
    authSub.textContent = 'Karena ini pertama kali dibuka, buat passcode dulu buat kunci Admin Panel toko kamu.';
    authPass2Wrap.style.display = 'block';
    authSubmit.textContent = 'Buat & Masuk';
  } else {
    authTitle.textContent = 'Masuk Admin Panel';
    authSub.textContent = 'Masukin passcode buat kelola toko kamu.';
    authPass2Wrap.style.display = 'none';
    authSubmit.textContent = 'Masuk';
  }
}
renderAuthMode();

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  authError.style.display = 'none';

  if(isFirstRun){
    if(authPass.value.length < 4){
      authError.textContent = 'Passcode minimal 4 karakter ya.';
      authError.style.display = 'block';
      return;
    }
    if(authPass.value !== authPass2.value){
      authError.textContent = 'Konfirmasi passcode belum sama.';
      authError.style.display = 'block';
      return;
    }
    state.auth.passcode = authPass.value;
    lapakaiSave(state);
    unlockAdmin();
  } else {
    if(authPass.value !== state.auth.passcode){
      authError.textContent = 'Passcode salah, coba lagi.';
      authError.style.display = 'block';
      authPass.value = '';
      return;
    }
    unlockAdmin();
  }
});

function unlockAdmin(){
  authScreen.style.display = 'none';
  adminShell.style.display = 'grid';
  initAdminUI();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  adminShell.style.display = 'none';
  authScreen.style.display = 'flex';
  authPass.value = '';
  if(authPass2) authPass2.value = '';
  authError.style.display = 'none';
});

/* ---------------- Tabs ---------------- */
function initAdminUI(){
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

  fillProfileForm();
  fillAiForm();
  renderProducts();
  renderFaqs();
  refreshSummary();
  refreshPromptPreview();
  state.testHistory.forEach(m => renderTestLine(m.role, m.content));
}

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
  lapakaiSave(state);
  flashSaved('profileSaved');
  refreshSummary();
  refreshPromptPreview();
});

function flashSaved(id){
  const el = document.getElementById(id);
  el.style.display = 'inline';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

/* ---------------- Produk (with photo gallery) ---------------- */
const productList = document.getElementById('productList');

function renderProducts(){
  productList.innerHTML = '';
  if(state.products.length === 0){
    productList.innerHTML = '<div class="panel"><p class="panel-sub" style="margin:0;">Belum ada produk. Klik "+ Tambah Produk" buat mulai upload foto & isi detail.</p></div>';
    return;
  }
  state.products.forEach((prod) => {
    const card = document.createElement('div');
    card.className = 'product-editor';
    card.innerHTML = `
      <div class="product-editor-photos">
        <div class="thumb-grid" data-id="${prod.id}">
          ${prod.images.map((src, i) => `
            <div class="thumb">
              <img src="${src}" alt="foto produk ${i+1}">
              <button type="button" class="thumb-remove" data-id="${prod.id}" data-img="${i}" title="Hapus foto">✕</button>
            </div>
          `).join('')}
          <label class="dropzone dropzone-sm" data-id="${prod.id}">
            <input type="file" accept="image/*" multiple hidden>
            <span class="dz-icon">📷</span>
            <span>Tambah foto</span>
          </label>
        </div>
      </div>
      <div class="product-editor-fields">
        <div class="field-row">
          <div class="field">
            <label>Nama Produk</label>
            <input type="text" data-id="${prod.id}" data-field="name" value="${lapakaiEscapeHtml(prod.name)}" placeholder="Contoh: Kopi Robusta 200gr">
          </div>
          <div class="field">
            <label>Harga (Rp)</label>
            <input type="number" min="0" data-id="${prod.id}" data-field="price" value="${prod.price || ''}" placeholder="32000">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Kategori</label>
            <input type="text" data-id="${prod.id}" data-field="category" value="${lapakaiEscapeHtml(prod.category)}" placeholder="Contoh: Kopi Bubuk">
          </div>
          <div class="field" style="display:flex;align-items:flex-end;">
            <label class="stock-toggle">
              <input type="checkbox" data-id="${prod.id}" data-field="stock" ${prod.stock !== false ? 'checked' : ''}>
              Stok tersedia
            </label>
          </div>
        </div>
        <div class="field">
          <label>Deskripsi (dipakai AI buat jawab pelanggan)</label>
          <textarea data-id="${prod.id}" data-field="desc" placeholder="Contoh: Roasting tiap hari Senin, rasa nutty & rendah asam.">${lapakaiEscapeHtml(prod.desc)}</textarea>
        </div>
        <button class="kb-remove" data-remove-product="${prod.id}">Hapus Produk</button>
      </div>
    `;
    productList.appendChild(card);
  });

  // text/number field bindings
  productList.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
    const evt = inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(evt, (e) => {
      const id = e.target.dataset.id;
      const field = e.target.dataset.field;
      const prod = state.products.find(p => p.id === id);
      if(!prod) return;
      if(field === 'stock'){
        prod.stock = e.target.checked;
      } else if(field === 'price'){
        prod.price = Number(e.target.value) || 0;
      } else {
        prod[field] = e.target.value;
      }
      lapakaiSave(state);
      refreshPromptPreview();
    });
  });

  // remove product
  productList.querySelectorAll('[data-remove-product]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.removeProduct;
      state.products = state.products.filter(p => p.id !== id);
      lapakaiSave(state);
      renderProducts();
      refreshSummary();
      refreshPromptPreview();
    });
  });

  // remove single image
  productList.querySelectorAll('.thumb-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const imgIdx = Number(e.target.dataset.img);
      const prod = state.products.find(p => p.id === id);
      if(!prod) return;
      prod.images.splice(imgIdx, 1);
      lapakaiSave(state);
      renderProducts();
    });
  });

  // dropzones (click-to-browse + drag & drop)
  productList.querySelectorAll('.dropzone').forEach(zone => {
    const input = zone.querySelector('input[type=file]');
    const id = zone.dataset.id;

    input.addEventListener('change', () => handleFiles(id, input.files, zone));

    ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, (e) => {
      e.preventDefault(); zone.classList.add('dragover');
    }));
    ['dragleave','drop'].forEach(evt => zone.addEventListener(evt, (e) => {
      e.preventDefault(); zone.classList.remove('dragover');
    }));
    zone.addEventListener('drop', (e) => {
      handleFiles(id, e.dataTransfer.files, zone);
    });
  });
}

async function handleFiles(productId, fileList, zone){
  const prod = state.products.find(p => p.id === productId);
  if(!prod || !fileList || !fileList.length) return;
  zone.classList.add('dz-busy');
  for(const file of Array.from(fileList)){
    if(!file.type.startsWith('image/')) continue;
    try{
      const dataUrl = await lapakaiResizeImage(file);
      prod.images.push(dataUrl);
    }catch(err){
      console.error(err);
    }
  }
  zone.classList.remove('dz-busy');
  lapakaiSave(state);
  renderProducts();
  refreshPromptPreview();
}

document.getElementById('addProduct').addEventListener('click', () => {
  state.products.push({
    id: lapakaiUid(), name:'', price:0, category:'', desc:'', images:[], stock:true
  });
  lapakaiSave(state);
  renderProducts();
  refreshSummary();
});

/* ---------------- FAQ ---------------- */
const faqList = document.getElementById('faqList');

function renderFaqs(){
  faqList.innerHTML = '';
  if(state.faqs.length === 0){
    faqList.innerHTML = '<div class="panel"><p class="panel-sub" style="margin:0;">Belum ada FAQ. Klik "+ Tambah FAQ" buat isi pertanyaan yang sering ditanya pelanggan.</p></div>';
    return;
  }
  state.faqs.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'kb-item';
    row.innerHTML = `
      <div>
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px;">Pertanyaan</label>
        <input type="text" data-id="${item.id}" data-field="q" value="${lapakaiEscapeHtml(item.q)}" placeholder="Contoh: Apakah bisa COD?">
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px;">Jawaban</label>
        <textarea data-id="${item.id}" data-field="a" placeholder="Contoh: Bisa untuk area Sumedang kota.">${lapakaiEscapeHtml(item.a)}</textarea>
      </div>
      <button class="kb-remove" data-remove-faq="${item.id}">Hapus</button>
    `;
    faqList.appendChild(row);
  });

  faqList.querySelectorAll('input, textarea').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const field = e.target.dataset.field;
      const item = state.faqs.find(f => f.id === id);
      if(item){ item[field] = e.target.value; lapakaiSave(state); refreshPromptPreview(); }
    });
  });
  faqList.querySelectorAll('[data-remove-faq]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.removeFaq;
      state.faqs = state.faqs.filter(f => f.id !== id);
      lapakaiSave(state);
      renderFaqs();
      refreshSummary();
      refreshPromptPreview();
    });
  });
}

document.getElementById('addFaq').addEventListener('click', () => {
  state.faqs.push({ id: lapakaiUid(), q:'', a:'' });
  lapakaiSave(state);
  renderFaqs();
  refreshSummary();
});

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
  lapakaiSave(state);
  flashSaved('aiSaved');
  refreshSummary();
});

function refreshPromptPreview(){
  const el = document.getElementById('promptPreview');
  if(el) el.textContent = lapakaiBuildSystemPrompt(state);
}

/* ---------------- Ringkasan ---------------- */
function refreshSummary(){
  document.getElementById('statShopName').textContent = state.profile.name || 'Belum diisi';
  document.getElementById('statProductCount').textContent = state.products.length;
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

  const storeLink = document.getElementById('viewStoreLink');
  if(storeLink){
    storeLink.classList.toggle('disabled', !state.profile.name);
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
  lapakaiSave(state);
  refreshSummary();

  const thinkingLine = document.createElement('div');
  thinkingLine.className = 'chat-line bot';
  thinkingLine.id = 'thinkingLine';
  thinkingLine.innerHTML = '<div class="chat-avatar">AI</div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  testChatBody.appendChild(thinkingLine);
  testChatBody.scrollTop = testChatBody.scrollHeight;

  try{
    const reply = await lapakaiCallGroq(state, state.testHistory);
    document.getElementById('thinkingLine')?.remove();
    renderTestLine('assistant', reply);
    state.testHistory.push({ role:'assistant', content:reply });
    lapakaiSave(state);
  }catch(err){
    document.getElementById('thinkingLine')?.remove();
    renderTestLine('assistant', `⚠️ ${err.message}`);
  }
}

testSend.addEventListener('click', sendTestMessage);
testInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendTestMessage(); });
