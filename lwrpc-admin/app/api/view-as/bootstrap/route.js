import {assertViewOrigin,viewCookie,viewError} from '../../../lib/viewAsServer.js';
import {opaque,validOpaque,digest} from '../../../lib/viewAsCrypto.js';
import {viewAsOrigins,VIEW_AS_COOKIE} from '../../../lib/viewAsBoundary.js';
export async function POST(req){try{assertViewOrigin(req);const existing=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${VIEW_AS_COOKIE}=`))?.slice(VIEW_AS_COOKIE.length+1);const challenge=validOpaque(existing)?existing:opaque();return Response.json({challenge:digest(challenge),normalOrigin:viewAsOrigins().normal},{headers:{'Cache-Control':'no-store','Set-Cookie':viewCookie(challenge)}});}catch(error){return viewError(error);}}
