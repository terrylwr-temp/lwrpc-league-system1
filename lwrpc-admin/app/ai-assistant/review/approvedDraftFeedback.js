import {useEffect,useRef} from 'react';
import {appConfirm} from '../../lib/appDialog.js';

export function draftSaveError(error) {
 const message=String(error?.message||'').trim();
 if(!message||/^(?:HTTP\s*\d+|Bad Request|technical_error|Failed to fetch|NetworkError)/i.test(message)||/^[a-z_]+$/.test(message))return 'Draft was not saved. Please review the required fields and try again.';
 return `Draft was not saved. ${message}`;
}

// Bounded to an open dirty editor. No router/history replacement.
export function useDraftLeaveWarning(dirty,pending) {
 const bypass=useRef(false);
 useEffect(()=>{
  if(!dirty&&!pending)return;
  const unload=e=>{e.preventDefault();e.returnValue='';};
  const click=async e=>{
   const target=e.target.closest?.('a[href], [data-approved-leave]');
   if(!target||bypass.current)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   if(pending)return;
   if(await appConfirm('You have unsaved Approved Answer changes. Leave without saving?',{title:'Unsaved draft',confirmLabel:'Leave without saving',tone:'warning'})){
    bypass.current=true;target.click();bypass.current=false;
   }
  };
  window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
 },[dirty,pending]);
}
