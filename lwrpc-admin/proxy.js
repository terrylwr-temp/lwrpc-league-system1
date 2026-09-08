import { NextResponse } from 'next/server.js';
import { viewAsOrigins, requestOrigin, rejectViewAsMutation, VIEW_AS_ERROR } from './app/lib/viewAsBoundary.js';

export function proxy(request) {
  const origins = viewAsOrigins();
  const url = new URL(request.url);url.host=new URL(requestOrigin(request)).host;
  if (origins && url.origin === origins.view) {
    const headers = new Headers(request.headers);
    const nonce = btoa(crypto.randomUUID());
    headers.set('x-view-as-nonce', nonce);
    const csp = `default-src 'none'; script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; worker-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`;
    headers.set('Content-Security-Policy', csp);
    let response;
    if (url.pathname.startsWith('/_next/static/') || url.pathname === '/favicon.ico') response = NextResponse.next();
    else if (url.pathname === '/api/view-as/read' || url.pathname === '/api/view-as/exchange' || url.pathname === '/api/view-as/bootstrap') response = NextResponse.next({request:{headers}});
    else if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/') || !['GET','HEAD'].includes(request.method)) response = NextResponse.json({success:false,error:VIEW_AS_ERROR},{status:403});
    else {
      const dest = new URL(request.url); dest.pathname='/view-as'; dest.search='';
      response = NextResponse.rewrite(dest,{request:{headers}});
    }
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Referrer-Policy','no-referrer');
    response.headers.set('X-Frame-Options','DENY');
    response.headers.set('X-Content-Type-Options','nosniff');
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    return response;
  }
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/view-as/')) {
    const denied = rejectViewAsMutation(request);
    if (denied) return denied;
  }
  if (url.pathname.startsWith('/api/view-as/') && url.pathname !== '/api/view-as/start' || url.pathname === '/view-as') return NextResponse.json({error:'Unavailable'},{status:403});
  return NextResponse.next();
}
export const config = {matcher:['/:path*']};


