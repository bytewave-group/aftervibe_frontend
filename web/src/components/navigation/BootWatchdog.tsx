import { BootMarker } from "@/components/navigation/BootMarker";

/**
 * If the app never starts (a script fails to parse on an old Safari, a chunk
 * fails to load, a blocker strips it), the static skeleton would stay up
 * forever with no clue why. This inline script runs before any app code, so
 * it is written in plain ES5. It records script errors and failed
 * script/style loads; if the app has not booted after BOOT_TIMEOUT_MS it shows
 * a reload screen listing the browser and the errors, so a screenshot from the
 * customer tells us what broke. BootMarker flags the boot and removes it.
 */
const BOOT_TIMEOUT_MS = 15000;

const script = `(function(){
var w=window,d=document,errs=[];
w.__avBootErrors=errs;
function add(m){if(errs.length<6)errs.push(String(m).slice(0,220));}
w.addEventListener('error',function(e){
  var t=e&&e.target;
  if(t&&t!==w&&(t.src||t.href)){add('load failed: '+(t.src||t.href).split('/').pop());return;}
  add((e.message||'error')+(e.filename?' @ '+String(e.filename).split('/').pop()+':'+e.lineno+':'+e.colno:''));
},true);
w.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;add('rejection: '+(r&&r.message||r));});
setTimeout(function(){
  if(w.__avBooted||d.getElementById('av-boot-fallback'))return;
  var box=d.createElement('div');
  box.id='av-boot-fallback';
  box.setAttribute('style','position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;background:#000;color:#fff;font:15px/1.5 -apple-system,system-ui,sans-serif;padding:48px 24px;overflow:auto;text-align:center');
  var h=d.createElement('p');h.setAttribute('style','font-size:18px;font-weight:700;margin:0 0 8px');h.textContent='\\u9875\\u9762\\u52a0\\u8f7d\\u5931\\u8d25 / Page failed to load';
  var p=d.createElement('p');p.setAttribute('style','margin:0 0 20px;color:#bbb');p.textContent='\\u8bf7\\u70b9\\u51fb\\u91cd\\u65b0\\u52a0\\u8f7d\\uff1b\\u5982\\u4ecd\\u5931\\u8d25\\uff0c\\u8bf7\\u622a\\u56fe\\u6b64\\u9875\\u9762\\u53d1\\u7ed9\\u6211\\u4eec\\u3002 / Tap reload. If it still fails, send us a screenshot of this page.';
  var b=d.createElement('button');b.type='button';b.textContent='\\u91cd\\u65b0\\u52a0\\u8f7d / Reload';
  b.setAttribute('style','background:#d01f25;color:#fff;border:0;border-radius:999px;padding:10px 28px;font-size:16px;font-weight:700');
  b.onclick=function(){w.location.reload();};
  var info=d.createElement('pre');info.setAttribute('style','margin:24px auto 0;max-width:560px;text-align:left;white-space:pre-wrap;word-break:break-all;font:12px/1.4 ui-monospace,Menlo,monospace;color:#888');
  info.textContent=navigator.userAgent+'\\ntouch: '+(navigator.maxTouchPoints||0)+'  screen: '+screen.width+'x'+screen.height+'\\n'+(errs.length?errs.join('\\n'):'no script errors recorded');
  box.appendChild(h);box.appendChild(p);box.appendChild(b);box.appendChild(info);
  (d.body||d.documentElement).appendChild(box);
},${BOOT_TIMEOUT_MS});
})();`;

export function BootWatchdog() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <BootMarker />
    </>
  );
}
