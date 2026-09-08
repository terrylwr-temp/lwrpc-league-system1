export const VIEW_AS_ERROR = 'This action is unavailable while using View As User. Exit View As User to make changes.';
export const VIEW_AS_COOKIE = '__Host-lwr-view-binding';
export function viewAsOrigins(env = process.env) {
  if (!env.VIEW_AS_ORIGIN || !env.LMS_ORIGIN) return null;
  const normal = new URL(env.LMS_ORIGIN), view = new URL(env.VIEW_AS_ORIGIN);
  for (const url of [normal, view]) {
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid View As origin configuration');
    if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && ['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) throw new Error('View As requires HTTPS');
  }
  if (normal.origin === view.origin) throw new Error('View As requires isolated origins');
  return { normal: normal.origin, view: view.origin };
}
// Next.js may normalize request.url to the server hostname. Host is the actual
// HTTP routing authority. Do not trust caller-provided forwarded-host headers.
export function requestOrigin(request){const url=new URL(request.url);const host=request.headers.get('host');if(host)url.host=host;return url.origin;}
// This guard is also called inside existing route handlers: proxy is not the
// only defense against a context credential entering legacy authentication.
export function rejectViewAsMutation(request, env = process.env) {
  const origins = viewAsOrigins(env);
  const origin = requestOrigin(request);
  const marker = request.headers.get('x-view-as-context') || /^Bearer va1\./i.test(request.headers.get('authorization') || '') || (request.headers.get('cookie') || '').includes(`${VIEW_AS_COOKIE}=`);
  if (marker || origins && (origin === origins.view || request.headers.get('origin') === origins.view)) {
    return Response.json({success:false,error:VIEW_AS_ERROR}, {status:403,headers:{'Cache-Control':'no-store'}});
  }
  return null;
}
export function isolatedRequestAllowed(request, origins) {
  const origin = requestOrigin(request);
  if (!origins || origin !== origins.view) return false;
  if (request.headers.get('authorization')) return false;
  if (request.method !== 'GET' && request.headers.get('origin') !== origins.view) return false;
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') return false;
  return true;
}

