const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function createScheduleByeSwapHandler({ authorize, rejectViewAs }) {
  return async function POST(request) {
    const denied = rejectViewAs(request);
    if (denied) return denied;
    try {
      const authorization = await authorize(request, 'league_manager');
      if (authorization.error) return Response.json({ success: false, error: authorization.error }, { status: authorization.status });
      if (!uuid.test(authorization.user?.id || '')) return Response.json({ success: false, error: 'The acting user could not be verified.' }, { status: 500 });
      let body;
      try { body = await request.json(); } catch { return Response.json({ success: false, error: 'Invalid swap request.' }, { status: 400 }); }
      if (!object(body) || !uuid.test(body.matchId || '') || !uuid.test(body.byeId || '') ||
        !['home', 'away'].includes(body.side) || !object(body.expectedMatch) || !object(body.expectedBye) ||
        body.expectedMatch.id !== body.matchId || body.expectedBye.id !== body.byeId) {
        return Response.json({ success: false, error: 'Invalid swap request.' }, { status: 400 });
      }
      const { data, error } = await authorization.supabase.rpc('schedule_editor_swap_with_bye', {
        p_match_id: body.matchId, p_side: body.side, p_bye_id: body.byeId,
        p_expected_match: body.expectedMatch, p_expected_bye: body.expectedBye,
        p_actor_user_id: authorization.user.id,
      });
      if (error) {
        const conflict = ['P0001', '55P03', '40P01', '40001'].includes(error.code);
        return Response.json({ success: false, error: conflict ? (error.code === 'P0001' ? error.message : 'The schedule is being edited. Refresh and try again.') : 'The swap could not be saved.' }, { status: conflict ? 409 : 500 });
      }
      return Response.json({ success: true, swap: data });
    } catch {
      return Response.json({ success: false, error: 'The swap could not be saved.' }, { status: 500 });
    }
  };
}
