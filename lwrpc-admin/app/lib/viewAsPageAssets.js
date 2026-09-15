// Resolve only image references already present in a target-authorized projection.
// No caller-supplied URL or arbitrary storage path is accepted.
export function scopedProfileImage(page,key,storageOrigin){
 const match=/^profile:([0-4])$/.exec(key||'');if(!match)return null;
 const self=page.tables.members.find(m=>m.id===page.viewer.memberId);
 const value=self?.profile_image_urls?.[Number(match[1])];if(typeof value!=='string')return null;
 try{const url=new URL(value);if(url.origin!==new URL(storageOrigin).origin||url.username||url.password||url.search||url.hash)return null;
 const prefix='/storage/v1/object/public/profile-photos/';if(!url.pathname.startsWith(prefix))return null;
 const path=decodeURIComponent(url.pathname.slice(prefix.length));if(!path||path.split('/').some(s=>s==='..'||s==='.')||!/^[-a-zA-Z0-9/_.]+$/.test(path))return null;
 return {bucket:'profile-photos',path};}catch{return null;}
}
