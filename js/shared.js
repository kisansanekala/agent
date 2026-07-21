// Lapak.AI — shared.js
// Common state schema + helpers used by BOTH admin.js (owner side)
// and store.js (public customer side). They talk to each other only
// through localStorage on this browser — there is no server.

const LAPAKAI_STORE_KEY = 'lapakai_state_v2';

function lapakaiDefaultState(){
  return {
    auth: { passcode: null },
    profile: { name:'', desc:'', phone:'', hours:'', tone:'ramah dan santai, sesekali pakai emoji' },
    products: [],
    faqs: [],
    ai: { key:'', model:'openai/gpt-oss-120b' },
    testHistory: [],
    msgCount: 0,
    updatedAt: null
  };
}

function lapakaiLoad(){
  try{
    const raw = localStorage.getItem(LAPAKAI_STORE_KEY);
    if(!raw) throw new Error('empty');
    const parsed = JSON.parse(raw);
    // shallow-merge with defaults so older/partial states don't crash new UI
    const def = lapakaiDefaultState();
    return {
      ...def,
      ...parsed,
      auth: { ...def.auth, ...(parsed.auth||{}) },
      profile: { ...def.profile, ...(parsed.profile||{}) },
      ai: { ...def.ai, ...(parsed.ai||{}) },
      products: Array.isArray(parsed.products) ? parsed.products : [],
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
      testHistory: Array.isArray(parsed.testHistory) ? parsed.testHistory : []
    };
  }catch(e){
    return lapakaiDefaultState();
  }
}

function lapakaiSave(state){
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(LAPAKAI_STORE_KEY, JSON.stringify(state));
}

function lapakaiUid(){
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function lapakaiEscapeHtml(str){
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function lapakaiRupiah(n){
  const num = Number(n) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
}

// Resize + compress an uploaded image file down to a reasonable size
// before it goes into localStorage (which has a hard ~5-10MB ceiling).
function lapakaiResizeImage(file, maxDim = 900, quality = 0.78){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        let { width, height } = img;
        if(width > maxDim || height > maxDim){
          if(width > height){
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Builds the system prompt sent to Groq — this is the single source of
// truth for what the AI "knows" about the shop. Both the admin's test
// chat and the real public storefront chat call this exact function,
// so a product added in the admin panel is instantly answerable by the
// AI on the storefront — no separate "publish" step.
function lapakaiBuildSystemPrompt(state){
  const p = state.profile;

  const productsText = state.products
    .filter(x => x.name)
    .map(x => {
      const bits = [`- ${x.name}`];
      if(x.price) bits.push(`harga ${lapakaiRupiah(x.price)}`);
      if(x.category) bits.push(`kategori ${x.category}`);
      if(x.stock === false) bits.push('STOK HABIS saat ini');
      let line = bits.join(', ');
      if(x.desc) line += `. ${x.desc}`;
      return line;
    })
    .join('\n');

  const faqText = state.faqs
    .filter(f => f.q || f.a)
    .map(f => `- T: ${f.q}\n  J: ${f.a}`)
    .join('\n');

  return [
    `Kamu adalah asisten chat resmi untuk toko "${p.name || '(nama toko belum diisi)'}".`,
    p.desc ? `Deskripsi toko: ${p.desc}` : null,
    p.hours ? `Jam operasional: ${p.hours}` : null,
    p.phone ? `Kontak WhatsApp toko: ${p.phone}` : null,
    `Gaya bahasa balasan: ${p.tone}.`,
    `Kamu sedang menjawab pelanggan ASLI di halaman toko, bukan pemilik toko. Jawab HANYA berdasarkan data produk & FAQ di bawah ini. Jangan mengarang harga, stok, atau info yang tidak ada di data. Kalau pelanggan menanyakan hal di luar data ini, jawab jujur bahwa kamu akan cek ke pemilik toko dulu, dan sarankan hubungi nomor WhatsApp toko kalau mendesak.`,
    productsText ? `Daftar produk:\n${productsText}` : `(Belum ada produk diinput oleh pemilik toko.)`,
    faqText ? `FAQ toko:\n${faqText}` : null
  ].filter(Boolean).join('\n\n');
}

// Shared "call Groq" used by both the admin test-chat tab and the
// public storefront widget so behavior stays identical everywhere.
async function lapakaiCallGroq(state, history){
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.ai.key}`
    },
    body: JSON.stringify({
      model: state.ai.model,
      messages: [
        { role:'system', content: lapakaiBuildSystemPrompt(state) },
        ...history.slice(-8)
      ],
      temperature: 0.6
    })
  });
  const data = await response.json();
  if(!response.ok){
    const msg = data?.error?.message || 'Terjadi kesalahan saat menghubungi Groq API.';
    throw new Error(msg);
  }
  return data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses itu.';
}
