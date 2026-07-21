// Lapak.AI — landing page demo chat (scripted, no API key required)

const demoChat = document.getElementById('demoChat');
const demoInput = document.getElementById('demoInput');
const demoSend = document.getElementById('demoSend');

const SHOP_NAME = "Kedai Kopi Sumedang";
const SHOP_INITIAL = "K";

// Canned knowledge base used to fake a "smart" reply for common keywords
const DEMO_SCRIPT = [
  {
    match: ["robusta", "kopi"],
    reply: "Ada kak! Robusta Sumedang kita fresh roast tiap minggu, harga Rp32.000/200gr. Mau sekalian dikirim hari ini?"
  },
  {
    match: ["jam", "buka", "operasional"],
    reply: "Kedai buka tiap hari jam 07.00–21.00 WIB ya kak, kecuali tanggal merah tutup jam 17.00."
  },
  {
    match: ["ongkir", "kirim", "ongkos"],
    reply: "Ongkir menyesuaikan lokasi kak, tapi buat area Sumedang kota gratis ongkir min. belanja Rp50.000 ya!"
  },
  {
    match: ["harga", "berapa"],
    reply: "Untuk kopi bubuk mulai Rp28.000, kalau yang biji utuh mulai Rp35.000/200gr kak. Mau saya rekomendasiin sesuai selera?"
  }
];
const DEFAULT_REPLY = "Baik kak, dicatat ya! Kalau butuh info produk atau jam buka juga boleh tanya langsung ke saya 😊";

const seed = [
  { role:"bot", text:"Halo kak! Selamat datang di " + SHOP_NAME + ". Ada yang bisa saya bantu?" }
];

function renderLine({role, text}){
  const line = document.createElement('div');
  line.className = 'chat-line ' + (role === 'bot' ? 'bot' : 'me');
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = role === 'bot' ? SHOP_INITIAL : 'A';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  line.appendChild(avatar);
  line.appendChild(bubble);
  demoChat.appendChild(line);
  demoChat.scrollTop = demoChat.scrollHeight;
  return line;
}

function renderTyping(){
  const line = document.createElement('div');
  line.className = 'chat-line bot';
  line.id = 'typingLine';
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = SHOP_INITIAL;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  line.appendChild(avatar);
  line.appendChild(bubble);
  demoChat.appendChild(line);
  demoChat.scrollTop = demoChat.scrollHeight;
}

function removeTyping(){
  const t = document.getElementById('typingLine');
  if(t) t.remove();
}

function pickReply(userText){
  const lower = userText.toLowerCase();
  for(const item of DEMO_SCRIPT){
    if(item.match.some(kw => lower.includes(kw))) return item.reply;
  }
  return DEFAULT_REPLY;
}

function handleSend(){
  const text = demoInput.value.trim();
  if(!text) return;
  renderLine({role:'user', text});
  demoInput.value = '';
  renderTyping();
  const delay = 650 + Math.random() * 500;
  setTimeout(() => {
    removeTyping();
    renderLine({role:'bot', text: pickReply(text)});
  }, delay);
}

demoSend.addEventListener('click', handleSend);
demoInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') handleSend();
});

// seed initial message
seed.forEach(renderLine);
