import test from 'node:test';
import {eligibilityDatabase,eligibilityMatrix} from './helpers/eligibilityDatabase.mjs';
test('LMS-0725 SELF-only RF migration, replay, roles, projection and effective target',async()=>{const db=await eligibilityDatabase();try{await eligibilityMatrix(db);}finally{await db.close();}});
