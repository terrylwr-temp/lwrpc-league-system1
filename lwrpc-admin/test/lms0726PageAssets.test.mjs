import test from 'node:test';import assert from 'node:assert/strict';
import {scopedProfileImage} from '../app/lib/viewAsPageAssets.js';
const origin='https://synthetic.example.invalid';
function page(url){return {viewer:{memberId:'self'},tables:{members:[{id:'self',profile_image_urls:[url]},{id:'other',profile_image_urls:[origin+'/storage/v1/object/public/profile-photos/private.png']}]}};}
test('0726 profile image resolves only authorized self reference and fixed storage bucket',()=>{
 const input=page(origin+'/storage/v1/object/public/profile-photos/user/avatar.png');assert.deepEqual(scopedProfileImage(input,'profile:0',origin),{bucket:'profile-photos',path:'user/avatar.png'});
 for(const key of ['other','profile:-1','profile:5','profile:0/other'])assert.equal(scopedProfileImage(input,key,origin),null);
 for(const url of ['https://elsewhere.invalid/storage/v1/object/public/profile-photos/a.png',origin+'/storage/v1/object/public/secrets/a.png',origin+'/storage/v1/object/public/profile-photos/a.png?token=secret',origin+'/storage/v1/object/public/profile-photos/%2e%2e%2fsecret'])assert.equal(scopedProfileImage(page(url),'profile:0',origin),null);
});
