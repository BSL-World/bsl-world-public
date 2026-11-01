import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const copy = {
  ru: {title:'BSL-Timer · стекло',hint:'Перетащи окно поверх текста или изображения',enabled:'Преломление включено',disabled:'Преломление выключено',depth:'Толщина',rounded:'Округлый профиль',bevel:'Фаска',ready:'Живой фон Windows · эксперимент',error:'Не удалось включить оптику',close:'Закрыть',profile:'Профиль стекла',glass:'Прозрачный стеклянный элемент'},
  en: {title:'BSL-Timer · glass',hint:'Drag the window over text or an image',enabled:'Refraction on',disabled:'Refraction off',depth:'Thickness',rounded:'Rounded profile',bevel:'Bevel',ready:'Live Windows backdrop · experiment',error:'Could not enable optics',close:'Close',profile:'Glass profile',glass:'Transparent glass element'}
};
let locale = localStorage.getItem('bsl-timer.locale') === 'en' ? 'en' : 'ru';
let enabled = true;
let pending = Promise.resolve();
const glass = document.querySelector('#glass');
const toggle = document.querySelector('#toggle');
const depth = document.querySelector('#depth');
const profile = document.querySelector('#profile');
const status = document.querySelector('#status');

function translate() {
  document.documentElement.lang = locale;
  for (const node of document.querySelectorAll('[data-copy]')) node.textContent = copy[locale][node.dataset.copy];
  toggle.textContent = copy[locale][enabled ? 'enabled' : 'disabled'];
  document.querySelector('#language').textContent = locale === 'ru' ? 'EN' : 'RU';
  document.querySelector('#close').setAttribute('aria-label',copy[locale].close);
  profile.setAttribute('aria-label',copy[locale].profile);
  glass.setAttribute('aria-label',copy[locale].glass);
  status.textContent = copy[locale].ready;
}

export function updateOptics() {
  document.body.dataset.profile = profile.value;
  glass.style.setProperty('--glass-side-height',`${Number(depth.value)*1.8}px`);
  const rect = glass.getBoundingClientRect();
  const args = {x:rect.x,y:rect.y,width:rect.width,height:rect.height,radius:profile.value==='rounded'?25:14,depth:Number(depth.value),enabled,rounded:profile.value==='rounded',viewportWidth:innerWidth};
  pending = pending.catch(()=>{}).then(async()=>{
    try {
      const diagnostic = await invoke('set_glass_optics',args);
      glass.dataset.optics = 'ready';
      status.textContent = copy[locale].ready;
      return diagnostic;
    } catch(error) {
      glass.dataset.optics = 'error';
      status.textContent = `${copy[locale].error}: ${error}`;
      throw error;
    }
  });
  // Retain a handled rejection for event handlers while allowing QA callers to await it.
  pending.catch(error=>console.error(error));
  return pending;
}
document.querySelector('#language').addEventListener('click',()=>{locale=locale==='ru'?'en':'ru';translate();});
document.querySelector('#close').addEventListener('click',()=>getCurrentWindow().close());
toggle.addEventListener('click',()=>{enabled=!enabled;toggle.setAttribute('aria-pressed',String(enabled));translate();updateOptics();});
depth.addEventListener('input',()=>{document.querySelector('#depth-value').value=depth.value;updateOptics();});
profile.addEventListener('change',updateOptics);
new ResizeObserver(()=>updateOptics()).observe(glass);
window.addEventListener('resize',()=>updateOptics());
translate();
await updateOptics();
