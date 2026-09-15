'use client';
import {useEffect,useRef,useState} from 'react';
import {getRequestAuthorizationHeaders} from '../lib/auth';
import {appConfirm} from '../lib/appDialog';
export default function ViewAsStartButton({memberId}){
 const [available,setAvailable]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const origin=available?.memberId===memberId?available.origin:null;
 const cleanup=useRef(()=>{});
 useEffect(()=>{let disposed=false;getRequestAuthorizationHeaders().then(headers=>fetch('/api/view-as/start?target='+encodeURIComponent(memberId),{headers,cache:'no-store'})).then(r=>r.ok?r.json():null).then(data=>{if(!disposed)setAvailable(data?.name&&data?.origin?{memberId,origin:data.origin}:null);}).catch(()=>{});return()=>{disposed=true;cleanup.current();};},[memberId]);
 async function start(){
  if(!origin||busy)return;
  setBusy(true);setError('');let target;
  try{
   const response=await fetch('/api/view-as/start?target='+encodeURIComponent(memberId),{headers:await getRequestAuthorizationHeaders(),cache:'no-store'});
   target=await response.json();if(!response.ok||!target.name||target.origin!==origin)throw new Error('This member is not currently available for View As User.');
  }catch(e){setError(e.message);setBusy(false);return;}
  if(!await appConfirm({title:'View As User',message:`View the LMS as ${target.name}? This opens a separate read-only tab. Your normal LMS tab stays writable.`,confirmLabel:'View As User'})){setBusy(false);return;}
  const tab=window.open(origin,'_blank');if(!tab){setBusy(false);setError('Allow a new tab to open View As User.');return;}
  setBusy(true);setError('');let used=false;
  const finish=()=>{clearTimeout(timeout);window.removeEventListener('message',ready);setBusy(false);};
  const ready=async event=>{
   if(event.origin!==origin||event.source!==tab||event.data?.type!=='lwr-view-ready'||used)return;
   if(!/^[a-f0-9]{64}$/.test(event.data.challenge))return;used=true;
   try{
    const response=await fetch('/api/view-as/start',{method:'POST',headers:await getRequestAuthorizationHeaders({'Content-Type':'application/json'}),body:JSON.stringify({target:memberId,challenge:event.data.challenge})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to start View As User.');
    tab.postMessage({type:'lwr-view-handoff',code:data.code},origin);
   }catch(e){setError(e.message);tab.close();}finally{finish();}
  };
  const timeout=setTimeout(()=>{finish();setError('View As User handoff expired. Please try again.');},60000);
  window.addEventListener('message',ready);cleanup.current=finish;
 }
 if(!origin)return null;
 return <><button type="button" onClick={start} disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-800 disabled:opacity-50">{busy?'Opening…':'View As User'}</button>{error&&<p role="alert" className="basis-full text-red-700">{error}</p>}</>;
}
