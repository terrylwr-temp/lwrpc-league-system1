import {exchangeViewAs,viewError} from '../../../lib/viewAsServer.js';
export async function POST(req){try{const raw=await req.text();if(raw.length>1000)throw new Error();return Response.json({success:true,...await exchangeViewAs(req,JSON.parse(raw))},{headers:{'Cache-Control':'no-store'}});}catch(error){return viewError(error);}}
