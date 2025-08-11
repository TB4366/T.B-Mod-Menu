// tbMod.js
// ES module version of the TB-Mod Agar-like demo.
// Usage:
//   import createTBMod from './tbMod.js';
//   const mod = createTBMod(document.getElementById('mount'), { initialBots: 6 });
//   mod.setUID('1234'); mod.start();

export default function createTBMod(mountEl, opts = {}) {
  // create container
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.position = 'relative';
  mountEl.appendChild(container);

  // create canvas
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.borderRadius = '8px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // simple UI (UID, start, stop, spawn, clear)
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.left = '12px';
  ui.style.top = '12px';
  ui.style.zIndex = '50';
  ui.style.display = 'flex';
  ui.style.flexDirection = 'column';
  ui.style.gap = '8px';
  container.appendChild(ui);

  function el(tag, props = {}) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    return e;
  }

  const uidInput = el('input', { placeholder: 'UID (zet eerst)', value: '' });
  uidInput.style.padding = '6px';
  const setBtn = el('button', { innerText: 'Set UID' });
  const startBtn = el('button', { innerText: 'Start' });
  const stopBtn = el('button', { innerText: 'Stop' });
  const spawnBtn = el('button', { innerText: 'Spawn Bots' });
  const clearBtn = el('button', { innerText: 'Clear Bots' });

  ui.append(uidInput, setBtn, startBtn, stopBtn, spawnBtn, clearBtn);

  // HUD
  const hud = el('div', { innerText: 'Bots: 0 — UID: —' });
  hud.style.marginTop = '6px';
  hud.style.padding = '6px';
  hud.style.background = 'rgba(0,0,0,0.25)';
  hud.style.borderRadius = '8px';
  hud.style.color = '#e6eef8';
  ui.appendChild(hud);

  // sizing
  function resize() {
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(300, Math.floor(rect.width - 0));
    canvas.height = Math.max(200, Math.floor(rect.height - 0));
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // world
  const player = { x: 100, y: 100, r: 22, color: '#26d07c' };
  let mouse = { x: player.x, y: player.y };

  const world = { bots: [], running: false, uid: null };

  function createBot(x, y, size) {
    return {
      id: Math.random().toString(36).slice(2,9),
      x: x ?? (Math.random() * canvas.width),
      y: y ?? (Math.random() * canvas.height),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      r: size ?? (10 + Math.random() * 18),
      color: '#' + (Math.floor(Math.random() * 0xffffff).toString(16).padStart(6,'0')),
      splitCooldown: 0
    };
  }

  const initial = Number(opts.initialBots ?? 6);
  for (let i=0;i<initial;i++) world.bots.push(createBot());

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  // UI events
  setBtn.addEventListener('click', ()=> {
    const val = uidInput.value.trim();
    if (!val) { alert('Voer een UID in.'); return; }
    world.uid = val;
    hud.innerText = `Bots: ${world.bots.length} — UID: ${world.uid}`;
    setBtn.innerText = 'UID gezet ✓';
    setTimeout(()=> setBtn.innerText = 'Set UID', 1000);
  });
  startBtn.addEventListener('click', ()=> { world.running = true; });
  stopBtn.addEventListener('click', ()=> { world.running = false; });
  spawnBtn.addEventListener('click', ()=> { for(let i=0;i<3;i++) world.bots.push(createBot()); hud.innerText = `Bots: ${world.bots.length} — UID: ${world.uid ?? '—'}`; });
  clearBtn.addEventListener('click', ()=> { world.bots = []; hud.innerText = `Bots: 0 — UID: ${world.uid ?? '—'}`; });

  // update/draw
  function update(dt) {
    // player move toward mouse
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    player.x += dx * Math.min(1, dt * 8);
    player.y += dy * Math.min(1, dt * 8);

    for (const b of world.bots) {
      b.vx += (Math.random()-0.5) * 0.06;
      b.vy += (Math.random()-0.5) * 0.06;

      if (world.uid && world.running) {
        const tx = player.x + (Math.random()-0.5) * 20;
        const ty = player.y + (Math.random()-0.5) * 20;
        const ddx = tx - b.x, ddy = ty - b.y;
        const dist = Math.hypot(ddx, ddy) + 0.0001;
        const accel = 0.06 * (b.r > 30 ? 0.5 : 1);
        b.vx += (ddx / dist) * accel;
        b.vy += (ddy / dist) * accel;
      }

      const speed = Math.hypot(b.vx, b.vy);
      const maxSpeed = 2.2;
      if (speed > maxSpeed) { b.vx = (b.vx / speed) * maxSpeed; b.vy = (b.vy / speed) * maxSpeed; }

      b.x += b.vx; b.y += b.vy;

      if (b.x < -50) b.x = canvas.width + 50; if (b.x > canvas.width + 50) b.x = -50;
      if (b.y < -50) b.y = canvas.height + 50; if (b.y > canvas.height + 50) b.y = -50;

      if (world.uid && world.running) {
        const d = Math.hypot(b.x - player.x, b.y - player.y);
        if (d < (player.r + b.r + 6) && b.splitCooldown <= 0 && b.r > 8) {
          const newSize = Math.max(6, b.r * 0.55);
          b.r = newSize;
          b.splitCooldown = 120;
          const angle = Math.atan2(player.y - b.y, player.x - b.x);
          const n = createBot(b.x + Math.cos(angle)*6, b.y + Math.sin(angle)*6, newSize);
          n.vx = Math.cos(angle) * 4.2;
          n.vy = Math.sin(angle) * 4.2;
          world.bots.push(n);
        }
      }

      if (b.splitCooldown > 0) b.splitCooldown -= 1;
    }

    // simple separation
    for (let i=0;i<world.bots.length;i++){
      for(let j=i+1;j<world.bots.length;j++){
        const a = world.bots[i], c = world.bots[j];
        const dx = c.x - a.x, dy = c.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = a.r + c.r + 2;
        if (dist < minDist){
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist, ny = dy / dist;
          a.x -= nx * overlap; a.y -= ny * overlap;
          c.x += nx * overlap; c.y += ny * overlap;
        }
      }
    }

    hud.innerText = `Bots: ${world.bots.length} — UID: ${world.uid ?? '—'}`;
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#061024';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for (const b of world.bots) {
      ctx.beginPath();
      ctx.fillStyle = b.color;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();

    // name label
    ctx.fillStyle = '#0b1220';
    ctx.font = 'bold 12px sans-serif';
    const name = 'T.B Mod';
    const tw = ctx.measureText(name).width;
    ctx.fillRect(player.x - tw/2 - 8, player.y - player.r - 26, tw+16, 18);
    ctx.fillStyle = '#e6eef8';
    ctx.fillText(name, player.x - tw/2, player.y - player.r - 14);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.06, (now - last)/1000);
    last = now;
    if (world.running) update(dt);
    draw();
    animationId = requestAnimationFrame(loop);
  }
  let animationId = requestAnimationFrame(loop);

  // expose API
  return {
    start() { world.running = true; },
    stop() { world.running = false; },
    setUID(v) { world.uid = v; hud.innerText = `Bots: ${world.bots.length} — UID: ${world.uid ?? '—'}`; },
    spawn(n = 3) { for(let i=0;i<n;i++) world.bots.push(createBot()); },
    clear() { world.bots = []; },
    getState() { return { bots: world.bots.length, uid: world.uid, running: world.running }; },
    destroy() {
      world.running = false;
      cancelAnimationFrame(animationId);
      ro.disconnect();
      mountEl.removeChild(container);
    }
  };
}
