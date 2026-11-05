import {invoke} from '@tauri-apps/api/core';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {t} from './i18n.js';
import {createGlassSurface} from '@bsl-world/desktop-core/glass';
import '@bsl-world/desktop-core/glass.css';
import {fitScaledWindow} from './scaled-window.js';

const app=document.querySelector('#app');
const appWindow=getCurrentWindow();
let surface;
const display=document.querySelector('#timer-display');
const inputs=document.querySelector('#duration-inputs');
const controls=document.querySelector('.timer-controls');
const sizeSelect=document.querySelector('#device-scale');
const deviceSizes={small:.70,normal:.85,large:1};
let deviceScale=1;
function sizeLabels(){
  const ru=document.documentElement.lang!=='en';
  const label=ru?'Масштаб прибора':'Device size';sizeSelect.title=label;sizeSelect.setAttribute('aria-label',label);
  [...sizeSelect.options].forEach((option,i)=>option.textContent=(ru?['Малый','Обычный','Крупный']:['Small','Normal','Large'])[i]);
}
function applyDeviceSize(value){
  const size=Object.hasOwn(deviceSizes,value)?value:'normal';deviceScale=deviceSizes[size];sizeSelect.value=size;
  document.documentElement.style.setProperty('--device-scale',deviceScale);
  localStorage.setItem('bsl-timer.glass-device-size',size);
  surface?.invalidate({interior:true});if(layout)void layout().then(scheduleGeometry);else scheduleGeometry();
}
sizeSelect.addEventListener('change',()=>applyDeviceSize(sizeSelect.value));
let layout=()=>{
  const request={};
  window.dispatchEvent(new CustomEvent('bsl-timer:glass-layout-request',{detail:request}));
  return request.result??fitScaledWindow(appWindow,{width:360,page:app,requireAllContent:true});
};
void import('./main.js').then(module=>{layout=module.setMainWindowLayout;void layout();scheduleGeometry();});
const adaptiveSelector='.app-title,.timer-tab:not(.is-running):not(.is-overdue) :is(.timer-tab-label,.timer-tab-close),.duration-field>span,.duration-separator,.control-button,.device-scale,.date-countdown-name,:is(#settings-btn,#date-countdowns-btn,#about-btn,#minimize-btn,#close-btn,#add-timer-btn)>span';
// A WebView tooltip is captured with the UI; native title popups sit behind the composition surface.
const eventButton=document.querySelector('#date-countdowns-btn');
const eventTooltip=document.createElement('div');
eventTooltip.className='device-tooltip';eventTooltip.id='device-events-tooltip';eventTooltip.role='tooltip';
app.append(eventTooltip);
let tooltipTimer;
function hideEventTooltip(){clearTimeout(tooltipTimer);app.style.removeProperty('--device-ink-clip');eventTooltip.classList.remove('is-visible');eventButton.title=t('toolbar.dateCountdowns');eventButton.removeAttribute('aria-describedby');}
function showEventTooltip(){
  if(document.documentElement.dataset.appearance!=='glass')return;
  eventButton.title='';eventButton.setAttribute('aria-describedby',eventTooltip.id);
  eventTooltip.textContent=t('toolbar.dateCountdowns');
  const button=eventButton.getBoundingClientRect(),body=app.getBoundingClientRect();
  eventTooltip.style.top=(button.bottom-body.top+5)+'px';
  eventTooltip.style.left=Math.max(8,Math.min(button.left-body.left,body.width-eventTooltip.offsetWidth-8))+'px';
  const x=eventTooltip.offsetLeft,y=eventTooltip.offsetTop,w=eventTooltip.offsetWidth,h=eventTooltip.offsetHeight;
  app.style.setProperty('--device-ink-clip',`polygon(evenodd,0px 0px,${body.width}px 0px,${body.width}px ${body.height}px,0px ${body.height}px,0px 0px,${x}px ${y}px,${x}px ${y+h}px,${x+w}px ${y+h}px,${x+w}px ${y}px,${x}px ${y}px,0px 0px)`);
  eventTooltip.classList.add('is-visible');
}
eventButton.addEventListener('pointerenter',()=>{if(document.documentElement.dataset.appearance!=='glass')return;eventButton.title='';clearTimeout(tooltipTimer);tooltipTimer=setTimeout(showEventTooltip,400);});
eventButton.addEventListener('pointerleave',hideEventTooltip);
eventButton.addEventListener('focus',showEventTooltip);
eventButton.addEventListener('blur',hideEventTooltip);
eventButton.addEventListener('pointerdown',hideEventTooltip);
window.addEventListener('blur',hideEventTooltip);
window.addEventListener('resize',hideEventTooltip);
app.addEventListener('keydown',event=>{if(event.key==='Escape')hideEventTooltip();});
new MutationObserver(()=>{eventTooltip.textContent=t('toolbar.dateCountdowns');}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
function svgLayer(width,height){
  const bounds=element=>Object.fromEntries(['x','y','width','height','top','bottom','left','right'].map(key=>[key,element.getBoundingClientRect()[key]/deviceScale]));
  const rect=bounds(display);const field=bounds(inputs);
  const body=bounds(app);
  const minutes=bounds(inputs.querySelectorAll('input')[1]);
  const cx=minutes.x+minutes.width*.5;
  // Packages sit behind the readout, with only their lower edges exposed.
  const cy=rect.bottom-10;
  const left=body.x+26,right=body.right-26,top=rect.top+14,bottom=body.bottom-18;
  const chipW=42,chipH=32;
  // All routes terminate at these same exposed package pins.
  const pinY=i=>cy-11+i*4.5;
  let pins='';for(let i=0;i<6;i++)pins+=`<path d="M ${cx-28} ${pinY(i)} H ${cx-21}"/>`;
  const rightPinY=pinY;
  for(let i=0;i<6;i++)pins+=`<path d="M ${cx+21} ${rightPinY(i)} H ${cx+28}"/>`;
  const ribbonX=rect.right-44;
  let ribbon='';
  for(let i=0;i<8;i++){
    const offset=(i-3.5)*2.4;
    pins+=`<path d="M ${cx+offset} ${cy-24} V ${cy-16}"/>`;
    ribbon+=`<path d="M ${ribbonX+offset} ${rect.bottom-4} V ${cy-37} Q ${ribbonX+offset} ${cy-25} ${cx+offset} ${cy-24}"/>`;
  }
  let wires='';
  const keys=[...controls.querySelectorAll('button')].filter(button=>!button.hidden).sort((a,b)=>a.getBoundingClientRect().x-b.getBoundingClientRect().x);
  keys.forEach((button,i)=>{
    const r=bounds(button),x=r.x+r.width*.5,y=r.y+8;
    for(let pair=0;pair<2;pair++){
      const terminal=x+(pair?4:-4),offset=(pair-.5)*2.4,forkX=cx+44;
      const cableY=(rightPinY(i*2)+rightPinY(i*2+1))*.5,laneX=right-10-i*8+offset;
      wires+=`<path d="M ${cx+28} ${rightPinY(i*2+pair)} L ${forkX} ${cableY+offset} H ${laneX} V ${field.bottom+5+i*6+offset} H ${x+offset} V ${y-9} L ${terminal} ${y}" stroke="${pair?'#c2d1d6':'#668b9a'}"/><circle cx="${terminal}" cy="${y}" r="2.2" fill="#b6c2b8" stroke="#40565c"/>`;
    }
  });
  // A separate pair feeds each input module from the lower package edge.
  [...inputs.querySelectorAll('input')].forEach((input,i)=>{
    const r=bounds(input),x=r.x+r.width*.5,y=r.y+3;
    for(let pair=0;pair<2;pair++){
      const sourceX=cx-12+i*10+pair*3,terminal=x+(pair?3:-3);
      pins+=`<path d="M ${sourceX} ${cy+16} V ${cy+23}"/>`;
      wires+=`<path d="M ${sourceX} ${cy+23} V ${cy+29+i*4+pair*2} H ${terminal} V ${y}" stroke="${pair?'#a7b8bd':'#698792'}"/><circle cx="${terminal}" cy="${y}" r="1.5" fill="#b6c2b8"/>`;
    }
  });
  const capX=cx-125,capY=cy-1;
  let capacitors='',traces='';
  for(let i=0;i<3;i++){
    const x=capX+i*23,y=capY+i*3;
    for(let contact=0;contact<2;contact++){
      const pin=i*2+contact,leadX=x+(contact?4:-4),laneX=cx-48+pin*3;
      traces+=`<path d="M ${leadX} ${y+12} V ${cy+21+pin*3} H ${laneX} V ${pinY(pin)} H ${cx-28}"/>`;
    }
    capacitors+=`<g transform="translate(${x} ${y})"><rect x="-7" y="-10" width="14" height="23" rx="4" fill="url(#capacitor)" stroke="#78929b"/><ellipse cy="-8" rx="6" ry="3" fill="#bac9c9"/><path d="M -3 -8 H 3 M 0 -10 V -6" stroke="#62797d"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="board" x2=".7" y2="1"><stop stop-color="#a9c9c1" stop-opacity=".22"/><stop offset=".6" stop-color="#396e68" stop-opacity=".12"/><stop offset="1" stop-color="#9fbeb5" stop-opacity=".25"/></linearGradient>
    <linearGradient id="package" x2=".8" y2="1"><stop stop-color="#596d72"/><stop offset=".45" stop-color="#34474d"/><stop offset="1" stop-color="#203139"/></linearGradient>
    <linearGradient id="capacitor"><stop stop-color="#273f4a"/><stop offset=".3" stop-color="#839ca5"/><stop offset=".58" stop-color="#55717d"/><stop offset="1" stop-color="#263e49"/></linearGradient>
    <mask id="display-occlusion" maskUnits="userSpaceOnUse" x="0" y="0" width="${width/deviceScale}" height="${height/deviceScale}">
      <rect width="${width/deviceScale}" height="${height/deviceScale}" fill="white"/>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="4" fill="black"/>
    </mask>
  </defs><g transform="scale(${deviceScale})" mask="url(#display-occlusion)">
  <rect x="${left+2}" y="${top+4}" width="${right-left}" height="${bottom-top}" rx="10" fill="#183a3d" opacity=".10"/>
  <rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" rx="10" fill="url(#board)" stroke="#90b5ac" stroke-opacity=".36"/>
  <g fill="none" stroke="#b9a46e" stroke-opacity=".8" stroke-width="1.1">${traces}</g>
  <g fill="#193a3e" stroke="#b2c7c0" stroke-width="1.2" opacity=".65"><circle cx="${left+10}" cy="${top+10}" r="3"/><circle cx="${right-10}" cy="${top+10}" r="3"/><circle cx="${left+10}" cy="${bottom-10}" r="3"/><circle cx="${right-10}" cy="${bottom-10}" r="3"/></g>
  <path d="M ${ribbonX} ${rect.bottom-5} V ${cy-36} Q ${ribbonX} ${cy-25} ${cx} ${cy-24} V ${cy-16}" stroke="#c1a66a" stroke-opacity=".25" stroke-width="24" fill="none"/>
  <g fill="none" stroke="#c8b98d" stroke-opacity=".8" stroke-width="1.3">${ribbon}</g>
  <rect x="${ribbonX-13}" y="${rect.bottom-3}" width="26" height="5" rx="1" fill="#41535a"/>
  <g stroke-width="1.2" fill="none" opacity=".8">${wires}</g>
  <g stroke="#b9c2b5" stroke-width="2.2">${pins}</g>
  <rect x="${cx-chipW*.5+1}" y="${cy-chipH*.5+4}" width="${chipW}" height="${chipH}" rx="3" fill="#152930" opacity=".52"/>
  <rect x="${cx-chipW*.5}" y="${cy-chipH*.5}" width="${chipW}" height="${chipH}" rx="3" fill="url(#package)" stroke="#9db2b5" stroke-opacity=".5"/>
  <circle cx="${cx-14}" cy="${cy-10}" r="1.6" fill="#bdccc9"/>
  <path d="M ${cx-10} ${cy+5} H ${cx+10} M ${cx-10} ${cy+9} H ${cx+4}" stroke="#a7b9b9" stroke-width="1" opacity=".5"/>
  ${capacitors}</g></svg>`;
}

function scheduleGeometry(){surface?.invalidate();}
const mechanicalSelector='.control-button,.titlebar-button,.add-timer-button,.tab-scroll-button,.date-countdown-scroll-button,.add-date-countdown-button,.date-countdown-ribbon-toggle';
surface=createGlassSurface({
 host:app,
 native:{
  configure:geometry=>invoke('set_glass_optics',geometry),
  captureUi:(layer,session)=>invoke('capture_glass_device_ui',{layer,session}),
  setInterior:(png,session)=>invoke('set_glass_device_internal',{png,session}),
  setVisible:(visible,session)=>invoke('set_glass_device_visible',{visible,session}),
  release:session=>invoke('release_glass_device',{session})
 },
 ink:{selector:adaptiveSelector,engravedSelector:'.app-title,.duration-field>span',frameSelector:'.about-titlebar-icon',excludeSelector:'.device-tooltip,#timer-display,#timer-status,input,img,svg,canvas',tint:'var(--device-key)',passAttribute:'data-device-text-pass',clipProperty:'--device-ink-clip',getPaletteSignature:()=>getComputedStyle(app).getPropertyValue('--device-key-rgb')},
 roles:{mechanical:mechanicalSelector,lcd:'.duration-field input','lcd-frame':'.duration-field','display-frame':'.device-display-module'},
 getGeometry:()=>{
  const r=app.getBoundingClientRect();
  const buttonRects=[...controls.querySelectorAll('button')].filter(button=>!button.hidden).map(button=>{const b=button.getBoundingClientRect();return [b.x,b.y,b.width,b.height];}).filter(b=>b[2]>0&&b[3]>0).slice(0,3);
  const density=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bsl-glass-density'))||1;
  const surfaceTint=getComputedStyle(app).getPropertyValue('--device-key-rgb').trim().split(/\s+/).map(value=>Number(value)/255);
  return {x:r.x,y:r.y,width:r.width,height:r.height,radius:25*deviceScale,depth:12*deviceScale,enabled:true,rounded:true,viewportWidth:innerWidth,density,buttonRects,surfaceTint};
 },
 getInterior:()=>svgLayer(innerWidth,innerHeight),getPressTravel:()=>3*deviceScale,
 onMaterialChange:hideEventTooltip,onFontChange:()=>{if(layout)void layout();},
 onState:(type,data)=>{
  if(type==='geometry'){app.dataset.deviceHwnd=String(data.hwnd);app.dataset.deviceSession=String(data.session);}
  if(type==='capture')app.dataset.deviceCaptureSize=data.width+'x'+data.height;
  if(type==='ready'||type==='pending')app.dataset.deviceUi=type;
  if(type==='press'){app.dataset.devicePressLatency=data.milliseconds.toFixed(1);app.dataset.devicePressState=data.state;}
 }
});
window.addEventListener('beforeunload',()=>{void surface.dispose();});

// The main controller drives the display and tab lamps from one shared phase.

new MutationObserver(sizeLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
sizeLabels();applyDeviceSize(localStorage.getItem('bsl-timer.glass-device-size'));
document.fonts.ready.then(scheduleGeometry);
