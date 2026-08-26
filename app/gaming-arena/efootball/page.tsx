"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import styles from "./efootball.module.css";

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

// ── Standings Calculator ──
function calculateStandings(
  teams: string[],
  matches: Match[],
): TeamStanding[] {
  const map: Record<string, TeamStanding> = {};

  for (const t of teams) {
    map[t] = {
      team: t,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    };
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

// ── Component ──
export default function EFootballTournamentPage() {
  const [activeTab, setActiveTab] = useState<"groups" | "knockout">("groups");
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/efootball/tournament");
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Determine match winner/loser highlighting
  const getMatchHighlight = (m: Match) => {
    if (m.homeScore === null || m.awayScore === null)
      return { home: "", away: "" };
    if (m.homeScore > m.awayScore)
      return { home: styles.winnerHighlight, away: styles.loserDim };
    if (m.homeScore < m.awayScore)
      return { home: styles.loserDim, away: styles.winnerHighlight };
    return { home: "", away: "" };
  };

  const renderKnockoutCard = (
    match: KnockoutMatch,
    isFinal: boolean = false,
  ) => {
    const isPlayed =
      match.homeScore !== null &&
      match.awayScore !== null &&
      match.status === "ft";
    const homeWins =
      isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0);
    const awayWins =
      isPlayed && (match.awayScore ?? 0) > (match.homeScore ?? 0);

    return (
      <div
        key={match.id}
        className={`${styles.knockoutCard} ${isFinal ? styles.finalCard : ""}`}
      >
        <div
          className={`${styles.knockoutCardHeader} ${isFinal ? styles.finalCardHeader : ""}`}
        >
          <span
            className={`${styles.knockoutLabel} ${isFinal ? styles.finalLabel : ""}`}
          >
            {match.label}
          </span>
          {isPlayed && (
            <span className={`${styles.statusBadge} ${styles.statusFt}`}>
              FT
            </span>
          )}
          {!isPlayed && (
            <span
              className={`${styles.statusBadge} ${styles.statusUpcoming}`}
            >
              Upcoming
            </span>
          )}
        </div>
        <div
          className={`${styles.knockoutRow} ${homeWins ? styles.knockoutRowWinner : ""} ${awayWins ? styles.knockoutRowLoser : ""}`}
        >
          <span
            className={`${styles.knockoutTeam} ${
              !isPlayed &&
              (match.home.includes("Winner") ||
                match.home.includes("Loser") ||
                match.home.includes("Group"))
                ? styles.knockoutTeamPlaceholder
                : ""
            }`}
          >
            {match.home}
          </span>
          <span
            className={`${styles.knockoutScore} ${!isPlayed ? styles.knockoutScorePending : ""}`}
          >
            {match.homeScore ?? "-"}
          </span>
        </div>
        <div
          className={`${styles.knockoutRow} ${awayWins ? styles.knockoutRowWinner : ""} ${homeWins ? styles.knockoutRowLoser : ""}`}
        >
          <span
            className={`${styles.knockoutTeam} ${
              !isPlayed &&
              (match.away.includes("Winner") ||
                match.away.includes("Loser") ||
                match.away.includes("Group"))
                ? styles.knockoutTeamPlaceholder
                : ""
            }`}
          >
            {match.away}
          </span>
          <span
            className={`${styles.knockoutScore} ${!isPlayed ? styles.knockoutScorePending : ""}`}
          >
            {match.awayScore ?? "-"}
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <Navbar isMenuShown={false} />
        <main className={styles.tournamentPage}>
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.loadingState}>
                <span className={styles.loadingSpinner} />
                <p>Loading tournament data...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <Navbar isMenuShown={false} />
        <main className={styles.tournamentPage}>
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.loadingState}>
                <p>Failed to load tournament data.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar isMenuShown={false} />
      <main className={styles.tournamentPage}>
        <div className={styles.container}>
          <div className={styles.card}>
            {/* Header */}
            <div className={styles.header}>
              <span className={styles.eventBadge}>Gaming Arena '26</span>
              <h1 className={styles.title}>eFootball Championship</h1>
              <p className={styles.subtitle}>
                Official tournament schedule, live standings, and knockout
                bracket. Points: Win&nbsp;=&nbsp;3, Draw&nbsp;=&nbsp;1,
                Loss&nbsp;=&nbsp;0. Top 2 in each group advance to
                Quarter-finals.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className={styles.tabSwitcher}>
              <button
                className={`${styles.tab} ${activeTab === "groups" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("groups")}
                type="button"
              >
                Group Stage
              </button>
              <button
                className={`${styles.tab} ${activeTab === "knockout" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("knockout")}
                type="button"
              >
                Knockout Stage
              </button>
            </div>

            {/* Group Stage */}
            {activeTab === "groups" && (
              <div>
                {/* ── 2×2 Standings Grid ── */}
                <div className={styles.standingsGrid}>
                  {Object.entries(groupStandings).map(
                    ([groupName, standings]) => (
                      <div key={groupName} className={styles.standingsGridCell}>
                        <h3 className={styles.gridGroupTitle}>
                          Group {groupName}
                        </h3>
                        <table className={styles.standingsTable}>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Player</th>
                              <th>MP</th>
                              <th>W</th>
                              <th>D</th>
                              <th>L</th>
                              <th>GF</th>
                              <th>GA</th>
                              <th>GD</th>
                              <th>PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((s, idx) => (
                              <tr
                                key={s.team}
                                className={
                                  idx < 2 ? styles.qualifiedRow : ""
                                }
                              >
                                <td>{idx + 1}</td>
                                <td>
                                  {idx < 2 && (
                                    <span
                                      className={
                                        styles.qualifiedIndicator
                                      }
                                    />
                                  )}
                                  {s.team}
                                </td>
                                <td>{s.mp}</td>
                                <td>{s.w}</td>
                                <td>{s.d}</td>
                                <td>{s.l}</td>
                                <td>{s.gf}</td>
                                <td>{s.ga}</td>
                                <td>
                                  {s.gd > 0 ? `+${s.gd}` : s.gd}
                                </td>
                                <td className={styles.pointsCell}>
                                  {s.pts}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ),
                  )}
                </div>

                {/* ── Fixtures per Group ── */}
                {Object.entries(groups).map(
                  ([groupName, groupData], gi) => (
                    <div key={groupName} className={styles.groupBlock}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.sectionNum}>
                          {String(gi + 1).padStart(2, "0")}
                        </span>
                        <h2 className={styles.sectionTitle}>
                          Group {groupName} Fixtures
                        </h2>
                      </div>

                      <div className={styles.fixturesBlock}>
                        <div className={styles.fixturesList}>
                          {groupData.matches.map((m, mi) => {
                            const highlight = getMatchHighlight(m);
                            const isPlayed =
                              m.homeScore !== null &&
                              m.awayScore !== null &&
                              m.status !== "upcoming";

                            return (
                              <div
                                key={mi}
                                className={`${styles.fixtureCard} ${isPlayed ? styles.fixtureCardFt : ""}`}
                              >
                                <span
                                  className={`${styles.fixtureHome} ${highlight.home}`}
                                >
                                  {m.home}
                                </span>
                                <div className={styles.fixtureScore}>
                                  {isPlayed ? (
                                    <>
                                      <span className={styles.scoreValue}>
                                        {m.homeScore}
                                      </span>
                                      <span
                                        className={styles.scoreDivider}
                                      >
                                        –
                                      </span>
                                      <span className={styles.scoreValue}>
                                        {m.awayScore}
                                      </span>
                                    </>
                                  ) : (
                                    <span className={styles.upcomingText}>
                                      vs
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`${styles.fixtureAway} ${highlight.away}`}
                                >
                                  {m.away}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Knockout Stage */}
            {activeTab === "knockout" && knockout && (
              <div className={styles.knockoutSection}>
                {/* Quarter-finals */}
                <div className={styles.knockoutRound}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionNum}>01</span>
                    <h2 className={styles.sectionTitle}>Quarter-finals</h2>
                  </div>
                  <div className={styles.knockoutGrid}>
                    {knockout.quarterFinals.map((m) =>
                      renderKnockoutCard(m),
                    )}
                  </div>
                </div>

                {/* Semi-finals */}
                <div className={styles.knockoutRound}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionNum}>02</span>
                    <h2 className={styles.sectionTitle}>Semi-finals</h2>
                  </div>
                  <div className={styles.knockoutGrid}>
                    {knockout.semiFinals.map((m) => renderKnockoutCard(m))}
                  </div>
                </div>

                {/* 3rd Place */}
                {knockout.thirdPlace && (
                  <div className={styles.knockoutRound}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionNum}>03</span>
                      <h2 className={styles.sectionTitle}>
                        3rd Place Play-off
                      </h2>
                    </div>
                    <div className={styles.knockoutGrid}>
                      {renderKnockoutCard(knockout.thirdPlace)}
                    </div>
                  </div>
                )}

                {/* Grand Final */}
                <div className={styles.knockoutRound}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionNum}>
                      {knockout.thirdPlace ? "04" : "03"}
                    </span>
                    <h2 className={styles.sectionTitle}>Grand Final</h2>
                  </div>
                  <div className={styles.knockoutGrid}>
                    {renderKnockoutCard(knockout.final, true)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
