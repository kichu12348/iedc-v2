"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./admin.module.css";

// ── Types ──
interface Match {
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface KnockoutMatch extends Match {
  id: string;
  label: string;
}

interface TeamStanding {
  team: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

interface TournamentData {
  tournamentName: string;
  groups: Record<string, { teams: string[]; matches: Match[] }>;
  knockout: {
    quarterFinals: KnockoutMatch[];
    semiFinals: KnockoutMatch[];
    thirdPlace?: KnockoutMatch;
    final: KnockoutMatch;
  };
}

function calculateStandings(
  teams: string[],
  matches: Match[],
): TeamStanding[] {
  const map: Record<string, TeamStanding> = {};

  for (const t of teams) {
    map[t] = { team: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null || m.status === "upcoming")
      continue;

    const home = map[m.home];
    const away = map[m.away];
    if (!home || !away) continue;

    home.mp++;
    away.mp++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (m.homeScore < m.awayScore) {
      away.w++;
      away.pts += 3;
      home.l++;
    } else {
      home.d++;
      away.d++;
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const t of Object.values(map)) {
    t.gd = t.gf - t.ga;
  }

  return Object.values(map).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
}

const ADMIN_PASS = "iedc2026";

export default function EFootballAdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [activeTab, setActiveTab] = useState<"groups" | "knockout">("groups");
  const [activeGroup, setActiveGroup] = useState("A");
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editHome, setEditHome] = useState("");
  const [editAway, setEditAway] = useState("");
  const [editHomeName, setEditHomeName] = useState("");
  const [editAwayName, setEditAwayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ── Auth ──
  const handleLogin = () => {
    if (passInput === ADMIN_PASS) {
      setIsAuthed(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/efootball/tournament");
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (isAuthed) fetchData();
  }, [isAuthed, fetchData]);

  const groups = tournament?.groups ?? {};
  const knockout = tournament?.knockout;

  // Compute standings for all groups
  const groupStandings = useMemo(() => {
    const result: Record<string, TeamStanding[]> = {};
    for (const [groupName, groupData] of Object.entries(groups)) {
      result[groupName] = calculateStandings(
        groupData.teams,
        groupData.matches,
      );
    }
    return result;
  }, [groups]);

  // Auto-resolve knockout placeholder names
  const resolveName = useCallback(
    (name: string): string => {
      if (!knockout) return name;

      const groupMatch = name.match(/^Group\s+([A-D])\s+#(\d)$/i);
      if (groupMatch) {
        const grp = groupMatch[1].toUpperCase();
        const pos = parseInt(groupMatch[2]) - 1;
        const standings = groupStandings[grp];
        if (standings && standings[pos] && standings[pos].mp > 0) {
          return standings[pos].team;
        }
        return name;
      }

      const winnerMatch = name.match(/^Winner\s+(QF\d|SF\d)$/i);
      if (winnerMatch) {
        const matchId = winnerMatch[1].toUpperCase();
        let sourceMatch: KnockoutMatch | undefined;

        if (matchId.startsWith("QF")) {
          sourceMatch = knockout.quarterFinals.find((m) => m.id === matchId);
        } else if (matchId.startsWith("SF")) {
          sourceMatch = knockout.semiFinals.find((m) => m.id === matchId);
        }

        if (
          sourceMatch &&
          sourceMatch.status === "ft" &&
          sourceMatch.homeScore !== null &&
          sourceMatch.awayScore !== null
        ) {
          const homeResolved = resolveName(sourceMatch.home);
          const awayResolved = resolveName(sourceMatch.away);
          return sourceMatch.homeScore > sourceMatch.awayScore
            ? homeResolved
            : awayResolved;
        }
        return name;
      }

      const loserMatch = name.match(/^Loser\s+(SF\d)$/i);
      if (loserMatch) {
        const matchId = loserMatch[1].toUpperCase();
        const sourceMatch = knockout.semiFinals.find((m) => m.id === matchId);

        if (
          sourceMatch &&
          sourceMatch.status === "ft" &&
          sourceMatch.homeScore !== null &&
          sourceMatch.awayScore !== null
        ) {
          const homeResolved = resolveName(sourceMatch.home);
          const awayResolved = resolveName(sourceMatch.away);
          return sourceMatch.homeScore < sourceMatch.awayScore
            ? homeResolved
            : awayResolved;
        }
        return name;
      }

      return name;
    },
    [groupStandings, knockout],
  );

  // ── Toast ──
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Save group match ──
  const saveGroupMatch = async (group: string, matchIndex: number) => {
    const homeScore = parseInt(editHome);
    const awayScore = parseInt(editAway);
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      showToast("Enter valid scores", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/efootball/tournament/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "group",
          group,
          matchIndex,
          homeScore,
          awayScore,
          status: "ft",
        }),
      });

      if (res.ok) {
        showToast("Score saved!", "success");
        setEditingMatch(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save knockout match ──
  const saveKnockoutMatch = async (
    round: string,
    matchId?: string,
  ) => {
    const homeScore = parseInt(editHome);
    const awayScore = parseInt(editAway);
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      showToast("Enter valid scores", "error");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        stage: "knockout",
        round,
        homeScore,
        awayScore,
        status: "ft",
      };
      if (matchId) body.matchId = matchId;
      if (editHomeName.trim()) body.home = editHomeName.trim();
      if (editAwayName.trim()) body.away = editAwayName.trim();

      const res = await fetch("/api/efootball/tournament/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast("Score saved!", "success");
        setEditingMatch(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Update knockout player names only ──
  const saveKnockoutNames = async (
    round: string,
    matchId?: string,
  ) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        stage: "knockout",
        round,
      };
      if (matchId) body.matchId = matchId;
      if (editHomeName.trim()) body.home = editHomeName.trim();
      if (editAwayName.trim()) body.away = editAwayName.trim();

      const res = await fetch("/api/efootball/tournament/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast("Names updated!", "success");
        setEditingMatch(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Start editing ──
  const startEdit = (
    key: string,
    m: Match | KnockoutMatch,
  ) => {
    setEditingMatch(key);
    setEditHome(m.homeScore !== null ? String(m.homeScore) : "");
    setEditAway(m.awayScore !== null ? String(m.awayScore) : "");
    setEditHomeName(resolveName(m.home));
    setEditAwayName(resolveName(m.away));
  };

  // ── Login screen ──
  if (!isAuthed) {
    return (
      <main className={styles.adminPage}>
        <div className={styles.loginGate}>
          <span className={styles.loginTitle}>
            ⚡ eFootball Admin
          </span>
          <input
            className={styles.loginInput}
            type="password"
            placeholder="Enter password"
            value={passInput}
            onChange={(e) => {
              setPassInput(e.target.value);
              setPassError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
          <button className={styles.loginBtn} onClick={handleLogin} type="button">
            Unlock
          </button>
          {passError && (
            <span className={styles.loginError}>Wrong password</span>
          )}
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className={styles.adminPage}>
        <p style={{ color: "#555", fontFamily: "monospace" }}>Loading...</p>
      </main>
    );
  }

  const groupNames = Object.keys(tournament.groups);

  // ── Render group match card ──
  const renderGroupMatch = (
    m: Match,
    idx: number,
    group: string,
  ) => {
    const key = `group-${group}-${idx}`;
    const isEditing = editingMatch === key;
    const isCompleted = m.status === "ft";

    return (
      <div
        key={key}
        className={`${styles.matchCard} ${isCompleted ? styles.matchCardCompleted : ""} ${isEditing ? styles.matchCardEditing : ""}`}
      >
        <div className={styles.matchMeta}>
          <span className={styles.matchNum}>Match {idx + 1}</span>
          <span
            className={`${styles.matchStatus} ${isCompleted ? styles.matchStatusFt : styles.matchStatusUpcoming}`}
          >
            {isCompleted ? "FT" : "Upcoming"}
          </span>
        </div>

        <div className={styles.matchPlayers}>
          <span
            className={`${styles.matchPlayerName} ${styles.matchPlayerNameHome}`}
          >
            {m.home}
          </span>
          {isCompleted && !isEditing ? (
            <div className={styles.matchScoreDisplay}>
              <span className={styles.matchScoreNum}>{m.homeScore}</span>
              <span className={styles.matchScoreDash}>–</span>
              <span className={styles.matchScoreNum}>{m.awayScore}</span>
            </div>
          ) : (
            <span className={styles.matchVs}>vs</span>
          )}
          <span
            className={`${styles.matchPlayerName} ${styles.matchPlayerNameAway}`}
          >
            {m.away}
          </span>
        </div>

        {isEditing ? (
          <>
            <div className={styles.editRow}>
              <input
                className={styles.scoreInput}
                type="number"
                min="0"
                value={editHome}
                onChange={(e) => setEditHome(e.target.value)}
                placeholder="0"
                autoFocus
                inputMode="numeric"
              />
              <span className={styles.editDash}>–</span>
              <input
                className={styles.scoreInput}
                type="number"
                min="0"
                value={editAway}
                onChange={(e) => setEditAway(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div className={styles.editBtnRow}>
              <button
                className={styles.saveBtn}
                onClick={() => saveGroupMatch(group, idx)}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setEditingMatch(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className={styles.editTrigger}>
            <button
              className={styles.tapToEdit}
              onClick={() => startEdit(key, m)}
              type="button"
            >
              {isCompleted ? "Tap to edit score" : "Tap to enter score"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render knockout match card ──
  const renderKnockoutMatch = (
    m: KnockoutMatch,
    round: string,
  ) => {
    const key = `ko-${round}-${m.id}`;
    const isEditing = editingMatch === key;
    const isCompleted = m.status === "ft";
    const isSingleMatch = round === "thirdPlace" || round === "final";

    const homeName = resolveName(m.home);
    const awayName = resolveName(m.away);

    return (
      <div
        key={key}
        className={`${styles.matchCard} ${isCompleted ? styles.matchCardCompleted : ""} ${isEditing ? styles.matchCardEditing : ""}`}
      >
        <div className={styles.matchMeta}>
          <span className={styles.matchNum}>{m.label}</span>
          <span
            className={`${styles.matchStatus} ${isCompleted ? styles.matchStatusFt : styles.matchStatusUpcoming}`}
          >
            {isCompleted ? "FT" : "Upcoming"}
          </span>
        </div>

        <div className={styles.matchPlayers}>
          <span
            className={`${styles.matchPlayerName} ${styles.matchPlayerNameHome}`}
          >
            {homeName}
          </span>
          {isCompleted && !isEditing ? (
            <div className={styles.matchScoreDisplay}>
              <span className={styles.matchScoreNum}>{m.homeScore}</span>
              <span className={styles.matchScoreDash}>–</span>
              <span className={styles.matchScoreNum}>{m.awayScore}</span>
            </div>
          ) : (
            <span className={styles.matchVs}>vs</span>
          )}
          <span
            className={`${styles.matchPlayerName} ${styles.matchPlayerNameAway}`}
          >
            {awayName}
          </span>
        </div>

        {isEditing ? (
          <>
            {/* Player name editing for knockout progression */}
            <div className={styles.nameInputRow}>
              <span className={styles.nameLabel}>P1</span>
              <input
                className={styles.nameInput}
                type="text"
                value={editHomeName}
                onChange={(e) => setEditHomeName(e.target.value)}
                placeholder="Player 1 name"
              />
            </div>
            <div className={styles.nameInputRow}>
              <span className={styles.nameLabel}>P2</span>
              <input
                className={styles.nameInput}
                type="text"
                value={editAwayName}
                onChange={(e) => setEditAwayName(e.target.value)}
                placeholder="Player 2 name"
              />
            </div>

            <div className={styles.editRow}>
              <input
                className={styles.scoreInput}
                type="number"
                min="0"
                value={editHome}
                onChange={(e) => setEditHome(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
              <span className={styles.editDash}>–</span>
              <input
                className={styles.scoreInput}
                type="number"
                min="0"
                value={editAway}
                onChange={(e) => setEditAway(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div className={styles.editBtnRow}>
              <button
                className={styles.saveBtn}
                onClick={() =>
                  saveKnockoutMatch(
                    round,
                    isSingleMatch ? undefined : m.id,
                  )
                }
                disabled={saving}
                type="button"
              >
                {saving ? "Saving..." : "Save Score"}
              </button>
              <button
                className={styles.saveBtn}
                onClick={() =>
                  saveKnockoutNames(
                    round,
                    isSingleMatch ? undefined : m.id,
                  )
                }
                disabled={saving}
                type="button"
                style={{ background: "#333", color: "#ddd" }}
              >
                Save Names Only
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setEditingMatch(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className={styles.editTrigger}>
            <button
              className={styles.tapToEdit}
              onClick={() => startEdit(key, m)}
              type="button"
            >
              {isCompleted ? "Tap to edit" : "Tap to update"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className={styles.adminPage}>
      <div className={styles.adminContainer}>
        {/* Header */}
        <div className={styles.adminHeader}>
          <span className={styles.adminTitle}>⚡ eFootball Admin</span>
          <button
            className={styles.logoutBtn}
            onClick={() => {
              setIsAuthed(false);
              setPassInput("");
            }}
            type="button"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.adminTabs}>
          <button
            className={`${styles.adminTab} ${activeTab === "groups" ? styles.adminTabActive : ""}`}
            onClick={() => setActiveTab("groups")}
            type="button"
          >
            Groups
          </button>
          <button
            className={`${styles.adminTab} ${activeTab === "knockout" ? styles.adminTabActive : ""}`}
            onClick={() => setActiveTab("knockout")}
            type="button"
          >
            Knockout
          </button>
        </div>

        {/* Group Stage */}
        {activeTab === "groups" && (
          <>
            <div className={styles.groupSelector}>
              {groupNames.map((g) => (
                <button
                  key={g}
                  className={`${styles.groupBtn} ${activeGroup === g ? styles.groupBtnActive : ""}`}
                  onClick={() => {
                    setActiveGroup(g);
                    setEditingMatch(null);
                  }}
                  type="button"
                >
                  Group {g}
                </button>
              ))}
            </div>

            <div className={styles.matchList}>
              {tournament.groups[activeGroup]?.matches.map((m, idx) =>
                renderGroupMatch(m, idx, activeGroup),
              )}
            </div>
          </>
        )}

        {/* Knockout Stage */}
        {activeTab === "knockout" && (
          <div>
            <div className={styles.knockoutRoundAdmin}>
              <div className={styles.roundTitleAdmin}>Quarter-finals</div>
              <div className={styles.matchList}>
                {tournament.knockout.quarterFinals.map((m) =>
                  renderKnockoutMatch(m, "quarterFinals"),
                )}
              </div>
            </div>

            <div className={styles.knockoutRoundAdmin}>
              <div className={styles.roundTitleAdmin}>Semi-finals</div>
              <div className={styles.matchList}>
                {tournament.knockout.semiFinals.map((m) =>
                  renderKnockoutMatch(m, "semiFinals"),
                )}
              </div>
            </div>

            {tournament.knockout.thirdPlace && (
              <div className={styles.knockoutRoundAdmin}>
                <div className={styles.roundTitleAdmin}>
                  3rd Place Play-off
                </div>
                <div className={styles.matchList}>
                  {renderKnockoutMatch(
                    tournament.knockout.thirdPlace,
                    "thirdPlace",
                  )}
                </div>
              </div>
            )}

            <div className={styles.knockoutRoundAdmin}>
              <div className={styles.roundTitleAdmin}>Grand Final</div>
              <div className={styles.matchList}>
                {renderKnockoutMatch(
                  tournament.knockout.final,
                  "final",
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.msg}
        </div>
      )}
    </main>
  );
}
