import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=process.cwd(),dir=path.join(root,'.next',`lms0724-isolated-${Date.now()}`);fs.mkdirSync(dir,{recursive:true});
for(const item of ['app','public'])fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true});
for(const item of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs','proxy.js'])fs.copyFileSync(path.join(root,item),path.join(dir,item));
const config=path.join(dir,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('const repositoryRoot = join(appRoot, "..");',`const repositoryRoot = ${JSON.stringify(path.resolve(root,'..'))};`));
if(!fs.existsSync(path.join(dir,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
process.loadEnvFile('.env.local');const env={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD/i.test(key)&&!key.startsWith('NEXT_PUBLIC_'))delete env[key];
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:dir,env,stdio:'inherit'});process.exitCode=result.status??1;
