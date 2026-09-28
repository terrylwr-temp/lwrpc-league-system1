import { authorizeAdminRequest } from '../../../lib/serverSupabase.js';
import { rejectViewAsMutation } from '../../../lib/viewAsBoundary.js';
import { createScheduleByeSwapHandler } from '../../../lib/scheduleByeSwapServer.js';

export const runtime = 'nodejs';
export const POST = createScheduleByeSwapHandler({ authorize: authorizeAdminRequest, rejectViewAs: request => rejectViewAsMutation(request) });
