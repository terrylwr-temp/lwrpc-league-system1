export function activationTime(value) {
  if (!value) return 'Unknown';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Unknown':`${date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})} at ${date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})}`;
}
export function activationDisplay(version) {
  return {time:activationTime(version?.activated_at),actor:version?.activated_at ? version?.activated_by_name||'Unknown' : 'Unknown'};
}
export async function withActivationNames(db,versions) {
  const ids=[...new Set(versions.map(v=>v.activated_by_member_id).filter(Boolean))];
  const names=new Map();
  if(ids.length){const {data,error}=await db.from('members').select('id,first_name,last_name').in('id',ids);if(error)throw new Error('Activation actor lookup unavailable.');for(const m of data||[])names.set(m.id,[m.first_name,m.last_name].filter(Boolean).join(' ')||'Unknown');}
  return versions.map(v=>{const {activated_by_member_id,...safe}=v;return {...safe,activated_by_name:v.activated_at?names.get(activated_by_member_id)||'Unknown':'Unknown'};});
}
