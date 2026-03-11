
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
  document.getElementById('assign').disabled = true;
  await loadTransports();
  await loadTrackers();
  document.getElementById('assign').disabled = false;
  document.getElementById('saveTLabel').disabled = false;
  document.getElementById('saveULabel').disabled = false;
  loadDriverList();
}
async function loadTransports(){
  const sel = document.getElementById('tselect'); sel.innerHTML = '';
  const r = await fetch('/api/transports/public');
  transportsCache = r.ok ? await r.json() : [];
  transportsCache.forEach(t=>{ const opt=document.createElement('option'); opt.value=t.id; opt.textContent=`${t.id} — ${t.name}`; sel.appendChild(opt); });
  sel.removeEventListener('change', prefillTLabel); sel.addEventListener('change', prefillTLabel);
  prefillTLabel();
}
async function loadTrackers(){
  const sel = document.getElementById('uselect'); sel.innerHTML = '';
  const r = await fetch('/api/users?role=tracker', { headers:{ 'Authorization': `Bearer ${atoken}` } });
  trackersCache = r.ok ? await r.json() : [];
  trackersCache.forEach(u=>{ const opt=document.createElement('option'); opt.value=u.id; opt.textContent=`${u.email} (asig: ${u.transportId||'-'})`; sel.appendChild(opt); });
  document.getElementById('tselect').removeEventListener('change', preselectNumericDriver); document.getElementById('tselect').addEventListener('change', preselectNumericDriver);
  sel.removeEventListener('change', prefillULabel); sel.addEventListener('change', prefillULabel);
  prefillULabel();
}
function preselectNumericDriver(){
  const t = document.getElementById('tselect').value; const n = Number((t||'').replace('t',''));
  const expectedEmail = `driver${n}@demo.com`;
  const uselect = document.getElementById('uselect');
  for (const opt of uselect.options) { if (opt.textContent.startsWith(expectedEmail)) { uselect.value = opt.value; break; } }
  prefillULabel(); prefillTLabel();
}
function prefillTLabel(){ const t = document.getElementById('tselect').value; const found = transportsCache.find(x=>x.id===t); document.getElementById('tlabel').value = (found?.label || ''); }
function prefillULabel(){ const uid = document.getElementById('uselect').value; const found = trackersCache.find(x=>x.id===uid); document.getElementById('ulabel').value = (found?.displayName || ''); }

async function saveTransportLabel(){
  const t = document.getElementById('tselect').value; const label = document.getElementById('tlabel').value;
  const r = await fetch(`/api/transports/${encodeURIComponent(t)}/label`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${atoken}` }, body: JSON.stringify({ label }) });
  document.getElementById('asmsg').textContent = r.ok ? 'Alias de transporte guardado ✔️' : 'Error guardando alias';
  await loadTransports();
}
async function saveUserLabel(){
  const uid = document.getElementById('uselect').value; const displayName = document.getElementById('ulabel').value;
  const r = await fetch(`/api/users/${encodeURIComponent(uid)}/label`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${atoken}` }, body: JSON.stringify({ displayName }) });
  document.getElementById('asmsg').textContent = r.ok ? 'Alias de conductor guardado ✔️' : 'Error guardando alias';
  await loadTrackers();
}
async function assign(){
  const t = document.getElementById('tselect').value; const u = document.getElementById('uselect').value;
  const r = await fetch(`/api/transports/${encodeURIComponent(t)}/assign/${encodeURIComponent(u)}`, { method:'POST', headers:{ 'Authorization': `Bearer ${atoken}` }});
  const data = await r.json();
  document.getElementById('asmsg').textContent = r.ok ? 'Asignado ✔️' : (data.error || 'Error');
  if(r.ok) loadTrackers();
}
function loadDriverList(){
  const ul = document.getElementById('driversList'); ul.innerHTML = '';
  for(let i=1;i<=20;i++){ const li=document.createElement('li'); li.textContent=`driver${i}@demo.com / driver123 → T${i}`; ul.appendChild(li); }
}

document.getElementById('alogin').onclick = adminLogin;
document.getElementById('assign').onclick = assign;
document.getElementById('saveTLabel').onclick = saveTransportLabel;
document.getElementById('saveULabel').onclick = saveUserLabel;
