'use strict';

const $ = id => document.getElementById(id);
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Navegación y música funcionan también si no se puede cargar el JSON.
function closeMenu() {
  $('nav-links').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
}
$('menu-toggle').addEventListener('click', () => {
  const open = $('nav-links').classList.toggle('open');
  $('menu-toggle').setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => {
    if (document.hidden) return;
    const heart = element('div', 'heart', ['💗', '💕', '💖', '💞'][Math.floor(Math.random() * 4)]);
    heart.style.left = Math.random() * 100 + 'vw';
    const duration = 6 + Math.random() * 6;
    heart.style.animationDuration = duration + 's';
    $('hearts-container').appendChild(heart);
    setTimeout(() => heart.remove(), duration * 1000);
  }, 800);
}

