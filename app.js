const DB_NAME = 'sticker-studio-v1';
const STORE = 'stickers';
let db;
let selectedFile = null;
let selectedSource = 'instagram';
const otherApp = app => app === 'instagram' ? 'whatsapp' : 'instagram';
const appName = app => app === 'instagram' ? 'Instagram' : 'WhatsApp';
let stickers = [];
let activeFilter = 'all';
let pendingUrl = null;
const fileInput = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
const convertBtn = document.querySelector('#convert-btn');
const toast = document.querySelector('#toast');

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function dbRequest(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const getAll = () => dbRequest('readonly', store => store.getAll());
const saveSticker = sticker => dbRequest('readwrite', store => store.put(sticker));
const deleteSticker = id => dbRequest('readwrite', store => store.delete(id));

function humanSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function chooseFile(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) return showToast('That file is over the 20 MB limit.');
  if (!file.type.startsWith('image/') && !/\.(webp|tgs)$/i.test(file.name)) return showToast('Choose an image or sticker file.');
  selectedFile = file;
  document.querySelector('#file-name').textContent = file.name;
  document.querySelector('#file-size').textContent = humanSize(file.size);
  document.querySelector('#selected-file').hidden = false;
  document.querySelector('#conversion-result').hidden = true;
  convertBtn.disabled = false;
  dropZone.classList.add('has-file');
}
function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  document.querySelector('#selected-file').hidden = true;
  document.querySelector('#conversion-result').hidden = true;
  convertBtn.disabled = true;
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingUrl = null;
}
function render() {
  const grid = document.querySelector('#sticker-grid');
  const search = document.querySelector('#search-input').value.trim().toLowerCase();
  const filtered = stickers.filter(item => (activeFilter === 'all' || item.target === activeFilter) && item.name.toLowerCase().includes(search));
  grid.innerHTML = '';
  document.querySelector('#recent-total').textContent = stickers.length;
  document.querySelector('#nav-count').textContent = stickers.length;
  document.querySelector('#empty-state').hidden = stickers.length > 0;
  document.querySelector('#no-results').hidden = stickers.length === 0 || filtered.length > 0;
  for (const item of filtered.sort((a,b) => b.createdAt - a.createdAt)) {
    const card = document.createElement('article'); card.className = 'sticker-card';
    const img = document.createElement('img'); img.className = 'sticker-image'; img.src = URL.createObjectURL(item.blob); img.alt = item.name;
    img.onload = () => URL.revokeObjectURL(img.src);
    const wrap = document.createElement('div'); wrap.className = 'sticker-image-wrap';
    const badge = document.createElement('span'); badge.className = `sticker-platform ${item.target}`; badge.textContent = item.target === 'instagram' ? '◎' : '◔'; badge.title = `Ready for ${item.target}`;
    const menu = document.createElement('button'); menu.className='card-menu'; menu.textContent='···'; menu.setAttribute('aria-label', `Options for ${item.name}`);
    menu.addEventListener('click', async () => { if (confirm(`Remove “${item.name}” from your recents?`)) { await deleteSticker(item.id); await refresh(); showToast('Sticker removed from recents.'); } });
    wrap.append(img,badge,menu);
    const info=document.createElement('div');info.className='sticker-info';
    const name=document.createElement('div');name.className='sticker-name';name.textContent=item.name;
    const meta=document.createElement('div');meta.className='sticker-meta';meta.textContent=`${appName(item.source)} → ${appName(item.target)}`;
    info.append(name,meta);card.append(wrap,info);grid.append(card);
  }
}
async function refresh() { stickers = await getAll(); render(); }

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This sticker format could not be opened by your browser.')); };
    image.src = url;
  });
}
async function convert() {
  if (!selectedFile) return;
  convertBtn.disabled = true; convertBtn.querySelector('span').textContent = 'Preparing…';
  try {
    const image = await loadImage(selectedFile);
    const canvas = document.createElement('canvas');
    const target = otherApp(selectedSource);
    const max = target === 'instagram' ? 1080 : 512;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const outputType = target === 'instagram' ? 'image/png' : 'image/webp';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, outputType, .92));
    if (!blob) throw new Error('Could not create the converted sticker. Try a PNG or JPG image.');
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g,' ').trim() || 'My sticker';
    const ext = target === 'instagram' ? 'png' : 'webp';
    const item = { id: crypto.randomUUID(), name: `${baseName}.${ext}`, blob, source: selectedSource, target, outputType: ext, createdAt: Date.now() };
    await saveSticker(item); await refresh();
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingUrl = URL.createObjectURL(blob);
    const box = document.querySelector('#conversion-result'); box.hidden = false; box.innerHTML = '';
    const preview = document.createElement('img'); preview.className='result-preview'; preview.src=pendingUrl; preview.alt='Converted sticker preview';
    const copy=document.createElement('div');copy.className='result-copy';
    const title=document.createElement('strong');title.textContent='Your sticker is ready';
    const desc=document.createElement('p');desc.textContent=`Saved in Recents · ${appName(target)} still needs its own add or share step.`;
    copy.append(title,desc);
    const download=document.createElement('a');download.className='download-button';download.href=pendingUrl;download.download=item.name;download.textContent='Save sticker ↗';
    box.append(preview,copy,download);showToast('Copy prepared and saved to Recents.');
  } catch (error) {
    showToast(error.message || 'Could not convert that sticker.');
  } finally {
    convertBtn.disabled = !selectedFile; convertBtn.querySelector('span').textContent='Prepare handoff';
  }
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', event => chooseFile(event.target.files[0]));
document.querySelector('#remove-file').addEventListener('click', clearFile);
document.querySelector('#empty-upload').addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', event => { event.preventDefault(); dropZone.classList.remove('dragging'); chooseFile(event.dataTransfer.files[0]); });
document.querySelectorAll('.platform').forEach(button => button.addEventListener('click', () => {
  selectedSource = button.dataset.source;
  document.querySelectorAll('.platform').forEach(item => item.classList.toggle('selected', item === button));
  document.querySelector('#destination-name').textContent = `${selectedSource === 'instagram' ? '◔' : '◎'} ${appName(otherApp(selectedSource))}`;
}));
convertBtn.addEventListener('click', convert);
document.querySelector('#search-input').addEventListener('input', render);
document.querySelector('#filter-button').addEventListener('click', () => {
  activeFilter = activeFilter === 'all' ? 'instagram' : activeFilter === 'instagram' ? 'whatsapp' : 'all';
  const label = activeFilter === 'all' ? 'All stickers' : activeFilter === 'instagram' ? 'Instagram' : 'WhatsApp';
  document.querySelector('#filter-button').innerHTML = `<span>☷</span> ${label} <span class="chevron">⌄</span>`;
  render();
});

openDb().then(async database => { db=database; await refresh(); }).catch(() => { document.querySelector('#empty-state').hidden=false; showToast('Local sticker storage is unavailable in this browser.'); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const installButton = document.querySelector('#install-button');
let installPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!isStandalone && isIos) {
  installButton.hidden = false;
  installButton.innerHTML = 'Add to Home Screen <span>↗</span>';
  installButton.addEventListener('click', () => showToast('In Safari, tap Share, then Add to Home Screen.'));
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; showToast('Sticker Bridge is installed.'); });
