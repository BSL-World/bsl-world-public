// Decorative construction only. Timer state and accessible content stay in main.js.
const panel = document.querySelector('.timer-panel');
const display = document.querySelector('.timer-display');
const controls = document.querySelector('.timer-controls');
const ns = 'http://www.w3.org/2000/svg';
const board = document.createElementNS(ns, 'svg');
board.classList.add('glass-electronics');
board.style.display = 'none';
board.setAttribute('aria-hidden', 'true');
board.setAttribute('focusable', 'false');
panel.prepend(board);

function drawConstruction() {
  if (document.documentElement.dataset.appearance !== 'glass') return;
  const bounds = board.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const w = board.clientWidth;
  const h = board.clientHeight;
  const module = display.getBoundingClientRect();
  const chipX = w - 37;
  const chipY = Math.min(h - 40, module.bottom - bounds.top + 27);
  board.setAttribute('viewBox', `0 0 ${w} ${h}`);
  let traces = '';
  for (let i = 0; i < 5; i++) {
    const y = 23 + i * 5;
    traces += `<path d="M 14 ${y} H ${24 + i * 9} L ${42 + i * 9} ${y + 18} H ${chipX - 26 + i * 3} V ${chipY - 18}"/>`;
  }
  let ribbon = '';
  for (let i = 0; i < 7; i++) {
    const x = chipX - 9 + i * 3;
    ribbon += `<path d="M ${x - 17} ${module.bottom - bounds.top - 5} V ${chipY - 25} Q ${x - 17} ${chipY - 19} ${x} ${chipY - 18}"/>`;
  }
  let wires = '';
  for (const [i, button] of [...controls.querySelectorAll('button')].filter(b => !b.hidden).entries()) {
    const r = button.getBoundingClientRect();
    const x = r.left + r.width / 2 - bounds.left;
    const y = r.top - bounds.top + 6;
    wires += `<path d="M ${chipX - 8 + i * 5} ${chipY + 15} C ${chipX - 8 + i * 5} ${h - 12}, ${x} ${h - 12}, ${x} ${y}"/><circle cx="${x}" cy="${y}" r="2"/>`;
  }
  board.innerHTML = `<defs>
    <linearGradient id="pcb-material" x2="0.8" y2="1"><stop stop-color="#afd5cd" stop-opacity=".19"/><stop offset=".5" stop-color="#285a52" stop-opacity=".06"/><stop offset="1" stop-color="#9ebdb6" stop-opacity=".23"/></linearGradient>
    <linearGradient id="chip-material" x2="1" y2="1"><stop stop-color="#4e6167"/><stop offset="1" stop-color="#18262d"/></linearGradient>
    <radialGradient id="lens-field"><stop offset=".55" stop-color="#808080"/><stop offset="1" stop-color="#a56b80"/></radialGradient>
    <filter id="internal-refraction" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feImage href="#lens-map" result="lens"/>
      <feDisplacementMap in="SourceGraphic" in2="lens" scale="7" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <svg id="lens-map" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="url(#lens-field)"/></svg>
  </defs>
  <g filter="url(#internal-refraction)">
    <rect class="glass-pcb" x="10" y="12" width="${w - 20}" height="${h - 24}" rx="9" fill="url(#pcb-material)"/>
    <g class="glass-traces" fill="none">${traces}<path d="M 23 ${h - 24} V ${chipY + 22} H ${chipX - 21} V ${chipY + 8}"/></g>
    <g class="glass-ribbon" fill="none">${ribbon}</g>
    <g class="glass-wires" fill="none">${wires}</g>
    <g class="glass-chip" transform="translate(${chipX} ${chipY})">
      <path d="M -21 -10 H 21 M -21 -4 H 21 M -21 3 H 21 M -21 10 H 21" stroke="#bbc4bb" stroke-width="2"/>
      <rect x="-15" y="-16" width="30" height="32" rx="3" fill="url(#chip-material)" stroke="#a2b4b2" stroke-opacity=".5"/>
      <circle cx="-9" cy="-10" r="1.4" fill="#a2b4b2"/>
      <path d="M -8 6 H 8 M -8 9 H 3" stroke="#afc0c0" stroke-opacity=".5"/>
    </g>
    <g class="glass-capacitors" transform="translate(25 ${chipY})">
      <path d="M 0 6 V 18 H 15 M 14 7 V 23 H 25" fill="none" stroke="#a8b6af"/>
      <rect x="-5" y="-7" width="10" height="15" rx="3" fill="#526975" stroke="#b0bfc4"/>
      <ellipse cy="-6" rx="4" ry="2" fill="#b9c8c9"/><path d="M -2 -6 H 2" stroke="#5a6c70"/>
      <rect x="10" y="-3" width="8" height="12" rx="2" fill="#526975" stroke="#b0bfc4"/>
      <ellipse cx="14" cy="-2" rx="3" ry="1.5" fill="#b9c8c9"/>
    </g>
  </g>`;
}

let frame;
function scheduleConstruction() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(drawConstruction);
}
const resize = new ResizeObserver(scheduleConstruction);
for (const node of [panel, display, controls]) resize.observe(node);
new MutationObserver(scheduleConstruction).observe(controls, {subtree: true, attributes: true, attributeFilter: ['hidden']});
new MutationObserver(scheduleConstruction).observe(document.documentElement, {attributes: true, attributeFilter: ['data-appearance', 'data-font-size']});
document.fonts.ready.then(scheduleConstruction);
