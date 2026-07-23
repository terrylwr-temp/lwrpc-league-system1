"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { hasRole, roleLabel } from "../../lib/permissions";
import { formatDisplayTimestampShort } from "../../lib/dateTime";
import DashboardProfileDialog from "../../components/DashboardProfileDialog";
import DivisionStandingsBarChart from "../../components/DivisionStandingsBarChart";
import styles from "../page.module.css";
import { useDashboardAppearance } from "../DashboardAppearanceControls";
import { standingsTiebreakLabels } from "../../lib/standingsTiebreaks";
import captainStyles from "./captain.module.css";

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  team: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 7a3 3 0 0 1 0 6m-1 2a5 5 0 0 1 5 5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18"/></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 13v4m-4 3h8"/></>,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  verify: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2m-6 6h6m-6 4h6"/></>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.2-1.5 2.7m0 3.5h.01"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  external: <><path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v6H5V6h6"/></>,
  logout: <><path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function displayName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || person?.full_name || person?.email || "Member";
}

function initialsFor(person) {
  return displayName(person).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

function profilePhotoUrl(person) {
  const urls = Array.isArray(person?.profile_image_urls) ? person.profile_image_urls : [];
  return urls.find((url) => String(url).includes("/storage/v1/object/public/profile-photos/")) || "";
}

function Avatar({ person }) {
  const imageUrl = profilePhotoUrl(person);
  return <span className={`${styles.avatar} ${styles.userAvatar} ${styles.blue}`}>{imageUrl ? <Image src={imageUrl} width={80} height={80} alt={`${displayName(person)} profile`} unoptimized/> : initialsFor(person)}</span>;
}

function shortDate(value) {
  if (!value) return { label: "Date TBD", day: "--", month: "TBD" };
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { label: value, day: "--", month: "TBD" };
  return { label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), day: String(date.getDate()).padStart(2, "0"), month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase() };
}

