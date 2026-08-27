import { NextRequest, NextResponse } from "next/server";

const NPOINT_URL = "https://api.npoint.io/d9d956517b1027a084a8";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders() });
}

/**
 * PATCH /api/efootball/tournament/match
 *
 * Update a single match score. Body schema:
 *
 * For GROUP matches:
 * {
 *   "stage": "group",
 *   "group": "A",
 *   "matchIndex": 0,
 *   "homeScore": 3,
 *   "awayScore": 1,
 *   "status": "ft"
 * }
 *
 * For KNOCKOUT matches:
 * {
 *   "stage": "knockout",
 *   "round": "quarterFinals" | "semiFinals" | "thirdPlace" | "final",
 *   "matchId": "QF1",       // only for array rounds (quarterFinals, semiFinals)
 *   "home": "Player Name",  // optional: update participant name (for knockout progression)
 *   "away": "Player Name",  // optional: update participant name
 *   "homeScore": 2,
 *   "awayScore": 0,
 *   "status": "ft"
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Fetch current data from npoint
    const fetchRes = await fetch(NPOINT_URL, { cache: "no-store" });
    if (!fetchRes.ok) {
      throw new Error("Failed to fetch current tournament data.");
    }
    const data = await fetchRes.json();

    if (body.stage === "group") {
      const { group, matchIndex, homeScore, awayScore, status } = body;

      if (!group || matchIndex === undefined) {
        return NextResponse.json(
          { error: "Missing 'group' or 'matchIndex'." },
          { status: 400, headers: corsHeaders() },
        );
      }

      if (!data.groups[group]) {
        return NextResponse.json(
          { error: `Group '${group}' not found.` },
          { status: 404, headers: corsHeaders() },
        );
      }

      const matches = data.groups[group].matches;
      if (matchIndex < 0 || matchIndex >= matches.length) {
        return NextResponse.json(
          { error: `matchIndex ${matchIndex} out of range (0-${matches.length - 1}).` },
          { status: 400, headers: corsHeaders() },
        );
      }

      if (homeScore !== undefined) matches[matchIndex].homeScore = homeScore;
      if (awayScore !== undefined) matches[matchIndex].awayScore = awayScore;
      if (status) matches[matchIndex].status = status;

    } else if (body.stage === "knockout") {
      const { round, matchId, home, away, homeScore, awayScore, status } = body;

      if (!round) {
        return NextResponse.json(
          { error: "Missing 'round'." },
          { status: 400, headers: corsHeaders() },
        );
      }

      // thirdPlace and final are single objects
      if (round === "thirdPlace" || round === "final") {
        const match = data.knockout[round];
        if (!match) {
          return NextResponse.json(
            { error: `Round '${round}' not found.` },
            { status: 404, headers: corsHeaders() },
          );
        }
        if (home !== undefined) match.home = home;
        if (away !== undefined) match.away = away;
        if (homeScore !== undefined) match.homeScore = homeScore;
        if (awayScore !== undefined) match.awayScore = awayScore;
        if (status) match.status = status;
      } else {
        // quarterFinals, semiFinals are arrays
        const matchArr = data.knockout[round];
        if (!matchArr || !Array.isArray(matchArr)) {
          return NextResponse.json(
            { error: `Round '${round}' not found or not an array.` },
            { status: 404, headers: corsHeaders() },
          );
        }
        const match = matchArr.find(
          (m: { id: string }) => m.id === matchId,
        );
        if (!match) {
          return NextResponse.json(
            { error: `Match '${matchId}' not found in '${round}'.` },
            { status: 404, headers: corsHeaders() },
          );
        }
        if (home !== undefined) match.home = home;
        if (away !== undefined) match.away = away;
        if (homeScore !== undefined) match.homeScore = homeScore;
        if (awayScore !== undefined) match.awayScore = awayScore;
        if (status) match.status = status;
      }
    } else {
      return NextResponse.json(
        { error: "Invalid 'stage'. Use 'group' or 'knockout'." },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Save updated data back to npoint
    const saveRes = await fetch(NPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!saveRes.ok) {
      throw new Error("Failed to save tournament data.");
    }

    return NextResponse.json(
      { success: true, message: "Match score updated." },
      { headers: corsHeaders() },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to update match score." },
      { status: 500, headers: corsHeaders() },
    );
  }
}
