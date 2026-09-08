import {rejectViewAsMutation} from '../../../lib/viewAsBoundary.js';
import { authorizeAdminRequest } from '../../../lib/serverSupabase';
import { handleReviewRequest } from '../../../lib/aiReviewHttp.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) { const denied=rejectViewAsMutation(request);if(denied)return denied; return handleReviewRequest(request,authorizeAdminRequest); }
export function POST(request) { const denied=rejectViewAsMutation(request);if(denied)return denied; return handleReviewRequest(request,authorizeAdminRequest); }
