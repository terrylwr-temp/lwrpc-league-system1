// Evaluates existing display queries over an already-authorized page projection.
// No network, SQL, credentials, policy decisions or writes exist in this adapter.
const singular={members:'member',teams:'team',divisions:'division',leagues:'league',seasons:'season',locations:'location',matches:'match',match_lines:'match_line',score_sheet_templates:'score_sheet_template',division_lines:'division_line',match_lineups:'match_lineup',team_members:'team_member'};
function split(value){let depth=0,start=0,out=[];for(let i=0;i<value.length;i++){if(value[i]==='(')depth++;if(value[i]===')')depth--;if(value[i]===','&&depth===0){out.push(value.slice(start,i).trim());start=i+1;}}out.push(value.slice(start).trim());return out.filter(Boolean);}
function related(table,row,spec,data){
 spec=spec.trim();const [alias,relationship]=spec.includes(':')?spec.split(':').map(v=>v.trim()):[spec,spec];
 const [target,hint]=relationship.split('!');
 if(!Object.hasOwn(data,target))throw new Error(`Unavailable page relationship: ${target}`);
 let fk=hint?.replace(new RegExp(`^${table}_`),'').replace(/_fkey$/,'');
 if(!fk||fk==='inner')fk=table==='teams'&&target==='locations'?'home_location_id':`${singular[target]||target}_id`;
 if(Object.hasOwn(row,fk))return {alias,target,many:false,rows:data[target].filter(r=>r.id===row[fk])};
 const parentKey=`${singular[table]||table}_id`;
 if(data[target].some(r=>Object.hasOwn(r,parentKey)))return {alias,target,many:true,rows:data[target].filter(r=>r[parentKey]===row.id)};
 // An empty related collection is valid; an absent collection was rejected above.
 return {alias,target,many:true,rows:[]};
}
function project(table,row,selection,data){const out={};for(const item of split(selection)){if(item==='*'){Object.assign(out,row);continue;}const open=item.indexOf('(');if(open>=0){const relation=related(table,row,item.slice(0,open),data);const rows=relation.rows.map(r=>project(relation.target,r,item.slice(open+1,-1),data));out[relation.alias]=relation.many?rows:rows[0]||null;}else{const [alias,key]=item.includes(':')?item.split(':'):[item,item];if(Object.hasOwn(row,key))out[alias]=row[key];}}return out;}
const denied=()=>Promise.resolve({data:null,error:{message:'View As User is read-only.'}});
export function createViewAsProjectionClient(getProjection){
 return Object.freeze({
  from(table){let select='*',filters=[],sorts=[],max=null,offset=0,single=false,head=false;
   const q={
    select(value='*',options={}){select=value;head=!!options.head;return q;},
    eq(k,v){filters.push(r=>r[k]===v);return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},
    in(k,v){filters.push(r=>v.includes(r[k]));return q;},is(k,v){filters.push(r=>r[k]===v);return q;},
    gte(k,v){filters.push(r=>r[k]>=v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},
    ilike(k,v){const pattern=new RegExp('^'+v.split('%').map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$','i');filters.push(r=>pattern.test(r[k]||''));return q;},
    or(value){const clauses=split(value).map(c=>{const [key,op,...rest]=c.split('.');const v=rest.join('.');if(op==='eq')return r=>String(r[key])===v;if(op==='is'&&v==='null')return r=>r[key]==null;if(op==='in')return r=>v.slice(1,-1).split(',').includes(String(r[key]));throw new Error('Unsupported page filter');});filters.push(r=>clauses.some(f=>f(r)));return q;},
    order(key,options={}){sorts.push([key,options.ascending!==false]);return q;},limit(n){max=n;return q;},range(start,end){offset=start;max=end-start+1;return q;},maybeSingle(){single=true;return q;},single(){single=true;return q;},
    insert:denied,update:denied,delete:denied,upsert:denied,
    then(resolve,reject){return Promise.resolve().then(()=>{const data=getProjection();if(!data||!Object.hasOwn(data,table))throw new Error(`View As page read unavailable: ${table}`);let rows=data[table].filter(r=>filters.every(f=>f(r))).map(r=>project(table,r,select,data));for(const [key,ascending]of sorts.toReversed()){const path=key.replace(/\(/g,'.').replace(/\)/g,'').split('.');const value=r=>path.reduce((v,k)=>v?.[k],r);rows.sort((a,b)=>String(value(a)??'').localeCompare(String(value(b)??''),undefined,{numeric:true})*(ascending?1:-1));}const count=rows.length;if(max!==null)rows=rows.slice(offset,offset+max);return {data:head?null:single?rows[0]||null:rows,error:null,count};}).catch(error=>({data:null,error:{message:error.message}})).then(resolve,reject);}
   };return q;
  },
  rpc:denied,
  auth:Object.freeze({getSession:()=>Promise.resolve({data:{session:null},error:null}),getUser:()=>Promise.resolve({data:{user:null},error:null}),signOut:denied,onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}),
 });
}
