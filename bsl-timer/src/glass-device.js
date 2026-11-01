import {invoke} from '@tauri-apps/api/core';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {t} from './i18n.js';
import {fitScaledWindow} from './scaled-window.js';

const app=document.querySelector('#app');
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
  lastInternal='';if(layout)void layout().then(scheduleGeometry);else scheduleGeometry();
}
sizeSelect.addEventListener('change',()=>applyDeviceSize(sizeSelect.value));
let layout=()=>{
  const request={};
  window.dispatchEvent(new CustomEvent('bsl-timer:glass-layout-request',{detail:request}));
  return request.result??fitScaledWindow(appWindow,{width:360,page:app,requireAllContent:true});
};
void import('./main.js').then(module=>{layout=module.setMainWindowLayout;void layout();scheduleGeometry();});
let geometryTimer,uiTimer,capturing=false,uiDirty=false,initialized=false,materialVersion=0;
let lastInternal='';
let lastTextMask='';
let lastGeometry=null,pressedButton=null;
const controlRect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
function pressParameters(){return {pressedRect:pressedButton?.isConnected&&!pressedButton.disabled?controlRect(pressedButton):null,pressedTravel:pressedButton&&!pressedButton.disabled?3*deviceScale:0};}
function showPress(button){
  pressedButton=button;if(!lastGeometry||document.documentElement.dataset.appearance!=='glass')return;
  const start=performance.now();
  void invoke('set_glass_optics',{...lastGeometry,...pressParameters()}).then(()=>{
    app.dataset.devicePressLatency=(performance.now()-start).toFixed(1);app.dataset.devicePressState=button?'down':'up';
  }).catch(error=>console.error('Glass native press:',error));
}
app.addEventListener('pointerdown',event=>{const button=event.target.closest('button');if(event.button===0&&button&&!button.disabled)showPress(button);},{capture:true,passive:true});
window.addEventListener('pointerup',()=>{if(pressedButton)showPress(null);},{capture:true,passive:true});
window.addEventListener('pointercancel',()=>{if(pressedButton)showPress(null);},{passive:true});
window.addEventListener('blur',()=>{if(pressedButton)showPress(null);});
app.addEventListener('keydown',event=>{const button=event.target.closest('button');if(!event.repeat&&['Space','Enter'].includes(event.code)&&button&&!button.disabled)showPress(button);},{capture:true});
app.addEventListener('keyup',event=>{if(['Space','Enter'].includes(event.code)&&pressedButton)showPress(null);},{capture:true});
const adaptiveSelector='.app-title,.timer-tab-label,.timer-tab-close,.duration-field>span,.duration-separator,.control-button,.device-scale,.date-countdown-name,:is(#settings-btn,#date-countdowns-btn,#about-btn,#minimize-btn,#close-btn,#add-timer-btn)>span';
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
const paintFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function captureAdaptiveUi(version){
  const signature=JSON.stringify([innerWidth,innerHeight,app.style.getPropertyValue('--device-ink-clip'),getComputedStyle(app).getPropertyValue('--device-key-rgb'),...[...app.querySelectorAll(adaptiveSelector)].map(element=>{
    const r=element.getBoundingClientRect(),s=getComputedStyle(element);
    return [element.textContent,element.value,element.hidden,element.matches(':disabled'),r.x,r.y,r.width,r.height,s.font,s.letterSpacing,s.opacity];
  })]);
  const updateMask=signature!==lastTextMask;
  try{
    document.documentElement.dataset.deviceTextPass='base';await paintFrame();
    if(version!==materialVersion||document.documentElement.dataset.appearance!=='glass')return false;
    const capture=await invoke('capture_glass_device_ui',{layer:updateMask?3:4});
    app.dataset.deviceCaptureSize=capture.width+'x'+capture.height;
    if(version!==materialVersion)return false;
    if(updateMask){
      document.documentElement.dataset.deviceTextPass='mask';await paintFrame();
      if(version!==materialVersion)return false;
      await invoke('capture_glass_device_ui',{layer:2});lastTextMask=signature;
    }
    return version===materialVersion;
  }finally{delete document.documentElement.dataset.deviceTextPass;}
}
const appWindow=getCurrentWindow();

function captureUi(){
  uiDirty=true;if(capturing)return;
  clearTimeout(uiTimer);uiTimer=setTimeout(async()=>{
    if(!initialized||document.documentElement.dataset.appearance!=='glass')return;
    capturing=true;uiDirty=false;
    const version=materialVersion;
    try{
      if(await captureAdaptiveUi(version)){
        await invoke('set_glass_device_visible',{visible:true});
        if(version===materialVersion)app.dataset.deviceUi='ready';
      }
    }
    catch(error){console.error('Glass UI composition:',error);}
    finally{capturing=false;if(uiDirty)captureUi();}
  },0);
}

