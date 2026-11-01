import './glass-device.css';

const root=document.documentElement;
const panel=document.querySelector('.timer-panel');
const display=document.querySelector('#timer-display');
const status=document.querySelector('#timer-status');
const module=document.createElement('div');
module.className='device-display-module';
const led=document.createElement('span');
led.className='device-alarm-led';led.setAttribute('aria-hidden','true');
const size=document.createElement('select');
size.id='device-scale';size.className='device-scale';
for(const value of ['small','normal','large']){
  const option=document.createElement('option');option.value=value;size.append(option);
}
let deviceLoaded;
function arrange(){
  const glass=root.dataset.appearance==='glass';
  if(glass){
    root.dataset.glassDevice='true';
    if(!module.isConnected){panel.prepend(module);module.append(status,display);status.prepend(led);}
    if(!size.isConnected)document.querySelector('.timer-tabs-bar').append(size);
    size.hidden=false;
  }else{
    delete root.dataset.glassDevice;
    if(module.isConnected){panel.prepend(status,display);module.remove();led.remove();}
    size.hidden=true;
    status.removeAttribute('aria-hidden');
  }
  return glass;
}
arrange();
void import('./main.js').catch(console.error);
async function applyMaterial(){
  const glass=arrange();
  window.dispatchEvent(new Event('bsl-timer:glass-material-changed'));
  if(glass){deviceLoaded??=import('./glass-device.js');await deviceLoaded;}
}
new MutationObserver(()=>{void applyMaterial().catch(console.error);}).observe(root,{attributes:true,attributeFilter:['data-appearance']});
await applyMaterial();