function shortTime(value) {
  if (!value) return "Time TBD";
  const [hours, minutes] = String(value).split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes || 0));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function resultScoreStatusLabel(match) {
  const status = match?.score_status || "not_entered";

  if (status === "verified") return "";
  if (status === "pending_verification") return "Score Details Awaiting Verification";
  if (status === "disputed") return "Score Details Disputed";
  if (match?.score_entered_at) return "Score Details Not Verified";
  return "Score Details Not Entered";
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function opponentFor(match, teamId) {
  if (!match) return "Schedule pending";
  return String(match.home_team_id) === String(teamId) ? match.away_team?.name || "Away Team" : match.home_team?.name || "Home Team";
}

function Heading({ eyebrow, title, hint, action, onAction, meta }) {
  return <div className={styles.heading}><div><span>{eyebrow}</span><h3>{title}</h3>{hint && <p className={styles.headingHint}>{hint}</p>}</div><div className={styles.headingAside}>{meta && <span className={styles.headingMeta}><small>{meta.label}</small><strong>{meta.value}</strong></span>}{action && <button type="button" onClick={onAction}>{action}<Icon name="arrow" size={15}/></button>}</div></div>;
}

export default function CaptainDesignPreviewView({ dashboard = {} }) {
  const member = dashboard.member || null;
  const role = dashboard.role || "captain";
  const teams = dashboard.teams || [];
  const selectedTeam = dashboard.selectedTeam || teams[0] || null;
  const teamId = selectedTeam?.id;
  const teamName = selectedTeam?.name || "No active team";
  const leagueName = selectedTeam?.divisions?.leagues?.name || "League";
  const seasonName = dashboard.seasonName || selectedTeam?.divisions?.leagues?.seasons?.name || "Not selected";
  const divisionName = selectedTeam?.divisions?.name || "Division";
  const stats = dashboard.teamStats?.[teamId] || {};
  const standing = stats.standing || null;
  const upcomingItems = dashboard.upcomingItems || [];
  const upcomingMatchCount = upcomingItems.filter((item) => item.type === "match").length;
  const nextMatch = upcomingItems.find((item) => item.type === "match")?.data || null;
  const nextDate = shortDate(nextMatch?.scheduled_date);
  const selectedIsHome = nextMatch && String(nextMatch.home_team_id) === String(teamId);
  const leaders = dashboard.standingsLeaders || [];
  const standingsMaximum = Math.max(1, ...leaders.map((leader) => Number(leader.chartValue || 0)));
  const documents = (dashboard.leagueDocuments || []).filter((document) => document.available);
  const completedMatches = dashboard.completedMatches || [];
  const scoreMembersById = dashboard.scoreMembersById || {};
  const pendingScoreActions = dashboard.pendingScoreEntryOrVerification || [];
  const canUseAdminDashboard = hasRole(role, "league_manager");
  const playoffTeamCount = Math.max(0, Number(selectedTeam?.divisions?.playoff_team_count || 0));
  const playoffTeamIds = new Set(leaders.slice(0, playoffTeamCount).map((leader) => String(leader.teamId || leader.id)));
  const standingsTiebreakText = standingsTiebreakLabels(selectedTeam?.divisions).join(" \u2192 ");
  const setupTeamsFor = (match) => match ? [
    { id: match.home_team_id, name: match.home_team?.name || "Home", side: "Home" },
    { id: match.away_team_id, name: match.away_team?.name || "Away", side: "Away" },
  ].filter((team) => team.id) : [];
  const captainSetupTeamsFor = (match) => setupTeamsFor(match).filter((setupTeam) => teams.some((team) => String(team.id) === String(setupTeam.id)));
  const setupStatusFor = (match, setupTeamId) => dashboard.matchSetupStatus?.[String(match?.id) + ":" + String(setupTeamId)] || null;
  const bothTeamsSetupCompleteFor = (match) => {
    const matchTeams = setupTeamsFor(match);
    return matchTeams.length === 2 && matchTeams.every((setupTeam) => setupStatusFor(match, setupTeam.id)?.complete === true);
  };
  const canEnterScoresFor = (match) => Boolean(match?.scheduled_date && match.scheduled_date <= localDateString());
  const scoreHasBeenEnteredFor = (match) => Boolean(match && ((match.score_status || "not_entered") !== "not_entered" || match.score_entered_at || match.score_verified_at));
  const scoreEntryToneFor = (match) => canEnterScoresFor(match) && !scoreHasBeenEnteredFor(match) && match?.scheduled_date < localDateString() ? captainStyles.dangerAction : captainStyles.blueAction;
  const flexScheduleAvailableFor = (match) => dashboard.canShowFlexScheduleControl?.(match) === true;
  const flexScheduleAllowedFor = (match) => dashboard.canManageFlexSchedule?.(match) === true;
  const setupTeams = setupTeamsFor(nextMatch);
  const captainSetupTeams = captainSetupTeamsFor(nextMatch);
  const bothTeamsSetupComplete = bothTeamsSetupCompleteFor(nextMatch);
  const canEnterScores = canEnterScoresFor(nextMatch);
  const scoreEntryTone = scoreEntryToneFor(nextMatch);

  const currentYear = new Date().getFullYear();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedMenu, setExpandedMenu] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [matchToolsMatch, setMatchToolsMatch] = useState(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const appearance = useDashboardAppearance();
  const orderedCompletedMatches = [...completedMatches].sort((a, b) => String(b.scheduled_date || "").localeCompare(String(a.scheduled_date || "")));
  const visibleUpcomingItems = showAllUpcoming ? upcomingItems : upcomingItems.slice(0, 4);
  const visibleCompletedMatches = showAllResults ? orderedCompletedMatches : orderedCompletedMatches.slice(0, 3);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      setExpandedMenu("");
      setMobileMenuOpen(false);
      setProfileOpen(false);
      setStandingsOpen(false);
      setMatchToolsMatch(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function goToSection(section) {
    setActiveSection(section);
    setExpandedMenu("");
    document.getElementById(`captain-preview-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openNavigationSection(section) {
    setActiveSection(section);
    setExpandedMenu("");
    if (section === "standings") {
      setStandingsOpen(true);
      return;
    }
    goToSection(section);
  }

  function selectTeam(team) {
    dashboard.onSelectTeam?.(team.id);
    setExpandedMenu("");
  }

  const navButton = (section, label, icon, detail = "", onClick, expandable = false) => <button type="button" className={activeSection === section ? styles.active : ""} aria-expanded={expandable ? expandedMenu === section : undefined} onClick={onClick || (() => goToSection(section))}><Icon name={icon}/><span><b>{label}</b>{detail && <small>{detail}</small>}</span></button>;

  function renderMatchSetupStatus(match, dialog = false) {
    if (!match) return null;
    const matchSetupTeams = setupTeamsFor(match);
    const accessibleSetupTeams = captainSetupTeamsFor(match);
    const className = [captainStyles.matchSetupPanel, dialog ? captainStyles.dialogMatchSetupPanel : ""].filter(Boolean).join(" ");
    return (
      <section className={className}>
        <div><span>Match Setup</span><strong>{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</strong></div>
        <div className={captainStyles.setupStatuses}>{matchSetupTeams.map((setupTeam) => { const complete = setupStatusFor(match, setupTeam.id)?.complete === true; return <span className={complete ? captainStyles.setupComplete : captainStyles.setupPending} key={setupTeam.id}><span className={captainStyles.setupTeamName}>{setupTeam.side} - <b>{setupTeam.name}</b></span><strong>{complete ? "Setup Complete" : "Setup Pending"}</strong></span>; })}</div>
        <div className={captainStyles.setupButtons}>{accessibleSetupTeams.map((setupTeam) => { const complete = setupStatusFor(match, setupTeam.id)?.complete === true; const team = teams.find((candidate) => String(candidate.id) === String(setupTeam.id)); return <button type="button" className={complete ? captainStyles.blueAction : captainStyles.dangerAction} key={setupTeam.id} onClick={() => { setMatchToolsMatch(null); dashboard.onOpenMatchSetup?.(match, team); }}>Match Setup</button>; })}</div>
      </section>
    );
  }

  function renderMatchToolActions(match) {
    const canEnterMatchScores = canEnterScoresFor(match);
    const flexScheduleAvailable = flexScheduleAvailableFor(match);
    const flexScheduleAllowed = flexScheduleAllowedFor(match);
    return (
      <div className={captainStyles.matchToolsActions}>
        <button type="button" className={captainStyles.blueAction} onClick={() => { setMatchToolsMatch(null); dashboard.onOpenMatch?.(match); }}>Match Details</button>
        <button type="button" className={captainStyles.blueAction} onClick={() => { setMatchToolsMatch(null); dashboard.onEmailOpposingCaptains?.(match); }}>Email Opposing Captains</button>
        <button type="button" className={bothTeamsSetupCompleteFor(match) ? captainStyles.successAction : captainStyles.dangerAction} onClick={() => { setMatchToolsMatch(null); dashboard.onOpenMatchScoreSheet?.(match); }}>Match Score Sheet</button>
        {flexScheduleAvailable && <button type="button" className={captainStyles.blueAction} disabled={!flexScheduleAllowed} title={flexScheduleAllowed ? "Modify this Flex League match date/time" : "Only the home captain or co-captain can modify this match"} onClick={() => { if (!flexScheduleAllowed) return; setMatchToolsMatch(null); dashboard.onOpenFlexSchedule?.(match); }}>Modify Match Date/Time</button>}
        <button type="button" className={scoreEntryToneFor(match)} disabled={!canEnterMatchScores} onClick={() => { if (!canEnterMatchScores) return; setMatchToolsMatch(null); dashboard.onEnterMatchScores?.(match); }}>Enter Match Scores</button>
      </div>
    );
  }

  return (
    <main className={["full-screen-main", styles.page, captainStyles.captainPage, appearance.isLightCardHeaders ? styles.lightCardHeaders : "", appearance.isSidebarCollapsed ? styles.sidebarCollapsedLayout : ""].filter(Boolean).join(" ")} id="captain-preview-dashboard">
      <aside className={[styles.sidebar, appearance.isLightSidebar ? styles.lightSidebar : "", appearance.isSidebarCollapsed ? styles.sidebarCollapsed : ""].filter(Boolean).join(" ")} aria-label="Captain dashboard navigation; hover to expand when collapsed" onMouseLeave={() => { if (appearance.isSidebarCollapsed) setExpandedMenu(""); }}>
        <a className={styles.brand} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer"><Image src="/lms-icon-192.png" width={46} height={46} alt="Lakewood Ranch Pickleball Club" priority/><strong>Lakewood Ranch Pickleball Club</strong></a>
        <nav className={styles.sideNav} aria-label="Captain dashboard navigation">
          <div className={styles.navGroup}>
            {navButton("dashboard", "Dashboard", "dashboard", "Captain", () => setExpandedMenu((current) => current === "dashboard" ? "" : "dashboard"), true)}
            {expandedMenu === "dashboard" && <div className={styles.submenu}><button type="button" onClick={() => dashboard.onChangeDashboard?.("/player-dashboard")}><span>Player Dashboard</span></button><button type="button" className={styles.submenuActive} aria-current="page" onClick={() => goToSection("dashboard")}><span>Captain Dashboard</span></button>{canUseAdminDashboard && <button type="button" onClick={() => dashboard.onChangeDashboard?.("/")}><span>Admin Dashboard</span></button>}</div>}
          </div>
          <div className={styles.navGroup}>
            {navButton("team", "My Team", "team", teams.length > 1 ? teamName : "", () => teams.length > 1 ? setExpandedMenu((current) => current === "team" ? "" : "team") : goToSection("team"), teams.length > 1)}
            {expandedMenu === "team" && <div className={styles.submenu}>{teams.map((team) => <button type="button" className={String(team.id) === String(teamId) ? styles.submenuActive : ""} aria-current={String(team.id) === String(teamId) ? "true" : undefined} key={team.id} onClick={() => selectTeam(team)}><span>{team.name}</span></button>)}</div>}
          </div>
          {navButton("actions", "Captain Tools", "clipboard", "", () => openNavigationSection("actions"))}



          <div className={styles.navGroup}>{navButton("documents", "League Documents", "document", leagueName, () => setExpandedMenu((current) => current === "documents" ? "" : "documents"), true)}{expandedMenu === "documents" && <div className={styles.submenu}>{documents.length ? documents.map((document) => <button type="button" key={document.key} onClick={() => dashboard.onOpenLeagueDocument?.(document)}><span>{document.label}</span></button>) : <p>No documents are published for this league.</p>}</div>}</div>
        </nav>
        <div className={styles.season}><span>Selected season</span><strong>{seasonName}</strong><small>{leagueName}</small></div>
        <p className={styles.sidebarCopyright}>&copy; {currentYear} Lakewood Ranch Pickleball Club</p>
      </aside>

      {mobileMenuOpen && (
        <div className={styles.mobileDrawerLayer} role="dialog" aria-modal="true" aria-labelledby="captain-mobile-navigation-title">
          <button type="button" className={styles.mobileDrawerBackdrop} onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu"/>
          <aside className={[styles.mobileDrawer, appearance.isLightSidebar ? styles.lightSidebar : ""].filter(Boolean).join(" ")} id="captain-mobile-navigation">
            <div className={styles.mobileDrawerHeader}>
              <a className={styles.brand} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer"><Image src="/lms-icon-192.png" width={42} height={42} alt="Lakewood Ranch Pickleball Club"/><strong id="captain-mobile-navigation-title">Lakewood Ranch Pickleball Club</strong></a>
              <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">&times;</button>
            </div>
            <nav className={styles.sideNav} aria-label="Mobile captain dashboard menu">
              <div className={styles.navGroup}>
                {navButton("dashboard", "Dashboard", "dashboard", "Captain", () => setExpandedMenu((current) => current === "dashboard" ? "" : "dashboard"), true)}
                {expandedMenu === "dashboard" && <div className={styles.submenu}><button type="button" onClick={() => { setMobileMenuOpen(false); dashboard.onChangeDashboard?.("/player-dashboard"); }}><span>Player Dashboard</span></button><button type="button" className={styles.submenuActive} aria-current="page" onClick={() => { setMobileMenuOpen(false); goToSection("dashboard"); }}><span>Captain Dashboard</span></button>{canUseAdminDashboard && <button type="button" onClick={() => { setMobileMenuOpen(false); dashboard.onChangeDashboard?.("/"); }}><span>Admin Dashboard</span></button>}</div>}
              </div>
              <div className={styles.navGroup}>
                {navButton("team", "My Team", "team", teams.length > 1 ? teamName : "", () => {
                  if (teams.length > 1) setExpandedMenu((current) => current === "team" ? "" : "team");
                  else { setMobileMenuOpen(false); goToSection("team"); }
                }, teams.length > 1)}
                {expandedMenu === "team" && <div className={styles.submenu}>{teams.map((team) => <button type="button" className={String(team.id) === String(teamId) ? styles.submenuActive : ""} aria-current={String(team.id) === String(teamId) ? "true" : undefined} key={team.id} onClick={() => { setMobileMenuOpen(false); selectTeam(team); }}><span>{team.name}</span></button>)}</div>}
              </div>
              {navButton("actions", "Captain Tools", "clipboard", "", () => { setMobileMenuOpen(false); openNavigationSection("actions"); })}
              <div className={styles.navGroup}>{navButton("documents", "League Documents", "document", leagueName, () => setExpandedMenu((current) => current === "documents" ? "" : "documents"), true)}{expandedMenu === "documents" && <div className={styles.submenu}>{documents.length ? documents.map((document) => <button type="button" key={document.key} onClick={() => { setMobileMenuOpen(false); dashboard.onOpenLeagueDocument?.(document); }}><span>{document.label}</span></button>) : <p>No documents are published for this league.</p>}</div>}</div>
            </nav>
            <div className={styles.season}><span>Selected season</span><strong>{seasonName}</strong><small>{leagueName}</small></div>
          </aside>
        </div>
      )}

      <section className={styles.content}>
        <header className={styles.desktopHeader}><div><span>Captain dashboard</span><h1>Welcome, {member?.first_name || displayName(member).split(" ")[0]}</h1></div><div className={styles.headerActions}><button type="button" className={styles.helpButton} onClick={() => dashboard.onOpenGuide?.()} aria-label="Open User Guide"><Icon name="help"/></button><a className={styles.helpButton} href={`mailto:${dashboard.contactEmail || "info@lwrpickleballclub.com"}`} aria-label="Email League Management"><Icon name="mail"/></a><div className={styles.userIdentity}><strong>{displayName(member)}</strong><small>{roleLabel(role)}</small></div><button type="button" className={styles.profileButton} onClick={() => setProfileOpen(true)}><Avatar person={member}/></button></div></header>
        <header className={styles.mobileHeader}><div className={styles.mobileLeading}><button type="button" className={styles.mobileMenuButton} onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="captain-mobile-navigation"><Icon name="menu" size={19}/></button><a className={styles.mobileLogo} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer"><Image src="/lms-icon-192.png" width={36} height={36} alt=""/></a></div><div className={styles.mobileTitle}><strong>Captain Dashboard</strong><span>{teamName}</span></div><div className={styles.mobileActions}><button type="button" onClick={() => dashboard.onOpenGuide?.()} aria-label="Open User Guide"><Icon name="help" size={18}/></button><button type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile"><Avatar person={member}/></button></div></header>
        <label className={`${styles.mobileDashboardSelect} ${captainStyles.mobileDashboardSelect}`}><span>Dashboard view</span><select value="/captain-dashboard" onChange={(event) => dashboard.onChangeDashboard?.(event.target.value)}><option value="/player-dashboard">Player Dashboard</option><option value="/captain-dashboard">Captain Dashboard</option>{canUseAdminDashboard && <option value="/">Admin Dashboard</option>}</select></label>
        {teams.length > 1 && <label className={captainStyles.mobileTeamSelect}><span>Active team</span><select value={teamId || ""} onChange={(event) => { const team = teams.find((item) => String(item.id) === String(event.target.value)); if (team) selectTeam(team); }}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}

        <section className={`${styles.hero} ${captainStyles.hero}`}>
          <div className={styles.heroArt} aria-hidden="true"><Image src="/website-emblem.png" width={2048} height={2096} sizes="(max-width: 700px) 74px, 154px" className={styles.heroEmblem} alt="" priority/></div>
          <div className={styles.heroCopy}><div className={styles.nextMatch}><span>Next Match</span>{nextMatch && <span className={styles.matchType}>{selectedIsHome ? "Home Match" : "Away Match"}</span>}<b>{nextMatch ? `${nextDate.label} - ${shortTime(nextMatch.scheduled_time)}` : "No upcoming match scheduled"}</b></div><h2>{teamName} <em>vs</em> {opponentFor(nextMatch, teamId)}</h2><div className={styles.location}><Icon name="pin" size={16}/><span>{nextMatch?.locations?.name || selectedTeam?.locations?.name || "Location TBD"}</span>{nextMatch?.week_number && <><i>-</i><span>Week {nextMatch.week_number}</span></>}</div><div className={captainStyles.heroActions}><button type="button" className={captainStyles.blueAction} disabled={!nextMatch} onClick={() => nextMatch && dashboard.onOpenMatch?.(nextMatch)}>Match Details</button><button type="button" className={captainStyles.blueAction} disabled={!nextMatch} onClick={() => nextMatch && dashboard.onEmailOpposingCaptains?.(nextMatch)}>Email Opposing Captains</button><button type="button" className={bothTeamsSetupComplete ? captainStyles.successAction : captainStyles.dangerAction} disabled={!nextMatch} onClick={() => nextMatch && dashboard.onOpenMatchScoreSheet?.(nextMatch)}>Match Score Sheet</button>{nextMatch && flexScheduleAvailableFor(nextMatch) && <button type="button" className={captainStyles.blueAction} disabled={!flexScheduleAllowedFor(nextMatch)} title={flexScheduleAllowedFor(nextMatch) ? "Modify this Flex League match date/time" : "Only the home captain or co-captain can modify this match"} onClick={() => flexScheduleAllowedFor(nextMatch) && dashboard.onOpenFlexSchedule?.(nextMatch)}>Modify Match Date/Time</button>}<button type="button" className={scoreEntryTone} disabled={!canEnterScores} onClick={() => nextMatch && canEnterScores && dashboard.onEnterMatchScores?.(nextMatch)}>Enter Match Scores</button></div></div>
        </section>

        {nextMatch && <section className={captainStyles.matchSetupPanel}><div><span>Match Setup</span><strong>{nextMatch.home_team?.name || "Home"} vs {nextMatch.away_team?.name || "Away"}</strong></div><div className={captainStyles.setupStatuses}>{setupTeams.map((setupTeam) => { const complete = setupStatusFor(nextMatch, setupTeam.id)?.complete === true; return <span className={complete ? captainStyles.setupComplete : captainStyles.setupPending} key={setupTeam.id}>{setupTeam.side} - <b>{setupTeam.name}</b>: <strong>{complete ? "Setup Complete" : "Setup Pending"}</strong></span>; })}</div><div className={captainStyles.setupButtons}>{captainSetupTeams.map((setupTeam) => { const complete = setupStatusFor(nextMatch, setupTeam.id)?.complete === true; return <button type="button" className={complete ? captainStyles.blueAction : captainStyles.dangerAction} key={setupTeam.id} onClick={() => dashboard.onOpenMatchSetup?.(nextMatch, teams.find((team) => String(team.id) === String(setupTeam.id)))}>Match Setup</button>; })}</div></section>}
        <section className={styles.stats} aria-label="Captain team statistics">
          <article><div><Icon name="chart"/></div><span>Team record<strong>{standing ? `${Number(standing.match_wins || 0)}-${Number(standing.match_losses || 0)}` : "--"}</strong><small>{Number(standing?.standings_points || 0)} Team Points</small></span></article>
          <button type="button" className={styles.statCard} onClick={() => openNavigationSection("standings")} aria-label="Open Division Standings"><div><Icon name="trophy"/></div><span>Division rank<strong>{standing?.rank ? `#${standing.rank}` : "--"} <i>of {leaders.length || 0}</i></strong><small>{leagueName} <b>|</b> {divisionName}</small></span></button>
          <button type="button" className={[styles.statCard, pendingScoreActions.length ? captainStyles.pendingStat : ""].filter(Boolean).join(" ")} disabled={pendingScoreActions.length === 0} onClick={() => pendingScoreActions.length > 0 && goToSection("pending")} aria-label="Open pending match score entry and validation actions"><div><Icon name="verify"/></div><span>Pending Match Score Entry/Validations<strong>{pendingScoreActions.length}</strong><small>{pendingScoreActions.length ? "Tap to view matches" : "Nothing awaiting action"}</small></span></button>
        </section>

        <div className={captainStyles.dashboardGrid}>
          <section className={`${styles.card} ${captainStyles.actionsCard}`} id="captain-preview-actions"><Heading eyebrow="Captain Tools" title={teamName}/><div className={captainStyles.actionGrid}><button type="button" onClick={() => dashboard.onOpenRoster?.()}><Icon name="team"/><span><strong>View Team</strong><small>{stats.playerCount || 0} rostered players</small></span></button><button type="button" onClick={() => dashboard.onManageRoster?.()}><Icon name="team"/><span><strong>Manage Roster</strong><small>Players and leadership</small></span></button><button type="button" onClick={() => dashboard.onOpenSchedule?.()}><Icon name="calendar"/><span><strong>Division Schedules</strong><small>View all division team schedules</small></span></button><button type="button" onClick={() => dashboard.onOpenCaptains?.()}><Icon name="mail"/><span><strong>Division Captains</strong><small>Captain contact list</small></span></button></div></section>

          <section className={`${styles.card} ${captainStyles.pendingCard} ${pendingScoreActions.length ? captainStyles.pendingAlert : ""}`} id="captain-preview-pending"><Heading eyebrow="Action needed" title="Pending Match Score Entry/Validations"/><div className={captainStyles.matchList}>{pendingScoreActions.length ? pendingScoreActions.slice(0, 4).map(({ match, action }) => { const date = shortDate(match.scheduled_date); const needsEntry = action === "entry"; return <button type="button" className={captainStyles.matchRow} key={match.id} onClick={() => needsEntry ? dashboard.onEnterMatchScores?.(match) : dashboard.onOpenScoreDetails?.(match)} aria-label={`${needsEntry ? "Enter scores for" : "Review scores for"} ${match.home_team?.name || "Home"} versus ${match.away_team?.name || "Away"}`}><time><b>{date.day}</b><span>{date.month}</span></time><p><strong>{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</strong><span>{date.label} - {shortTime(match.scheduled_time)}</span></p><small>{needsEntry ? "Enter Scores" : "Validate"}</small><Icon name="arrow" size={16}/></button>; }) : <p className={captainStyles.empty}>No matches currently need score entry or validation.</p>}</div></section>

          <section className={[styles.card, captainStyles.matchesCard].join(" ")} id="captain-preview-matches"><Heading eyebrow="Plan for Upcoming Matches" title="Upcoming matches & byes" hint="Click Match for Match Tools" meta={{ label: "Matches", value: upcomingMatchCount }} action={upcomingItems.length > 4 ? (showAllUpcoming ? "Show Less" : "Show More") : ""} onAction={() => setShowAllUpcoming((show) => !show)}/><div className={captainStyles.matchList}>{visibleUpcomingItems.length ? visibleUpcomingItems.map((item, index) => { if (item.type === "bye") { const date = shortDate(item.data?.bye_date); return <div className={captainStyles.matchRow} key={"bye-" + (item.data?.id || index)}><time><b>{date.day}</b><span>{date.month}</span></time><p><strong>{teamName} Bye Week</strong><span>{date.label} - Week {item.data?.week_number || "-"}</span></p><small>Bye</small></div>; } const match = item.data; const date = shortDate(match.scheduled_date); return <button type="button" className={captainStyles.matchRow} key={match.id} onClick={() => setMatchToolsMatch(match)} aria-label={`Open Match Tools for ${match.home_team?.name || "Home"} versus ${match.away_team?.name || "Away"}`}><time><b>{date.day}</b><span>{date.month}</span></time><p><strong>{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</strong><span>{date.label} - {shortTime(match.scheduled_time)}</span></p><small>{String(match.home_team_id) === String(teamId) ? "Home" : "Away"}</small><Icon name="arrow" size={16}/></button>; }) : <p className={captainStyles.empty}>No upcoming matches or byes.</p>}</div></section>

          <section className={`${styles.card} ${captainStyles.standingsCard}`} id="captain-preview-standings"><Heading eyebrow="Division snapshot" title="Standings" action="Full view" onAction={() => openNavigationSection("standings")}/><div className={captainStyles.standings}>{playoffTeamCount > 0 && <p className={styles.playoffNote}>Top {playoffTeamCount} teams highlighted for Playoffs / Championship Day</p>}{leaders.length ? leaders.slice(0, 6).map((leader) => { const width = Math.max(7, Math.round((Number(leader.chartValue || 0) / standingsMaximum) * 100)); const selected = String(leader.teamId) === String(teamId); const playoffTeam = playoffTeamIds.has(String(leader.teamId || leader.id)); const rowClassName = [selected ? captainStyles.selectedStanding : "", playoffTeam ? captainStyles.playoffStanding : ""].filter(Boolean).join(" "); return <div className={rowClassName} key={leader.id}><strong>#{leader.rank} {leader.team}</strong><span><i style={{ width: `${width}%` }}/></span><b>{leader.chartValue}</b></div>; }) : <p className={captainStyles.empty}>No standings have been published.</p>}</div></section>

          <section className={[styles.card, captainStyles.resultsCard, styles.resultsCard].join(" ")} id="captain-preview-results">
            <Heading
              eyebrow="Completed"
              title="Recent results"
              hint="Click Match for Score Details"
              meta={{ label: "Total Team Points", value: Number(standing?.standings_points || 0) }}
              action={orderedCompletedMatches.length > 3 ? (showAllResults ? "Show Less" : "Show More") : ""}
              onAction={() => setShowAllResults((show) => !show)}
            />
            <div className={styles.results}>
              {visibleCompletedMatches.length ? visibleCompletedMatches.map((match) => {
                const isHome = String(match.home_team_id) === String(teamId);
                const selectedScore = isHome ? match.home_score : match.away_score;
                const opponentScore = isHome ? match.away_score : match.home_score;
                const selectedTeamName = (isHome ? match.home_team?.name : match.away_team?.name) || teamName;
                const opponentTeamName = (isHome ? match.away_team?.name : match.home_team?.name) || "Opponent";
                const verified = match.score_status === "verified";
                const won = verified && String(match.winning_team_id || "") === String(teamId);
                const tied = verified && !match.winning_team_id && Number(selectedScore) === Number(opponentScore);
                const mark = !verified ? "!" : tied ? "T" : won ? "W" : "L";
                const tone = !verified ? "pending" : tied ? "tie" : won ? "win" : "loss";
                const rowToneClass = !verified ? styles.pendingRow : tied ? styles.tieRow : won ? styles.winRow : styles.lossRow;
                const scoreStatus = resultScoreStatusLabel(match);
                const enteredBy = scoreMembersById[String(match.score_entered_by_member_id || "")];
                const verifiedBy = scoreMembersById[String(match.score_verified_by_member_id || "")];

                return (
                  <button
                    type="button"
                    className={[styles.resultRow, rowToneClass].join(" ")}
                    key={match.id}
                    onClick={() => dashboard.onOpenScoreDetails?.(match)}
                    aria-label={`Open score details. Your team ${selectedTeamName} scored ${selectedScore ?? "not available"}; opponent ${opponentTeamName} scored ${opponentScore ?? "not available"}. ${isHome ? "Home" : "Away"} match.`}
                  >
                    <b className={styles[tone]}>{mark}</b>
                    <span className={styles.resultSummary}>
                      <strong>{match.home_team?.name || "Home"} <span>vs</span> {match.away_team?.name || "Away"}</strong>
                      <small>{shortDate(match.scheduled_date).label} - {isHome ? "Home" : "Away"} match</small>
                      {scoreStatus && <span className={styles.resultStatus}>{scoreStatus}</span>}
                      <span className={styles.resultAudit}>
                        <small><b>Scores entered:</b> {match.score_entered_at ? `${formatDisplayTimestampShort(match.score_entered_at)}${enteredBy ? ` by ${displayName(enteredBy)}` : " by Unknown"}` : "Not entered"}</small>
                        <small><b>Scores verified:</b> {match.score_verified_at ? `${formatDisplayTimestampShort(match.score_verified_at)}${verifiedBy ? ` by ${displayName(verifiedBy)}` : " by Unknown"}` : "Not verified"}</small>
                      </span>
                    </span>
                    <span className={[styles.resultScore, styles[tone + "Score"]].join(" ")} aria-hidden="true">
                      <span className={isHome ? styles.yourTeamScore : styles.opponentScore}>
                        <small>{isHome ? "Your Team" : "Opponent"}</small>
                        <strong>{match.home_score ?? "-"}</strong>
                      </span>
                      <i aria-hidden="true">-</i>
                      <span className={isHome ? styles.opponentScore : styles.yourTeamScore}>
                        <small>{isHome ? "Opponent" : "Your Team"}</small>
                        <strong>{match.away_score ?? "-"}</strong>
                      </span>
                    </span>
                    <Icon name="arrow" size={16}/>
                  </button>
                );
              }) : <p className={captainStyles.empty}>No completed matches are available.</p>}
            </div>
          </section>
        </div>
        <p className={styles.note}>Live Captain dashboard - current data, permissions, and operational tools</p><p className={styles.mobileCopyright}>&copy; {currentYear} Lakewood Ranch Pickleball Club</p>
      </section>

      <nav className={styles.bottomNav} aria-label="Mobile captain navigation">{[["dashboard", "Dashboard", "dashboard"], ["actions", "Tools", "clipboard"], ["matches", "Matches", "calendar"], ["standings", "Standings", "trophy"]].map(([section, label, icon]) => <button type="button" className={activeSection === section ? styles.active : ""} key={section} onClick={() => openNavigationSection(section)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav>

      <DashboardProfileDialog isOpen={profileOpen} onClose={() => setProfileOpen(false)} member={member} role={role} membershipUrl={dashboard.membershipUrl} onChangePassword={dashboard.onChangePassword} onSaveProfileImage={dashboard.onSaveProfileImage} onLogout={dashboard.onLogout}/>
      {standingsOpen && <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="captain-standings-dialog-title"><button type="button" className={styles.backdrop} onClick={() => setStandingsOpen(false)} aria-label="Close standings"/><section className={styles.standingsDialog}><header><div><span>Division standings</span><div className={styles.standingsNames}><strong>{seasonName}</strong><strong>{leagueName}</strong><h2 id="captain-standings-dialog-title">{divisionName}</h2></div><p className={styles.standingsMetric}>Tiebreak: {standingsTiebreakText}</p></div><button type="button" onClick={() => setStandingsOpen(false)} aria-label="Close standings">&times;</button></header><div className={styles.standingsChart}>{playoffTeamCount > 0 && <p className={styles.playoffNote}>Top {playoffTeamCount} teams highlighted for Playoffs / Championship Day</p>}<DivisionStandingsBarChart leaders={leaders} metricLabel={dashboard.standingsMetricLabel} selectedTeamId={teamId} playoffTeamIds={playoffTeamIds}/></div></section></div>}
      {matchToolsMatch && <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="match-tools-dialog-title"><button type="button" className={styles.backdrop} onClick={() => setMatchToolsMatch(null)} aria-label="Close Match Tools"/><section className={captainStyles.matchToolsDialog}><header><div><span>Captain Match Tools</span><h2 id="match-tools-dialog-title">{matchToolsMatch.home_team?.name || "Home"} vs {matchToolsMatch.away_team?.name || "Away"}</h2><p>{shortDate(matchToolsMatch.scheduled_date).label} - {shortTime(matchToolsMatch.scheduled_time)}</p></div><button type="button" onClick={() => setMatchToolsMatch(null)} aria-label="Close Match Tools">&times;</button></header><div className={captainStyles.matchToolsBody}>{renderMatchToolActions(matchToolsMatch)}{renderMatchSetupStatus(matchToolsMatch, true)}</div></section></div>}
    </main>
  );
}