function svgLayer(width,height){
  const bounds=element=>Object.fromEntries(['x','y','width','height','top','bottom','left','right'].map(key=>[key,element.getBoundingClientRect()[key]/deviceScale]));
  const rect=bounds(display);const field=bounds(inputs);
  const body=bounds(app);
  const minutes=bounds(inputs.querySelectorAll('input')[1]);
  const cx=minutes.x+minutes.width*.5;
  const labelTop=bounds(inputs.querySelector('.duration-field')).top;
  const freeHeight=Math.max(40,labelTop-rect.bottom);
  const cy=rect.bottom+freeHeight*.48;
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
  const capX=cx-125,capY=cy-6;
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
  </defs><g transform="scale(${deviceScale})">
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

async function internalLayer(scale){
  const width=innerWidth,height=innerHeight;
  const svg=svgLayer(width,height);
  const signature=`${width}:${height}:${scale}:${svg}`;
  if(signature===lastInternal)return;
  const image=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    await invoke('set_glass_device_internal',{png:Array.from(new Uint8Array(await blob.arrayBuffer()))});
    lastInternal=signature;
  }finally{URL.revokeObjectURL(url);}
}

async function updateGeometry(){
  if(document.documentElement.dataset.appearance!=='glass'){
    initialized=false;await invoke('set_glass_device_visible',{visible:false});return;
  }
  const version=materialVersion,r=app.getBoundingClientRect();
  const density=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bsl-glass-density'))||1;
  const buttonRects=[...controls.querySelectorAll('button')].filter(button=>!button.hidden).map(controlRect).filter(rect=>rect[2]>0&&rect[3]>0).slice(0,3);
  const surfaceTint=getComputedStyle(app).getPropertyValue('--device-key-rgb').trim().split(/\s+/).map(value=>Number(value)/255);
  lastGeometry={x:r.x,y:r.y,width:r.width,height:r.height,radius:25*deviceScale,depth:12*deviceScale,enabled:true,rounded:true,viewportWidth:innerWidth,density,buttonRects,surfaceTint};
  const info=await invoke('set_glass_optics',{...lastGeometry,...pressParameters()});
  app.dataset.deviceHwnd=String(info.hwnd);
  if(version!==materialVersion)return;
  await internalLayer(info.dpi);
  if(version!==materialVersion)return;
  initialized=true;captureUi();
}
function scheduleGeometry(){clearTimeout(geometryTimer);geometryTimer=setTimeout(()=>{void updateGeometry().catch(error=>console.error('Glass device geometry:',error));},70);}
new ResizeObserver(scheduleGeometry).observe(app);
new MutationObserver(records=>{
  captureUi();
  if(records.some(record=>record.type==='attributes'&&record.attributeName==='hidden'))scheduleGeometry();
}).observe(app,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-pressed','disabled','value']});
new MutationObserver(records=>{
  records=records.filter(record=>record.oldValue!==record.target.getAttribute(record.attributeName));
  if(!records.length)return;
  if(records.some(record=>record.attributeName==='data-appearance')){
    hideEventTooltip();
    materialVersion++;initialized=false;lastTextMask='';lastInternal='';app.dataset.deviceUi='pending';
    void invoke('set_glass_device_visible',{visible:false}).catch(error=>console.error('Glass switch:',error));
  }
  captureUi();scheduleGeometry();
  if(records.some(record=>record.attributeName!=='style'))lastInternal='';
  // Material is a coating choice, not a request to resize the instrument.
  if(records.some(record=>record.attributeName==='data-font-size')&&layout)void layout();
}).observe(document.documentElement,{attributes:true,attributeOldValue:true,attributeFilter:['style','data-theme','data-glow','data-glass-text-tone','data-font-size','data-appearance']});
let interactionUntil=0;
function interaction(){interactionUntil=performance.now()+190;captureUi();}
for(const event of ['pointerdown','pointerup','pointermove','pointerleave','focusin','focusout','input','keydown','keyup'])app.addEventListener(event,interaction,{passive:true});
setInterval(()=>{if(performance.now()<interactionUntil)captureUi();},16);
window.addEventListener('resize',scheduleGeometry);

// Half a second on, half a second off, aligned with the overdue timer.
setInterval(()=>{
  const status=document.querySelector('#timer-status');
  const epoch=Number(status.dataset.deviceAlarmEpoch);
  const lit=Number.isFinite(epoch)&&(Date.now()-epoch)%1000<500;
  if(status.classList.contains('device-alarm-lit')!==lit)status.classList.toggle('device-alarm-lit',lit);
},25);

new MutationObserver(sizeLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
sizeLabels();applyDeviceSize(localStorage.getItem('bsl-timer.glass-device-size'));
document.fonts.ready.then(scheduleGeometry);
