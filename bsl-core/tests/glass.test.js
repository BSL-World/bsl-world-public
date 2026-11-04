import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlassSurface,GlassLayer} from '../utils/glass.js';

class Element extends EventTarget {
  constructor(){super();this.attributes=new Map();this.style={getPropertyValue:()=>''};this.dataset={};this.id='surface';this.isConnected=true;this.textContent='Caption';this.hidden=false;this.value='';this.disabled=false;}
  setAttribute(k,v){this.attributes.set(k,v);}
  getAttribute(k){return this.attributes.get(k)??null;}
  removeAttribute(k){this.attributes.delete(k);}
  getBoundingClientRect(){return {x:20,y:30,width:80,height:20};}
  matches(){return this.disabled;}
  closest(){return this.button??null;}
  contains(element){return this.glyphs.includes(element);}
  querySelectorAll(selector){if(selector==='!invalid')throw new Error('Bad selector');return this.glyphs??[];}
}
function fixture(){
  const root=new Element();root.dataset.appearance='glass';
  const host=new Element(),glyph=new Element();host.glyphs=[glyph];
  const observers=[],styles=[],calls=[];
  class Observer {constructor(fn){this.fn=fn;observers.push(this);}observe(target){this.target=target;}disconnect(){this.disconnected=true;}}
  const view=new EventTarget();Object.assign(view,{AbortController,MutationObserver:Observer,ResizeObserver:Observer,CSS:{escape:s=>s},setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,performance,innerWidth:400,innerHeight:300,getComputedStyle:()=>({font:'12px sans-serif',letterSpacing:'normal',opacity:'1'})});
  const doc={defaultView:view,documentElement:root,head:{append:style=>styles.push(style)},createElement:()=>({remove(){styles.splice(styles.indexOf(this),1);}})};host.ownerDocument=doc;
  let nextSession=0,currentSession=0;
  const native={
    async configure(geometry){if(!currentSession)currentSession=++nextSession;calls.push(['configure',geometry]);return {hwnd:1,dpi:1,session:currentSession};},
    async captureUi(layer,session){calls.push(['capture',layer,session,root.getAttribute('data-bsl-glass-pass')]);return {width:400,height:300};},
    async setInterior(){},
    async setVisible(value,session){calls.push(['visible',value,session]);},
    async release(session){calls.push(['release',session]);currentSession=0;}
  };
  const config={host,native,getGeometry:()=>({x:0,y:0,width:300,height:200}),ink:{selector:'.caption'},onError:error=>{throw error;}};
  return {root,host,glyph,view,observers,styles,calls,native,config};
}
test('publishes staged UI and ink atomically, then reuses ink until content changes',async()=>{
  const f=fixture(),surface=createGlassSurface(f.config);
  try{
    await surface.refresh();
    assert.deepEqual(f.calls.filter(c=>c[0]==='capture').map(c=>[c[1],c[3]]),[[GlassLayer.STAGED_UI,'base'],[GlassLayer.INK,'mask']]);
    assert.ok(f.calls.findIndex(c=>c[0]==='visible'&&c[1])>f.calls.findIndex(c=>c[1]===GlassLayer.INK));
    assert.equal(f.root.getAttribute('data-bsl-glass-pass'),null);
    f.calls.length=0;await surface.capture();
    assert.deepEqual(f.calls.filter(c=>c[0]==='capture').map(c=>c[1]),[GlassLayer.REUSED_INK_UI]);
    f.glyph.textContent='Changed caption';f.calls.length=0;await surface.capture();
    assert.deepEqual(f.calls.filter(c=>c[0]==='capture').map(c=>c[1]),[GlassLayer.STAGED_UI,GlassLayer.INK]);
  }finally{await surface.dispose();}
});
test('press feedback reaches the native bridge while a UI capture is still pending',async()=>{
  const f=fixture(),surface=createGlassSurface(f.config);await surface.refresh();
  let complete,blocked=true;f.native.captureUi=()=>blocked?new Promise(resolve=>{complete=value=>{blocked=false;resolve(value);};}):Promise.resolve({width:400,height:300});
  const capture=surface.capture();await new Promise(r=>setTimeout(r,10));
  const key=new Element();f.host.button=key;
  const event=new Event('pointerdown');event.button=0;f.host.dispatchEvent(event);
  await new Promise(resolve=>setTimeout(resolve,0));
  const latest=f.calls.filter(c=>c[0]==='configure').at(-1)[1];
  assert.deepEqual(latest.pressedRect,[20,30,80,20]);assert.equal(latest.pressedTravel,3);
  complete({width:400,height:300});await capture;await surface.dispose();
});
test('disposal aborts a suspended capture, releases its session and permits a new owner',async()=>{
  const f=fixture(),surface=createGlassSurface(f.config);await surface.refresh();
  let late;f.native.captureUi=()=>new Promise(resolve=>{late=resolve;});
  void surface.capture();await new Promise(r=>setTimeout(r,10));
  await Promise.race([surface.dispose(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Disposal hung on a stale capture')),200))]);
  assert.equal(f.styles.length,0);assert.ok(f.observers.every(o=>o.disconnected));
  const released=f.calls.find(c=>c[0]==='release');assert.equal(released[1],1);
  const next=createGlassSurface(f.config);late({width:400,height:300});await new Promise(r=>setTimeout(r,5));
  assert.equal(f.root.getAttribute('data-bsl-glass-pass'),null);await next.dispose();
});
test('one document cannot acquire two owners, and disposing one document preserves another',async()=>{
  const a=fixture(),b=fixture(),first=createGlassSurface(a.config),second=createGlassSurface(b.config);
  assert.throws(()=>createGlassSurface(a.config),/already owns/);
  await Promise.all([first.refresh(),second.refresh()]);await first.dispose();
  b.calls.length=0;await second.capture();assert.ok(b.calls.some(c=>c[0]==='visible'&&c[1]));await second.dispose();
});
test('invalid contracts leave the document available to a valid controller',async()=>{
  const f=fixture();assert.throws(()=>createGlassSurface({...f.config,ink:{selector:'.caption',passAttribute:'not-a-data-attribute'}}),/Invalid Glass/);
  assert.equal(f.styles.length,0);const surface=createGlassSurface(f.config);await surface.dispose();
});

test('leaving Glass immediately clears a suspended mask and ignores the old callback after reentry',async()=>{
  const f=fixture(),surface=createGlassSurface(f.config);
  try{
    await surface.refresh();const original=f.native.captureUi;let late;
    f.glyph.textContent='Changed';
    f.native.captureUi=(layer,...args)=>layer===GlassLayer.INK?new Promise(resolve=>{late=resolve;}):original(layer,...args);
    const pending=surface.capture();await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(f.root.getAttribute('data-bsl-glass-pass'),'mask');
    f.root.dataset.appearance='light';
    f.observers.at(-1).fn([{attributeName:'data-appearance',oldValue:'glass',target:f.root}]);
    assert.equal(f.root.getAttribute('data-bsl-glass-pass'),null);
    await pending;
    f.native.captureUi=original;f.root.dataset.appearance='glass';
    f.observers.at(-1).fn([{attributeName:'data-appearance',oldValue:'light',target:f.root}]);
    await surface.refresh();
    const shown=f.calls.filter(c=>c[0]==='visible'&&c[1]).at(-1);
    assert.equal(shown[2],2);
    const count=f.calls.length;late({width:400,height:300});
    await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(f.calls.length,count);
    assert.equal(f.root.getAttribute('data-bsl-glass-pass'),null);
  }finally{await surface.dispose();}
});

test('a capture timeout removes the mask, releases its session and allows a fresh capture',async()=>{
  const f=fixture(),errors=[],surface=createGlassSurface({...f.config,captureTimeoutMs:30,onError:error=>errors.push(error)});
  try{
    await surface.refresh();const original=f.native.captureUi;
    f.native.captureUi=()=>new Promise(()=>{});
    await surface.capture();await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(errors.length,1);assert.match(errors[0].message,/timed out/);
    assert.equal(f.root.getAttribute('data-bsl-glass-pass'),null);
    assert.ok(f.calls.some(c=>c[0]==='release'&&c[1]===1));
    f.native.captureUi=original;await surface.refresh();
    assert.equal(f.calls.filter(c=>c[0]==='visible'&&c[1]).at(-1)[2],2);
  }finally{await surface.dispose();}
});

test('a late configuration is retired before another material can create a new Glass session',async()=>{
  const f=fixture(),surface=createGlassSurface(f.config);
  try{
    await surface.refresh();const original=f.native.configure;let finish;
    f.native.configure=()=>new Promise(resolve=>{finish=resolve;});
    const pending=surface.refresh();await new Promise(resolve=>setTimeout(resolve,0));
    f.root.dataset.appearance='dark';
    f.observers.at(-1).fn([{attributeName:'data-appearance',oldValue:'glass',target:f.root}]);
    finish({hwnd:1,dpi:1,session:1});await pending;
    f.native.configure=original;f.root.dataset.appearance='glass';
    f.observers.at(-1).fn([{attributeName:'data-appearance',oldValue:'dark',target:f.root}]);
    await surface.refresh();
    assert.ok(f.calls.some(c=>c[0]==='release'&&c[1]===1));
    assert.equal(f.calls.filter(c=>c[0]==='visible'&&c[1]).at(-1)[2],2);
  }finally{await surface.dispose();}
});
