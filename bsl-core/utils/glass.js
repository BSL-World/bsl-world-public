// Product-neutral DOM/layer adapter. The host supplies geometry, content and IPC.
const owners = new WeakMap();
let sequence = 0;
export const GlassLayer = Object.freeze({ UI:0, INTERIOR:1, INK:2, STAGED_UI:3, REUSED_INK_UI:4 });
export const MAX_GLASS_CONTROLS = 64;

export function createGlassInkStyles({hostSelector,selector,engravedSelector='',frameSelector='',excludeSelector='',tint='var(--bsl-glass-accent)',passAttribute='data-bsl-glass-pass',clipProperty='--bsl-glass-ink-clip'}) {
  if(!/^data-[a-z0-9-]+$/.test(passAttribute)||!/^--[a-z0-9-]+$/.test(clipProperty))throw new TypeError('Invalid Glass capture attribute or property');
  const root=`:root[${passAttribute}]`,mask=`:root[${passAttribute}="mask"]`,base=`:root[${passAttribute}="base"]`;
  return `
${root} ${hostSelector} :is(${selector}) {color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;}
${mask} *,${mask} {color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;background:transparent!important;border-color:transparent!important;outline-color:transparent!important;box-shadow:none!important;}
${mask} *::before,${mask} *::after {visibility:hidden!important;}
${excludeSelector?`${mask} :is(${excludeSelector}) {visibility:hidden!important;}`:''}
${mask} ${hostSelector} :is(${selector}) {color:${tint}!important;-webkit-text-fill-color:${tint}!important;text-shadow:none!important;}
${engravedSelector?`${mask} ${hostSelector} :is(${engravedSelector}) {color:#000!important;-webkit-text-fill-color:#000!important;}`:''}
${frameSelector?`${base} ${hostSelector} :is(${frameSelector}) {border-color:transparent!important;}
${mask} ${hostSelector} :is(${frameSelector}) {border-color:${tint}!important;}`:''}
${mask} ${hostSelector} {clip-path:var(${clipProperty},none);}`;
}

export function createGlassSurface(options) {
  const {host,native,getGeometry,getInterior=()=>null,ink,onState=()=>{},onError=error=>console.error('Glass surface:',error),onMaterialChange=()=>{},onFontChange=()=>{}}=options;
  const doc=host.ownerDocument,view=doc.defaultView,root=doc.documentElement;
  const captureTimeoutMs=options.captureTimeoutMs??6000;
  if(!Number.isFinite(captureTimeoutMs)||captureTimeoutMs<=0)throw new TypeError('Invalid Glass capture timeout');
  if(owners.has(root))throw new Error('A Glass surface already owns this document; dispose it before replacing it');
  for(const key of ['configure','captureUi','setInterior','setVisible','release'])if(typeof native[key]!=='function')throw new TypeError(`Missing Glass bridge: ${key}`);
  for(const selector of [ink.selector,ink.engravedSelector,ink.frameSelector,ink.excludeSelector,...Object.values(options.roles??{})].filter(Boolean))host.querySelectorAll(selector);
  for(const role of Object.keys(options.roles??{}))if(!/^[a-z-]+$/.test(role))throw new TypeError('Invalid Glass primitive role');
  createGlassInkStyles({...ink,hostSelector:'#validation'});
  const owner={},abort=new view.AbortController();owners.set(root,owner);
  const previousId=host.id;if(!host.id)host.id=`bsl-glass-surface-${++sequence}`;
  host.setAttribute('data-bsl-glass-surface','');
  const passAttribute=ink.passAttribute??'data-bsl-glass-pass',clipProperty=ink.clipProperty??'--bsl-glass-ink-clip';
  const style=doc.createElement('style');style.textContent=createGlassInkStyles({...ink,passAttribute,clipProperty,hostSelector:`#${view.CSS.escape(host.id)}`});doc.head.append(style);
  const roleRecords=new Map();
  function bindRoles(){
    for(const [element,record] of roleRecords)if(!host.contains(element)){for(const [name,value] of record)value===null?element.removeAttribute(name):element.setAttribute(name,value);roleRecords.delete(element);}
    for(const [role,selector] of Object.entries(options.roles??{})){
      if(!/^[a-z-]+$/.test(role))throw new TypeError('Invalid Glass primitive role');
      for(const element of host.querySelectorAll(selector)){
        const attribute=`data-bsl-glass-${role}`;
        if(!roleRecords.has(element))roleRecords.set(element,new Map());
        const record=roleRecords.get(element);if(!record.has(attribute))record.set(attribute,element.getAttribute(attribute));
        element.setAttribute(attribute,'');
      }
    }
  }
  bindRoles();
  let disposed=false,generation=0,initialized=false,lastGeometry=null,pressed=null,lastMask='',lastInterior='',session=null;
  const pendingConfigurations=new Set();
  let nativeQueue=Promise.resolve();
  function nativeStep(operation){const task=nativeQueue.then(operation,operation);nativeQueue=task.catch(()=>{});return task;}
  function configure(geometry,version=generation){
    const task=nativeStep(async()=>{
      if(!current(version))return null;
      const result=await native.configure(geometry);
      if(!current(version)){await native.setVisible(false,result.session);await native.release(result.session);return null;}
      session=result.session;return result;
    });
    pendingConfigurations.add(task);task.then(()=>pendingConfigurations.delete(task),()=>pendingConfigurations.delete(task));return task;
  }
  function releaseNative(){return nativeStep(async()=>{
    const retired=session;session=null;
    try{await native.setVisible(false,retired);}finally{await native.release(retired);}
  });}
  let captureTask=null,dirty=false,geometryTimer,interactionTimer,interactionUntil=0;
  const active=()=>!disposed&&root.dataset.appearance==='glass';
  const current=version=>active()&&version===generation;
  const pendingFrames=new Set();
  let captureAbort=new view.AbortController();
  function cancelCapture(renew=true){
    captureAbort.abort();
    for(const id of pendingFrames)view.cancelAnimationFrame(id);pendingFrames.clear();
    if(owners.get(root)===owner)root.removeAttribute(passAttribute);
    if(renew)captureAbort=new view.AbortController();
  }
  const wait=promise=>new Promise((resolve,reject)=>{
    const signal=captureAbort.signal;let complete=false,timer;
    const finish=(callback,value)=>{if(complete)return;complete=true;view.clearTimeout(timer);signal.removeEventListener('abort',cancel);callback(value);};
    const cancel=()=>finish(resolve,undefined);
    signal.addEventListener('abort',cancel,{once:true});
    timer=view.setTimeout(()=>finish(reject,new Error(`Glass capture timed out after ${captureTimeoutMs} ms`)),captureTimeoutMs);
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
    if(signal.aborted)cancel();
  });
  abort.signal.addEventListener('abort',()=>cancelCapture(false),{once:true});
  const frame=()=>wait(new Promise(resolve=>{const id=view.requestAnimationFrame(()=>{pendingFrames.delete(id);resolve();});pendingFrames.add(id);}));
  const rect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
  const pressedState=()=>({pressedRect:pressed?.isConnected&&!pressed.disabled?rect(pressed):null,pressedTravel:pressed&&!pressed.disabled?(options.getPressTravel?.()??3):0});
  const telemetry=(type,data={})=>{if(!disposed)onState(type,data);};
  const report=error=>{if(!disposed)onError(error);};

  async function paint(version,paintSession){
    const signature=JSON.stringify([view.innerWidth,view.innerHeight,host.style.getPropertyValue(clipProperty),ink.getPaletteSignature?.(),...[...host.querySelectorAll(ink.selector)].map(element=>{
      const r=element.getBoundingClientRect(),s=view.getComputedStyle(element);
      return [element.textContent,element.value,element.hidden,element.matches(':disabled'),r.x,r.y,r.width,r.height,s.font,s.letterSpacing,s.opacity];
    })]);
    const changed=signature!==lastMask;
    try{
      root.setAttribute(passAttribute,'base');await frame();if(!current(version))return false;
      const result=await wait(native.captureUi(changed?GlassLayer.STAGED_UI:GlassLayer.REUSED_INK_UI,paintSession));
      telemetry('capture',result);if(!current(version))return false;
      if(changed){
        root.setAttribute(passAttribute,'mask');await frame();if(!current(version))return false;
        await wait(native.captureUi(GlassLayer.INK,paintSession));if(!current(version))return false;lastMask=signature;
      }
      return current(version);
    }finally{if(owners.get(root)===owner&&version===generation)root.removeAttribute(passAttribute);}
  }
  function capture(){
    if(disposed)return Promise.resolve();dirty=true;if(captureTask)return captureTask;
    let captureVersion=generation;
    captureTask=(async()=>{
      do{
        dirty=false;if(!initialized||!active())break;
        const version=generation,paintSession=session;captureVersion=version;
        if(await paint(version,paintSession)){
          await nativeStep(async()=>{
            if(!current(version))return;
            await native.setVisible(true,paintSession);
            if(current(version))telemetry('ready');
          });
        }
      }while(dirty&&active());
    })().catch(error=>{
      if(current(captureVersion)){initialized=false;generation++;cancelCapture();void releaseNative().catch(report);}
      report(error);
    }).finally(()=>{captureTask=null;});
    return captureTask;
  }
  async function interior(dpi,version){
    const content=await getInterior();if(!content||!current(version))return;
    const {svg,width=view.innerWidth,height=view.innerHeight}=typeof content==='string'?{svg:content}:content;
    const signature=`${width}:${height}:${dpi}:${svg}`;if(signature===lastInterior)return;
    const image=new view.Image(),url=view.URL.createObjectURL(new view.Blob([svg],{type:'image/svg+xml'}));
    try{
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});if(!current(version))return;
      const canvas=doc.createElement('canvas');canvas.width=Math.round(width*dpi);canvas.height=Math.round(height*dpi);
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!current(version))return;
      await native.setInterior(Array.from(new Uint8Array(await blob.arrayBuffer())),session);if(current(version))lastInterior=signature;
    }finally{view.URL.revokeObjectURL(url);}
  }
  async function refresh(){
    if(disposed)return;
    if(!active()){initialized=false;await releaseNative();return;}
    const version=generation;lastGeometry=getGeometry();
    const result=await configure({...lastGeometry,...pressedState()},version);if(!result||!current(version))return;
    telemetry('geometry',result);await interior(result.dpi,version);if(!current(version))return;
    initialized=true;await capture();
  }
  function scheduleGeometry(){if(disposed)return;view.clearTimeout(geometryTimer);geometryTimer=view.setTimeout(()=>{void refresh().catch(report);},70);}
  function invalidate({geometry=true,interior:clearInterior=false}={}){
    if(clearInterior)lastInterior='';if(geometry)scheduleGeometry();else void capture();
  }
  function press(element){
    pressed=element;if(!lastGeometry||!active())return;
    const start=view.performance.now();
    void configure({...lastGeometry,...pressedState()}).then(()=>telemetry('press',{milliseconds:view.performance.now()-start,state:element?'down':'up'})).catch(report);
  }
  const listen=(target,name,handler,extra={})=>target.addEventListener(name,handler,{...extra,signal:abort.signal});
  const button=event=>event.target.closest(options.pressSelector??'button');
  listen(host,'pointerdown',event=>{const key=button(event);if(event.button===0&&key&&!key.disabled)press(key);},{capture:true,passive:true});
  for(const event of ['pointerup','pointercancel','blur'])listen(view,event,()=>{if(pressed)press(null);},{capture:true,passive:true});
  listen(host,'keydown',event=>{const key=button(event);if(!event.repeat&&['Space','Enter'].includes(event.code)&&key&&!key.disabled)press(key);},{capture:true});
  listen(host,'keyup',event=>{if(['Space','Enter'].includes(event.code)&&pressed)press(null);},{capture:true});
  const resize=new view.ResizeObserver(scheduleGeometry);resize.observe(host);
  const mutations=new view.MutationObserver(records=>{if(records.some(r=>r.type==='childList'))bindRoles();void capture();if(records.some(r=>r.type==='attributes'&&r.attributeName==='hidden'))scheduleGeometry();});
  mutations.observe(host,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-pressed','disabled','value']});
  const material=new view.MutationObserver(records=>{
    records=records.filter(r=>r.oldValue!==r.target.getAttribute(r.attributeName));if(!records.length)return;
    if(records.some(r=>r.attributeName==='data-appearance')){
      generation++;initialized=false;cancelCapture();lastMask='';lastInterior='';
      onMaterialChange();telemetry('pending');
      void releaseNative().catch(report);
    }
    if(records.some(r=>r.attributeName!=='style'))lastInterior='';
    void capture();scheduleGeometry();if(records.some(r=>r.attributeName==='data-font-size'))onFontChange();
  });
  material.observe(root,{attributes:true,attributeOldValue:true,attributeFilter:['style','data-theme','data-glow','data-glass-text-tone','data-font-size','data-appearance']});
  function interaction(){interactionUntil=view.performance.now()+190;void capture();}
  for(const event of ['pointerdown','pointerup','pointermove','pointerleave','focusin','focusout','input','keydown','keyup'])listen(host,event,interaction,{passive:true});
  interactionTimer=view.setInterval(()=>{if(view.performance.now()<interactionUntil)void capture();},16);
  listen(view,'resize',scheduleGeometry);
  listen(view,'focus',()=>{if(active()&&!initialized)scheduleGeometry();});
  async function dispose(){
    if(disposed)return;disposed=true;generation++;abort.abort();resize.disconnect();mutations.disconnect();material.disconnect();
    view.clearTimeout(geometryTimer);view.clearInterval(interactionTimer);
    await captureTask;
    await Promise.allSettled([...pendingConfigurations]);
    try{await releaseNative();}
    finally{if(owners.get(root)===owner){root.removeAttribute(passAttribute);owners.delete(root);}style.remove();host.removeAttribute('data-bsl-glass-surface');if(!previousId)host.removeAttribute('id');for(const [element,record] of roleRecords)for(const [name,value] of record)value===null?element.removeAttribute(name):element.setAttribute(name,value);}
  }
  return {refresh,capture,invalidate,dispose};
}
