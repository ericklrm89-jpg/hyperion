/**
 * HYPERION LIVE COUNTDOWN HUD & MANUS v3.5
 * Inyecta un HUD flotante de alta visibilidad con contador regresivo en vivo (MM:SS)
 * que se actualiza cada segundo directamente en el DOM del navegador.
 */

function generateLiveHudEngine(currentLeadName, nextLeadName, remainingSeconds, totalSent, totalLeads = 5000) {
  return `
  (() => {
    if (window.__HY_COUNTDOWN_TIMER) {
      clearInterval(window.__HY_COUNTDOWN_TIMER);
    }

    var existingHud = document.getElementById('hyperion-countdown-hud');
    if (existingHud) existingHud.remove();

    var hud = document.createElement('div');
    hud.id = 'hyperion-countdown-hud';
    hud.style.cssText = 'position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: rgba(15, 23, 42, 0.98); border: 2.5px solid #22c55e; border-radius: 12px; padding: 10px 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace; box-shadow: 0 10px 30px rgba(0,0,0,0.85); pointer-events: none; min-width: 620px; max-width: 90vw; text-align: center; backdrop-filter: blur(8px);';

    var secondsLeft = ${remainingSeconds};
    var currentLead = ${JSON.stringify(currentLeadName)};
    var nextLead = ${JSON.stringify(nextLeadName)};
    var totalSent = ${totalSent};

    function updateView() {
      var m = Math.floor(secondsLeft / 60);
      var s = secondsLeft % 60;
      var timeStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

      var percent = Math.max(0, Math.min(100, Math.round(((300 - secondsLeft) / 300) * 100)));

      hud.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:8px;">' +
        '<div style="font-weight:900; font-size:13px; color:#38bdf8; display:flex; align-items:center; gap:6px;">' +
          '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>' +
          'NANOAI B2B AUTONOMOUS DISPATCHER' +
        '</div>' +
        '<div style="font-size:11px; font-weight:800; color:#94a3b8; background:#1e293b; padding:2px 8px; border-radius:4px; border:1px solid #475569;">' +
          'TOTAL ENVIADOS: <strong style="color:#22c55e;">' + totalSent + '</strong> / ' + ${totalLeads} +
        '</div>' +
      '</div>' +
      '<div style="display:flex; align-items:center; justify-content:center; gap:20px; margin-bottom:8px;">' +
        '<div style="background:#022c22; border:1.5px solid #22c55e; border-radius:8px; padding:4px 16px; display:inline-block;">' +
          '<span style="font-size:11px; color:#86efac; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">⏱️ PRÓXIMO ENVÍO EN:</span> ' +
          '<span style="font-size:22px; font-weight:900; color:#22c55e; font-family:monospace; margin-left:6px; letter-spacing:1px;">' + timeStr + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:11px; text-align:left; background:#0f172a; padding:6px 10px; border-radius:6px; border:1px solid #1e293b; margin-bottom:8px;">' +
        '<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
          '<span style="color:#94a3b8; font-weight:700;">✅ ÚLTIMO PROCESADO:</span><br>' +
          '<strong style="color:#e2e8f0; font-size:11.5px;">' + currentLead + '</strong>' +
        '</div>' +
        '<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
          '<span style="color:#fbbf24; font-weight:700;">🎯 SIGUIENTE EN COLA:</span><br>' +
          '<strong style="color:#fde047; font-size:11.5px;">' + nextLead + '</strong>' +
        '</div>' +
      '</div>' +
      '<div style="width:100%; height:5px; background:#1e293b; border-radius:4px; overflow:hidden;">' +
        '<div style="width:' + percent + '%; height:100%; background:linear-gradient(90deg, #22c55e, #38bdf8); transition:width 1s linear;"></div>' +
      '</div>';

      if (secondsLeft > 0) {
        secondsLeft--;
      }
    }

    updateView();
    document.body.appendChild(hud);
    window.__HY_COUNTDOWN_TIMER = setInterval(updateView, 1000);
  })();
  `;
}

module.exports = { generateLiveHudEngine };
