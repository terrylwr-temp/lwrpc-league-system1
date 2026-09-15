import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {passwordResetAccess,passwordResetLinkError,RESET_LINK_ERROR,RESET_SESSION_ERROR} from '../app/lib/passwordResetAccess.js';

test('screenshot expired-link fragment is rejected immediately',()=>{
 assert.equal(passwordResetLinkError('', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),RESET_LINK_ERROR);
});
test('query errors and unknown error text use safe fixed messages',()=>{
 assert.equal(passwordResetLinkError('?error_code=otp_expired',''),RESET_LINK_ERROR);
 assert.equal(passwordResetLinkError('','#error_description=%3Cscript%3E'),RESET_LINK_ERROR);
 assert.equal(passwordResetLinkError('?returnTo=%2Fteams','#access_token=fixture&type=recovery'),'');
});
test('invalid link cannot fall back to an existing unrelated signed-in session',async()=>{
 let calls=0;const result=await passwordResetAccess({getSession:async()=>{calls++;return {data:{session:{}}};}},RESET_LINK_ERROR);
 assert.equal(result.ready,false);assert.equal(calls,0);
});
test('missing session, provider error and thrown network errors fail closed',async()=>{
 for(const getSession of [async()=>({data:{session:null}}),async()=>({data:{session:{}},error:new Error('private error')}),async()=>{throw new Error('network');}]){
  assert.deepEqual(await passwordResetAccess({getSession}),{ready:false,message:RESET_SESSION_ERROR});
 }
});
test('valid recovery and ordinary signed-in change-password sessions remain allowed',async()=>{
 assert.deepEqual(await passwordResetAccess({getSession:async()=>({data:{session:{user:{id:'fixture'}}},error:null})}),{ready:true,message:''});
});
const source=fs.readFileSync(new URL('../app/reset-password/page.js',import.meta.url),'utf8');
function handler(name,context){
 const ast=ts.createSourceFile('page.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);let found;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(found);
 return vm.runInNewContext(`${found};${name}`,context);
}
function setup(overrides={}){
 const messages=[];let writes=0;const ctx={checkingSession:false,sessionReady:true,linkError:'',password:'fixture-password',confirmPassword:'fixture-password',returnTo:'',RESET_SESSION_ERROR,passwordResetAccess,setMessage:v=>messages.push(v),setLoading:()=>{},setPassword:()=>{},setConfirmPassword:()=>{},setSessionReady:()=>{},supabase:{auth:{getSession:async()=>({data:{session:{}}}),updateUser:async()=>{writes++;return {error:null};}}},...overrides};
 return {ctx,messages,get writes(){return writes;},submit:()=>handler('updatePassword',ctx)({preventDefault(){}})};
}
test('disabled/unready/invalid-link submissions never call updateUser',async()=>{
 for(const override of [{checkingSession:true},{sessionReady:false},{linkError:RESET_LINK_ERROR}]){const h=setup(override);await h.submit();assert.equal(h.writes,0);}
});
test('session expiring after page load blocks submission and clears secrets',async()=>{
 let cleared=0;const h=setup({passwordResetAccess:async()=>({ready:false,message:RESET_SESSION_ERROR}),setPassword:()=>cleared++,setConfirmPassword:()=>cleared++});
 await h.submit();assert.equal(h.writes,0);assert.equal(cleared,2);assert.equal(h.messages.at(-1),RESET_SESSION_ERROR);
});
test('valid submission calls existing updateUser once; mismatches never do',async()=>{
 const h=setup();await h.submit();assert.equal(h.writes,1);assert.match(h.messages.at(-1),/Password updated/);
 const mismatch=setup({confirmPassword:'different'});await mismatch.submit();assert.equal(mismatch.writes,0);
});
test('passkey registration also blocks missing recovery session',async()=>{
 let calls=0;const h=setup({passwordResetAccess:async()=>({ready:false,message:RESET_SESSION_ERROR})});h.ctx.supabase.auth.registerPasskey=async()=>{calls++;};
 await handler('registerPasskey',h.ctx)();assert.equal(calls,0);
});
