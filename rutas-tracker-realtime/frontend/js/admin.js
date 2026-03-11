
let atoken = null;
let transportsCache = [];
let trackersCache = [];

async function adminLogin(){
  const email = document.getElementById('aemail').value.trim();
  const password = document.getElementById('apass').value;
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
  const data = await r.json();
  if(!r.ok){ document.getElementById('amsg').textContent = data.error || 'Error'; return; }
  if(data.user.role !== 'admin'){ document.getElementById('amsg').textContent = 'No eres admin'; return; }
  atoken = data.token; document.getElementById('amsg').textContent = 'OK ✔️';
  await loadTransports();
  await loadTrackers();
  // habilitar botones
  ['assignAll','editDrivers','resetLabels'].forEach(id=> document.getElementById(id).disabled=false);
  loadDriverList();
}

async function loadTransports(){
  const sel = document.getElementById('tselect'); sel.innerHTML = '';
  const r = await fetch('/api/transports/public');
  transportsCache = r.ok ? await r.json() : [];
  transportsCache.forEach(t=>{ const opt=document.createElement('option'); opt.value=t.id; opt.textContent=`${t.id} — ${t.name}`; sel.appendChild(opt); });
  sel.addEventListener('change', ()=>{ preselectNumericDriver(); prefillTLabel(); });
  prefillTLabel();
}

async function loadTrackers(){
  const sel = document.getElementById('uselect'); sel.innerHTML = '';
  const r = await fetch('/api/users?role=tracker', { headers:{ 'Authorization': `Bearer ${atoken}` } });
  trackersCache = r.ok ? await r.json() : [];
  trackersCache.forEach(u=>{ const opt=document.createElement('option'); opt.value=u.id; opt.textContent=`${u.email} (asig: ${u.transportId||'-'})`; sel.appendChild(opt); });
  sel.addEventListener('change', prefillULabel);
  preselectNumericDriver();
  prefillULabel();
}

function preselectNumericDriver(){
  const t = document.getElementById('tselect').value; const n = Number((t||'').replace('t',''));
  const expectedEmail = `driver${n}@demo.com`;
  const uselect = document.getElementById('uselect');
  for (const opt of uselect.options) { if (opt.textContent.startsWith(expectedEmail)) { uselect.value = opt.value; break; } }
}

function prefillTLabel(){
  // Opcional: podrías cargar /api/users/public/labels y mostrar el label actual aquí.
}

function prefillULabel(){
  const uid = document.getElementById('uselect').value;
  const found = trackersCache.find(x=>x.id===uid);
  document.getElementById('ulabel').value = (found?.displayName || '');
}

// ================== BOTÓN ÚNICO: Asignar (y guardar alias) ==================
async function assignAndSave(){
  const t = document.getElementById('tselect').value;
  const uid = document.getElementById('uselect').value;
  const tlabel = document.getElementById('tlabel').value; // puede ir vacío para limpiar
  const ulabel = document.getElementById('ulabel').value; // puede ir vacío para limpiar
  let ok = true; let msg = [];
  // 1) guardar alias transporte
  try{
    const rt = await fetch(`/api/transports/${encodeURIComponent(t)}/label`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${atoken}` }, body: JSON.stringify({ label: tlabel }) });
    if(!rt.ok) ok=false; else msg.push('Transporte ✓');
  }catch{ ok=false; }
  // 2) guardar alias conductor
  try{
    const ru = await fetch(`/api/users/${encodeURIComponent(uid)}/label`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${atoken}` }, body: JSON.stringify({ displayName: ulabel }) });
    if(!ru.ok) ok=false; else msg.push('Conductor ✓');
  }catch{ ok=false; }
  // 3) asignar tracker -> transporte
  try{
    const ra = await fetch(`/api/transports/${encodeURIComponent(t)}/assign/${encodeURIComponent(uid)}`, { method:'POST', headers:{ 'Authorization': `Bearer ${atoken}` }});
    const da = await ra.json();
    if(!ra.ok){ ok=false; msg.push(da.error||'Error asignando'); } else { msg.push('Asignado ✓'); }
  }catch{ ok=false; }

  document.getElementById('asmsg').textContent = ok ? msg.join(' | ') : ('Error: ' + msg.join(' | '));
  if(ok){ await loadTrackers(); }
}

// ================== Modal General: Editar nombres de conductores ==================
const backdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
function openModal(){ backdrop.style.display='flex'; renderDriversForm(); }
function closeModal(){ backdrop.style.display='none'; }

function renderDriversForm(){
  modalBody.innerHTML='';
  trackersCache.forEach(u=>{
    const wrap = document.createElement('div');
    wrap.className='card';
    wrap.style.padding='12px';
    wrap.innerHTML = `
      <div class="small"><b>${u.email}</b> → ${u.transportId||'-'}</div>
      <div class="label" style="margin-top:6px">Nombre visible</div>
      <input data-uid="${u.id}" value="${u.displayName||''}" placeholder="Ej: Juan Pérez" />
    `;
    modalBody.appendChild(wrap);
  });
}

async function saveAllDrivers(){
  const items = Array.from(modalBody.querySelectorAll('input[data-uid]')).map(inp=>({ userId: inp.getAttribute('data-uid'), displayName: inp.value }));
  const r = await fetch('/api/users/bulk-labels', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${atoken}` }, body: JSON.stringify({ items }) });
  const d = await r.json();
  document.getElementById('asmsg').textContent = r.ok ? `Alias de conductores guardados ( ${d.updated} ) ✔️` : (d.error||'Error');
  if(r.ok){ await loadTrackers(); closeModal(); }
}

async function resetAllDrivers(){
  const r = await fetch('/api/users/reset-labels/all', { method:'POST', headers:{ 'Authorization': `Bearer ${atoken}` } });
  const d = await r.json();
  document.getElementById('asmsg').textContent = r.ok ? `Alias de conductores eliminados ( ${d.updated} ) ✔️` : (d.error||'Error');
  if(r.ok){ await loadTrackers(); renderDriversForm(); }
}

async function resetTransportLabels(){
  const r = await fetch('/api/transports/reset-labels/all', { method:'POST', headers:{ 'Authorization': `Bearer ${atoken}` } });
  const d = await r.json();
  document.getElementById('asmsg').textContent = r.ok ? `Transportes restablecidos (${d.count}) a nombres por defecto ✔️` : (d.error||'Error');
}

function loadDriverList(){
  const ul = document.getElementById('driversList'); ul.innerHTML = '';
  for(let i=1;i<=20;i++){ const li=document.createElement('li'); li.textContent=`driver${i}@demo.com / driver123 → T${i}`; ul.appendChild(li); }
}

document.getElementById('alogin').onclick = adminLogin;
document.getElementById('assignAll').onclick = assignAndSave;
document.getElementById('editDrivers').onclick = openModal;
document.getElementById('resetLabels').onclick = resetTransportLabels;
document.getElementById('closeModal').onclick = closeModal;
document.getElementById('saveAllDrivers').onclick = saveAllDrivers;
document.getElementById('resetAllDrivers').onclick = resetAllDrivers;
