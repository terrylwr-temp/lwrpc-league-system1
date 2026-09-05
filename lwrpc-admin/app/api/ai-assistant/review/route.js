import { authorizeAdminRequest } from '../../../lib/serverSupabase';
import { handleReviewRequest } from '../../../lib/aiReviewHttp.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) { return handleReviewRequest(request,authorizeAdminRequest); }
export function POST(request) { return handleReviewRequest(request,authorizeAdminRequest); }
