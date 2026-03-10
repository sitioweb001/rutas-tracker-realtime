(function () {
  // === Ajustes ===
  const REFRESH_MS = 3000; // 2000 (2s) | 3000 (3s) | 5000 (5s)
  const DEFAULT_CENTER = [13.6929, -89.2182]; // San Salvador

  // === Inyectar CSS de la barra si no existe ===
  function ensureStatusBarStyles() {
    if (document.getElementById('liveStatusStyles')) return;
    const css = `
#liveStatusBar{
  position: fixed;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(27,29,54,.92);
  color: #e5e7eb;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  z-index: 9999;
  backdrop-filter: blur(4px);
}
#liveStatusDot{
  width: 10px; height: 10px; border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(0,0,0,.25) inset;
}
#liveStatusText{ user-select: none; }
.status-online  #liveStatusDot{ background:#16a34a; } /* verde */
.status-offline #liveStatusDot{ background:#ef4444; } /* rojo  */
`;
    const style = document.createElement('style');
    style.id = 'liveStatusStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // === Crear barra si no existe ===
  function ensureStatusBar() {
    let bar = document.getElementById('liveStatusBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'liveStatusBar';
      bar.className = 'status-offline';
      bar.innerHTML = `
        <div id="liveStatusDot"></div>
        <div id="liveStatusText">🔴 Detenido</div>
      `;
      document.body.appendChild(bar);
    }
    return bar;
  }

  ensureStatusBarStyles();
  const bar = ensureStatusBar();
  const barText = document.getElementById('liveStatusText');

  function setOnlineUI(isOnline) {
    if (!bar || !barText) return;
    if (isOnline) {
      bar.classList.add('status-online');
      bar.classList.remove('status
