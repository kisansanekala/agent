// Lapak.AI — store.js
// This is the PUBLIC page a real customer would land on. It reads
// whatever the shop owner configured in the Admin Panel (same-browser
// localStorage) and stays live — no "publish" step needed.

const state = lapakaiLoad();

/* ---------------- Empty state (shop not set up yet) ---------------- */
const emptyState = document.getElementById('emptyState');
const storeContent = document.getElementById('storeContent');

if(!state.profile.name){
  emptyState.style.display = 'flex';
  storeContent.style.display = 'none';
} else {
  emptyState.style.display = 'none';
  storeContent.style.display = 'block';
  renderHeader();
  renderProducts(state.products);
  renderFaqs();
  initChat();
}

/* ---------------- Header ---------------- */
function renderHeader(){
  const p = state.profile;
  document.getElementById('storeName').textContent = p.name;
  document.getElementById('storeDesc').textContent = p.desc || 'Toko ini belum menambahkan deskripsi.';
  document.title = p.name + ' — Toko Online';

  const hoursEl = document.getElementById('storeHours');
  if(p.hours){
    hoursEl.textContent = '🕒 ' + p.hours;
    hoursEl.style.display = 'inline-flex';
  } else {
    hoursEl.style.display = 'none';
  }

  const waEl = document.getElementById('storeWhatsapp');
  if(p.phone){
    const digits = p.phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    waEl.href = `https://wa.me/${digits}`;
    waEl.style.display = 'inline-flex';
  } else {
    waEl.style.display = 'none';
  }
}

/* ---------------- Product grid ---------------- */
const productGrid = document.getElementById('productGrid');
const productSearch = document.getElementById('productSearch');
const productEmpty = document.getElementById('productEmpty');

function renderProducts(list){
  productGrid.innerHTML = '';
  const visible = list.filter(p => p.name);

  if(visible.length === 0){
    productEmpty.style.display = 'block';
    return;
  }
  productEmpty.style.display = 'none';

  visible.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const cover = prod.images && prod.images[0];
    card.innerHTML = `
      <button class="product-photo" data-open-gallery="${prod.id}" ${!cover ? 'disabled' : ''}>
        ${cover ? `<img src="${cover}" alt="${lapakaiEscapeHtml(prod.name)}">` : `<span class="no-photo">Belum ada foto</span>`}
        ${prod.images && prod.images.length > 1 ? `<span class="product-photo-count">📷 ${prod.images.length}</span>` : ''}
        ${prod.stock === false ? `<span class="stock-flag">Stok Habis</span>` : ''}
      </button>
      <div class="product-body">
        ${prod.category ? `<span class="cat-tag">${lapakaiEscapeHtml(prod.category)}</span>` : ''}
        <h3>${lapakaiEscapeHtml(prod.name)}</h3>
        <p>${lapakaiEscapeHtml(prod.desc)}</p>
        <div class="price-tag">${lapakaiRupiah(prod.price)}</div>
      </div>
    `;
    productGrid.appendChild(card);
  });

  productGrid.querySelectorAll('[data-open-gallery]').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(btn.dataset.openGallery));
  });
}

productSearch.addEventListener('input', () => {
  const q = productSearch.value.trim().toLowerCase();
  if(!q){ renderProducts(state.products); return; }
  renderProducts(state.products.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.desc || '').toLowerCase().includes(q)
  ));
});

/* ---------------- Lightbox gallery ---------------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCounter = document.getElementById('lightboxCounter');
let lightboxImages = [];
let lightboxIdx = 0;

function openLightbox(productId){
  const prod = state.products.find(p => p.id === productId);
  if(!prod || !prod.images.length) return;
  lightboxImages = prod.images;
  lightboxIdx = 0;
  updateLightbox();
  lightbox.classList.add('open');
}
function updateLightbox(){
  lightboxImg.src = lightboxImages[lightboxIdx];
  lightboxCounter.textContent = `${lightboxIdx + 1} / ${lightboxImages.length}`;
}
document.getElementById('lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', (e) => { if(e.target === lightbox) lightbox.classList.remove('open'); });
document.getElementById('lightboxPrev').addEventListener('click', () => {
  lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
});
document.getElementById('lightboxNext').addEventListener('click', () => {
  lightboxIdx = (lightboxIdx + 1) % lightboxImages.length;
  updateLightbox();
});

/* ---------------- FAQ accordion ---------------- */
function renderFaqs(){
  const wrap = document.getElementById('faqAccordion');
  const section = document.getElementById('faqSection');
  const visible = state.faqs.filter(f => f.q);
  if(visible.length === 0){ section.style.display = 'none'; return; }
  wrap.innerHTML = visible.map((f, i) => `
    <div class="faq-item">
      <button class="faq-q" data-idx="${i}">
        <span>${lapakaiEscapeHtml(f.q)}</span>
        <span class="faq-caret">⌄</span>
      </button>
      <div class="faq-a"><p>${lapakaiEscapeHtml(f.a)}</p></div>
    </div>
  `).join('');
  wrap.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'));
  });
}

/* ---------------- Chat widget (real Groq call, live shop data) ---------------- */
const chatFab = document.getElementById('chatFab');
const chatPanel = document.getElementById('chatPanel');
const chatClose = document.getElementById('chatClose');
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatOffline = document.getElementById('chatOffline');

let chatHistory = [];

function initChat(){
  chatFab.addEventListener('click', () => {
    chatPanel.classList.toggle('open');
    if(chatPanel.classList.contains('open')) chatInput.focus();
  });
  chatClose.addEventListener('click', () => chatPanel.classList.remove('open'));

  if(!state.ai.key){
    chatOffline.style.display = 'block';
    chatInput.disabled = true;
    chatSend.disabled = true;
  } else {
    renderChatLine('bot', `Halo kak! Selamat datang di ${state.profile.name}. Ada yang bisa saya bantu? 😊`);
  }

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendChat(); });
}

function renderChatLine(role, text){
  const line = document.createElement('div');
  line.className = 'chat-line ' + (role === 'bot' ? 'bot' : 'me');
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = role === 'bot' ? (state.profile.name[0] || 'A').toUpperCase() : 'A';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  line.appendChild(avatar);
  line.appendChild(bubble);
  chatBody.appendChild(line);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendChat(){
  const text = chatInput.value.trim();
  if(!text) return;
  renderChatLine('user', text);
  chatInput.value = '';
  chatHistory.push({ role:'user', content:text });

  const thinking = document.createElement('div');
  thinking.className = 'chat-line bot';
  thinking.id = 'storeThinking';
  thinking.innerHTML = '<div class="chat-avatar">' + (state.profile.name[0] || 'A').toUpperCase() + '</div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  chatBody.appendChild(thinking);
  chatBody.scrollTop = chatBody.scrollHeight;

  try{
    const reply = await lapakaiCallGroq(state, chatHistory);
    document.getElementById('storeThinking')?.remove();
    renderChatLine('bot', reply);
    chatHistory.push({ role:'assistant', content:reply });

    // count real customer messages against the owner's dashboard stats
    const freshState = lapakaiLoad();
    freshState.msgCount = (freshState.msgCount || 0) + 1;
    lapakaiSave(freshState);
  }catch(err){
    document.getElementById('storeThinking')?.remove();
    renderChatLine('bot', 'Maaf kak, lagi ada gangguan koneksi ke AI. Coba hubungi toko langsung lewat WhatsApp ya 🙏');
  }
}
