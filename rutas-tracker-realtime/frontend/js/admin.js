
let atoken = null;

async function adminLogin(){
  const email = document.getElementById('aemail').value.trim();
  const password = document.getElementById('apass').value;
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
  const data = await r.json();
  if(!r.ok){ document.getElementById('amsg').textContent = data.error || 'Error'; return; }
  if(data.user.role !== 'admin'){ document.getElementById('amsg').textContent = 'No eres admin'; return; }
  atoken = data.token; document.getElementById('amsg').textContent = 'OK ✔️';
  document.getElementById('assign').disabled = false;
}

async function assign(){
  const t = document.getElementById('tselect').value;
  const u = document.getElementById('uselect').value;
  const r = await fetch(`/api/transports/${encodeURIComponent(t)}/assign/${encodeURIComponent(u)}`, {
    method:'POST', headers:{ 'Authorization': `Bearer ${atoken}` }
  });
  const data = await r.json();
  document.getElementById('asmsg').textContent = r.ok ? 'Asignado ✔️' : (data.error || 'Error');
}

document.getElementById('alogin').onclick = adminLogin;
document.getElementById('assign').onclick = assign;
