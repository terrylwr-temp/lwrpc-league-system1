// Bounded whole-night planner for two-court, eight/nine-player round robins.
// Saved games are immutable; only a continuation is searched. No database access.
const pairings = ([a, b, c, d]) => [[a, b, c, d], [a, c, b, d], [a, d, b, c]];
const bit = i => 1 << i;
function pop(mask) {
    let count = 0;
    for (; mask; mask &= mask - 1) count++;
    return count;
}
function compare(first, second) {
    for (let index = 0; index < first.length; index++) {
        if (first[index] !== second[index]) return first[index] - second[index];
    }
    return 0;
}
const cache = new Map();
function candidates(n) {
    if (cache.has(n))
        return cache.get(n);
    const result = [];
    for (const bye of n === 9 ? Array.from({ length: n }, (_, i) => i) : [-1]) {
        const pool = Array.from({ length: n }, (_, i) => i).filter(i => i !== bye);
        for (let a = 1; a < 6; a++)
            for (let b = a + 1; b < 7; b++)
                for (let c = b + 1; c < 8; c++) {
                    const first = [pool[0], pool[a], pool[b], pool[c]], second = pool.filter(i => !first.includes(i));
                    for (const left of pairings(first))
                        for (const right of pairings(second))
                            for (const groups of [[left, right]]) {
                                const masks = groups.map(g => g.reduce((m, i) => m | bit(i), 0));
                                const pairs = groups.flatMap(([a, b, c, d]) => [Math.min(a, b) * n + Math.max(a, b), Math.min(c, d) * n + Math.max(c, d)]);
                                result.push({ groups, masks, pairs, bye });
                            }
                }
    }
    cache.set(n, result);
    return result;
}
const list = x => Array.isArray(x) ? x.filter(p => p?.id != null).map(p => String(p.id)) : [];
function subsets(mask) {
    const out = [];
    for (let s = mask; s; s = (s - 1) & mask)
        if (pop(s) >= 2)
            out.push(s);
    return out;
}
export function nightlyHistory(players, matches = []) {
    const n = players.length, index = new Map(players.map((p, i) => [String(p.id), i]));
    const state = { partners: Array(n * n).fill(0), courts: Array(n * 2).fill(0), byes: Array(n).fill(0), last: Array(n).fill(0), previous: Array(n).fill(0), groups: new Map(), quad: 0, triple: 0, streak: 0, adjacent: 0, path: [] };
    const seen = new Set(), byeSeen = new Set();
    let roundNumber = 0;
    const ordered = [...matches].sort((a, b) => Number(a.round_number ?? a.roundNumber ?? 0) - Number(b.round_number ?? b.roundNumber ?? 0));
    for (const m of ordered) {
        const round = Number(m.round_number ?? m.roundNumber ?? 0), court = Number(m.court_number ?? m.courtNumber ?? 1) - 1;
        roundNumber = Math.max(roundNumber, round);
        const key = m.id ? `id:${m.id}` : `${m.session_id || ''}:${round}:${court}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        if (m.status === 'not_played')
            continue;
        const teams = [list(m.team1_players ?? m.team1), list(m.team2_players ?? m.team2)];
        for (const id of list(m.bye_players ?? m.byes)) {
            const k = `${m.session_id || ''}:${round}:${id}`, i = index.get(id);
            if (i !== undefined && !byeSeen.has(k)) {
                state.byes[i]++;
                byeSeen.add(k);
            }
        }
        if (teams.some(t => t.length !== 2) || new Set(teams.flat()).size !== 4)
            continue;
        const active = teams.flat().map(id => index.get(id)).filter(i => i !== undefined);
        const mask = active.reduce((m, i) => m | bit(i), 0);
        for (const team of teams) {
            const [a, b] = team.map(id => index.get(id));
            if (a !== undefined && b !== undefined)
                state.partners[Math.min(a, b) * n + Math.max(a, b)]++;
        }
        for (const i of active) {
            if (court === 0 || court === 1)
                state.courts[i * 2 + court]++;
            state.previous[i] = state.last[i];
            state.last[i] = mask;
        }
        for (const s of subsets(mask))
            state.groups.set(s, (state.groups.get(s) || 0) + 1);
    }
    return { state, roundNumber };
}
function score(state, c) {
    let quad = state.quad, triple = state.triple, streak = state.streak, adjacent = state.adjacent, exposureMax = 0, exposureSum = 0;
    for (let court = 0; court < 2; court++)
        for (const i of c.groups[court]) {
            const mask = c.masks[court], overlap = pop(mask & state.last[i]);
            if (overlap === 4)
                quad++;
            if (overlap >= 3)
                triple++;
            adjacent += Math.max(0, overlap - 1);
            streak += Math.max(0, pop(mask & state.last[i] & state.previous[i]) - 1);
        }
    for (const mask of c.masks)
        for (const s of subsets(mask)) {
            const count = (state.groups.get(s) || 0) + 1;
            exposureMax = Math.max(exposureMax, count);
            exposureSum += count * count;
        }
    const byeCounts = state.byes.map((v, i) => v + Number(c.bye === i));
    // Longer group streaks are especially undesirable; odd appearance totals allow 3/2 or 4/3.
    return [Math.max(...byeCounts) - Math.min(...byeCounts), quad, triple, streak, adjacent, exposureMax, exposureSum];
}
function advance(state, c) {
    const next = { ...state, partners: [...state.partners], courts: [...state.courts], byes: [...state.byes], last: [...state.last], previous: [...state.previous], groups: new Map(state.groups), path: [...state.path, c] };
    if (c.bye >= 0)
        next.byes[c.bye]++;
    c.pairs.forEach(p => next.partners[p]++);
    for (let court = 0; court < 2; court++) {
        const mask = c.masks[court];
        for (const i of c.groups[court]) {
            const overlap = pop(mask & state.last[i]);
            next.quad += Number(overlap === 4);
            next.triple += Number(overlap >= 3);
            next.adjacent += Math.max(0, overlap - 1);
            next.streak += Math.max(0, pop(mask & state.last[i] & state.previous[i]) - 1);
            next.courts[i * 2 + court]++;
            next.previous[i] = state.last[i];
            next.last[i] = mask;
        }
        for (const s of subsets(mask))
            next.groups.set(s, (next.groups.get(s) || 0) + 1);
    }
    return next;
}
function nightRank(state, n) {
    const excess = Array.from({ length: n }, (_, i) => Math.floor(Math.abs(state.courts[i * 2] - state.courts[i * 2 + 1]) / 2));
    return [state.quad, state.triple, Math.max(...excess), excess.reduce((a, b) => a + b, 0), state.streak, state.adjacent, Math.max(0, ...state.groups.values()), [...state.groups.values()].reduce((sum, v) => sum + v * v, 0)];
}
function improveNight(initial, seed, n) {
    let randomState = 712367;
    const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
    const evaluate = path => path.reduce((s, c) => advance(s, c), initial);
    // Approximate the lexicographic priorities during exploration. Keep the
    // best candidate by exact lexicographic comparison, never by energy alone.
    const energy = rank => rank.reduce((sum, v, i) => sum + v * [1e12, 1e10, 1e9, 1e8, 1e6, 1e4, 1000, 1][i], 0);
    let current = seed, best = seed, currentEnergy = energy(nightRank(seed, n)), bestRank = nightRank(seed, n);
    for (let iteration = 0; iteration < 40000; iteration++) {
        const path = [...current.path], a = Math.floor(random() * path.length), b = Math.floor(random() * path.length);
        if (random() < 0.3) {
            [path[a], path[b]] = [path[b], path[a]];
        }
        else {
            const teams = path[a].groups.flatMap(g => [g.slice(0, 2), g.slice(2)]);
            const options = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]], order = options[Math.floor(random() * 3)];
            const groups = [[...teams[order[0]], ...teams[order[1]]], [...teams[order[2]], ...teams[order[3]]]];
            if (random() < 0.5)
                groups.reverse();
            path[a] = { ...path[a], groups, masks: groups.map(g => g.reduce((m, i) => m | bit(i), 0)) };
        }
        const candidate = evaluate(path), rank = nightRank(candidate, n), value = energy(rank);
        const temperature = 5000000000 * Math.pow(0.0001, (iteration % 10000) / 10000);
        if (value <= currentEnergy || random() < Math.exp((currentEnergy - value) / temperature)) {
            current = candidate;
            currentEnergy = value;
        }
        if (compare(rank, bestRank) < 0) {
            best = candidate;
            bestRank = rank;
        }
        if (iteration % 10000 === 9999) {
            current = best;
            currentEnergy = energy(bestRank);
        }
    }
    return best;
}
export function planBalancedNight({ players, courts = [], matches = [], roundCount = 7, beamWidth = 128 }) {
    const n = players.length;
    if (![8, 9].includes(n) || new Set(players.map(p => String(p.id))).size !== n)
        throw Error('Night balancing requires eight or nine distinct players.');
    const { state, roundNumber } = nightlyHistory(players, matches);
    if (!Number.isInteger(roundCount) || roundCount < 1 || roundCount > 9)
        throw Error('Choose between one and nine rounds for this two-court planner.');
    if (matches.length && roundNumber < roundCount) {
        let fresh = null;
        try { fresh = planBalancedNight({ players, courts, roundCount, beamWidth }); }
        catch (error) { if (error.code !== 'NIGHT_SEARCH_LIMIT') throw error; }
        const unique = new Map();
        for (const m of matches)
            unique.set(`${m.round_number ?? m.roundNumber}:${m.court_number ?? m.courtNumber}`, m);
        const signature = teams => teams.map(t => list(t).sort().join(':')).sort().join('|');
        const verified = fresh && unique.size === roundNumber * 2 && fresh.rounds.slice(0, roundNumber).every(r => r.courts.every((c, i) => {
            const m = unique.get(`${r.roundNumber}:${c.courtNumber}`);
            return m && m.status !== 'not_played' && signature([m.team1_players ?? m.team1, m.team2_players ?? m.team2]) === signature([c.team1, c.team2])
                && list(m.bye_players ?? m.byes).sort().join(':') === list(i === 0 ? r.byes : []).sort().join(':');
        }));
        if (verified)
            return { ...fresh, rounds: fresh.rounds.slice(roundNumber), quality: { ...fresh.quality, basis: 'verified saved-game prefix' } };
    }
    const remaining = Math.max(1, Math.trunc(roundCount) - roundNumber);
    if (remaining > 9)
        throw Error('Choose at most nine rounds for this two-court planner.');
    let beam = [state], quality = null;
    const choices = candidates(n);
    for (let step = 0; step < remaining; step++) {
        const ranked = [];
        for (const current of beam) {
            const local = [];
            for (const c of choices) {
                if (c.pairs.some(p => current.partners[p] > 0))
                    continue;
                if (c.bye >= 0 && current.byes[c.bye] > Math.min(...current.byes))
                    continue;
                const rank = score(current, c);
                if (local.length >= 32 && compare(rank, local[local.length - 1].rank) >= 0)
                    continue;
                local.push({ current, c, rank });
                local.sort((a, b) => compare(a.rank, b.rank));
                if (local.length > 32)
                    local.pop();
            }
            ranked.push(...local);
        }
        ranked.sort((a, b) => compare(a.rank, b.rank));
        if (!ranked.length)
            throw Object.assign(Error('No continuation with unique partners was found within the planning limit. Review prior games or attendance; no repeated partners were assigned.'), {code: 'NIGHT_SEARCH_LIMIT'});
        // Avoid spending the beam on equivalent team ordering/orientation states.
        const seen = new Set();
        beam = [];
        for (const item of ranked) {
            const next = advance(item.current, item.c);
            const key = next.partners.join('') + '|' + next.last.join(',') + '|' + next.previous.join(',');
            if (seen.has(key))
                continue;
            seen.add(key);
            beam.push(next);
            if (beam.length === 1)
                quality = item.rank;
            if (beam.length >= beamWidth)
                break;
        }
    }
    // Court orientation is independent of partners/groups. Search ALL 2^R layouts
    // for each surviving continuation instead of forcing locally balanced prefixes.
    let chosen = null, best = null;
    for (const candidate of beam)
        for (let layout = 0; layout < (1 << remaining); layout++) {
            const counts = [...state.courts];
            const path = candidate.path.map((c, r) => {
                const swap = Boolean(layout & bit(r)), groups = swap ? [c.groups[1], c.groups[0]] : c.groups;
                groups.forEach((g, court) => g.forEach(i => counts[i * 2 + court]++));
                return { ...c, groups, masks: swap ? [c.masks[1], c.masks[0]] : c.masks };
            });
            const excess = players.map((_, i) => Math.floor(Math.abs(counts[i * 2] - counts[i * 2 + 1]) / 2));
            const maxExposure = Math.max(0, ...candidate.groups.values());
            const rank = [candidate.quad, candidate.triple, Math.max(...excess), excess.reduce((a, b) => a + b, 0), candidate.streak, candidate.adjacent, maxExposure, [...candidate.groups.values()].reduce((sum, v) => sum + v * v, 0)];
            if (!best || compare(rank, best) < 0) {
                best = rank;
                chosen = { ...candidate, path, courts: counts };
            }
        }
    chosen = improveNight(state, chosen, n);
    if (!matches.length && remaining <= n - 1 + (n % 2)) {
        // Independent round-robin factorization supplies a second, structurally
        // different unique-partner seed; it is optimized by the same history score.
        const ring = Array.from({ length: n + (n % 2) }, (_, i) => i), seed = [];
        for (let r = 0; r < remaining; r++) {
            const teams = [];
            let bye = -1;
            for (let i = 0; i < ring.length / 2; i++) {
                const a = ring[i], b = ring[ring.length - 1 - i];
                if (a === n || b === n)
                    bye = a === n ? b : a;
                else
                    teams.push([a, b]);
            }
            const groups = [[...teams[0], ...teams[1]], [...teams[2], ...teams[3]]];
            seed.push({ groups, masks: groups.map(g => g.reduce((m, i) => m | bit(i), 0)), pairs: teams.map(([a, b]) => Math.min(a, b) * n + Math.max(a, b)), bye });
            ring.splice(1, 0, ring.pop());
        }
        const alternative = improveNight(state, seed.reduce((s, c) => advance(s, c), state), n);
        if (compare(nightRank(alternative, n), nightRank(chosen, n)) < 0)
            chosen = alternative;
    }
    if (!matches.length && n === 8 && remaining <= 7) {
        const seed = [];
        for (let d = 1; d <= remaining; d++) {
            const teams = Array.from({ length: 8 }, (_, i) => [i, i ^ d]).filter(([a, b]) => a < b);
            const groups = [[...teams[0], ...teams[1]], [...teams[2], ...teams[3]]];
            seed.push({ groups, masks: groups.map(g => g.reduce((m, i) => m | bit(i), 0)), pairs: teams.map(([a, b]) => a * n + b), bye: -1 });
        }
        const alternative = improveNight(state, seed.reduce((s, c) => advance(s, c), state), n);
        if (compare(nightRank(alternative, n), nightRank(chosen, n)) < 0)
            chosen = alternative;
    }
    quality = nightRank(chosen, n);
    return { rounds: chosen.path.map((c, i) => ({ roundNumber: roundNumber + i + 1, courtCount: 2, courts: c.groups.map((g, j) => ({ courtNumber: j + 1, courtName: courts[j]?.name || `Court ${j + 1}`, courtDescription: courts[j]?.description || courts[j]?.desc || '', team1: g.slice(0, 2).map(k => players[k]), team2: g.slice(2).map(k => players[k]) })), byes: c.bye < 0 ? [] : [players[c.bye]] })), quality: { uniquePartners: true, search: 'bounded', summary: `New assignments do not repeat a partner. ${quality[2] === 0 ? 'Planned court use differs by at most one game per player.' : 'The best continuation found still has uneven court use.'} ${quality[1] === 0 ? 'No consecutive groups of three or four in the planned continuation.' : 'Some consecutive groups of three or four remain in the best continuation found.'} Some repeated same-court pairs may remain.`, score: quality, courtCounts: players.map((p, i) => ({ playerId: p.id, counts: chosen.courts.slice(i * 2, i * 2 + 2) })), consecutiveGroupOfFourPlayerExposures: chosen.quad, consecutiveGroupOfThreePlayerExposures: chosen.triple, threeAppearancePairPlayerExposures: chosen.streak, maxSharedCourtGames: quality[6] } };
}
