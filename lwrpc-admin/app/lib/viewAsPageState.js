import {createConversationContext} from "./askLwrConversationState.js";
import {createViewAsProjectionClient} from './viewAsProjectionClient.js';
import {mergeScheduleCaptainNames} from './scheduleCaptainNames.js';
let current=null;
const blobs=new Set(),images=new Map();
export function viewAsBlobUrl(blob){const url=URL.createObjectURL(blob);blobs.add(url);return url;}
export function isViewAsMode(){return typeof document!=='undefined'&&document.documentElement.dataset.lmsViewAs==='true';}
export function setViewAsPageState(state){if(state)state.conversation=current?.viewer.memberId===state.viewer.memberId?current.conversation:createConversationContext();else {current?.conversation.reset(true);for(const url of blobs)URL.revokeObjectURL(url);blobs.clear();images.clear();}current=state;}
export function getViewAsPageState(){if(!isViewAsMode()||!current)throw new Error('View As access is not available.');return current;}
export const viewAsDisplayClient=createViewAsProjectionClient(()=>getViewAsPageState().tables);
export async function viewAsRequest(body){return getViewAsPageState().request(body);}
export async function scheduleTeamsWithNames(teams, divisionId) {
 if (!isViewAsMode()) return teams;
 const state = getViewAsPageState();
 let names = [];
 try {
  const response = await state.request({operation:'page',contract:'schedule_captains',args:{divisionId}});
  if (response.ok) { const data = await response.json(); names = Array.isArray(data.teams) ? data.teams : []; }
 } catch { /* Missing safe names must not fail the schedule or reveal email fallback. */ }
 if (current !== state) return mergeScheduleCaptainNames(teams);
 return mergeScheduleCaptainNames(teams, names);
}
export function viewAsSelfRows(){const {viewer,tables}=getViewAsPageState();return {data:tables.members.filter(m=>m.id===viewer.memberId).map(m=>({...m,user_roles:tables.user_roles.filter(r=>r.member_id===m.id)})),error:null,user:null};}

export async function displaySystemSettings(){
 if(!isViewAsMode())return fetch('/api/system-settings');
 return Response.json({success:true,settings:Object.fromEntries(getViewAsPageState().tables.system_settings.map(r=>[r.setting_key,r.setting_value]))});
}
export async function viewAsAsk(question,conversationReceipt){
 const response=await viewAsRequest({operation:'ask',question,conversationReceipt});
 return Response.json({success:true,...await response.json()});
}
export function openViewAsSource(event,path){
 if(!isViewAsMode())return;
 event.preventDefault();
 window.location.assign(path);
}

export async function viewAsLeagueDocument(leagueId,key){return viewAsBlobUrl(await(await viewAsRequest({operation:'league_document',leagueId,key})).blob());}

export async function hydrateViewAsImages(page,request){
 const setting=page.tables.system_settings.find(r=>r.setting_key==='logo_url');const source=setting?.setting_value||'default-club-logo';let logo=images.get('logo:'+source);
 if(!logo){try{logo=viewAsBlobUrl(await(await request({operation:'logo'})).blob());images.set('logo:'+source,logo);}catch{logo='/website-emblem.png';images.set('logo:'+source,logo);}}
 if(setting)setting.setting_value=logo;else page.tables.system_settings.push({setting_key:'logo_url',setting_value:logo});

 const self=page.tables.members.find(m=>m.id===page.viewer.memberId);
 if(self&&Array.isArray(self.profile_image_urls))self.profile_image_urls=await Promise.all(self.profile_image_urls.slice(0,5).map(async(source,index)=>{
  if(images.has(source))return images.get(source);
  try{const url=viewAsBlobUrl(await(await request({operation:'profile_image',key:`profile:${index}`})).blob());images.set(source,url);return url;}catch{return null;}
 }));
}
