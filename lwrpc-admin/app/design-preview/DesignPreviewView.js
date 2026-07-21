"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { hasRole, roleLabel } from "../lib/permissions";
import { APP_VERSION } from "../lib/version";
import LmsInstallButton from "../components/LmsInstallButton";
import styles from "./page.module.css";
import { DashboardAppearanceControls, useDashboardAppearance } from "./DashboardAppearanceControls";
import { standingsTiebreakLabels } from "../lib/standingsTiebreaks";

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  team: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 7a3 3 0 0 1 0 6m-1 2a5 5 0 0 1 5 5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 13v4m-4 3h8"/></>,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  guide: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.2-1.5 2.7m0 3.5h.01"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.2-1.5 2.7m0 3.5h.01"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  trend: <><path d="m3 17 5-5 4 4 8-9"/><path d="M15 7h5v5"/></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3"/></>,
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
  const parts = displayName(person).split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

function shortDate(value) {
  if (!value) return { day: "--", month: "TBD", label: "Date TBD" };
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "TBD", label: value };
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  };
}

function shortTime(value) {
  if (!value) return "Time TBD";
  const [hoursText, minutesText] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hoursText), Number(minutesText || 0), 0, 0);
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

function rosterRole(person, team) {
  if (String(person?.id) === String(team?.captain?.id)) return "Captain";
  if (String(person?.id) === String(team?.co_captain_1?.id) || String(person?.id) === String(team?.co_captain_2?.id)) return "Co-Captain";
  return "Player";
}

function roleRank(role) {
  if (role === "Captain") return 0;
  if (role === "Co-Captain") return 1;
  return 2;
}

function rosterSortName(person) {
  const lastName = String(person?.last_name || "").trim();
  const firstName = String(person?.first_name || "").trim();
  if (lastName || firstName) return `${lastName}\u0000${firstName}`;

  const parts = displayName(person).split(/\s+/).filter(Boolean);
  return `${parts.at(-1) || ""}\u0000${parts.slice(0, -1).join(" ")}`;
}

function profilePhotoUrl(person) {
  const urls = Array.isArray(person?.profile_image_urls) ? person.profile_image_urls : [];
  return urls.find((url) => String(url).includes("/storage/v1/object/public/profile-photos/")) || "";
}


function Avatar({ person, initials, imageUrl = "", tone = "coral", user = false }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);
  return (
    <span className={`${styles.avatar} ${styles[tone]} ${user ? styles.userAvatar : ""}`}>
      {imageUrl && !imageFailed ? <Image src={imageUrl} width={80} height={80} alt={`${displayName(person)} profile`} onError={() => setImageFailed(true)} unoptimized /> : initials}
    </span>
  );
}

function Heading({ eyebrow, title, hint, action, onAction, meta }) {
  return (
    <div className={styles.heading}>
      <div><span>{eyebrow}</span><h3>{title}</h3>{hint && <p className={styles.headingHint}>{hint}</p>}</div>
      <div className={styles.headingAside}>
        {meta && <span className={styles.headingMeta}><small>{meta.label}</small><strong>{meta.value}</strong></span>}
        {action && <button type="button" onClick={onAction}>{action}<Icon name="arrow" size={15}/></button>}
      </div>
    </div>
  );
}

export default function DesignPreviewView({ dashboard = {} }) {
  const member = dashboard.member || null;
  const role = dashboard.role || "player";
  const teams = dashboard.teams || [];
  const selectedTeam = dashboard.selectedTeam || teams[0] || null;
  const teamId = selectedTeam?.id;
  const memberName = displayName(member);
  const firstName = member?.first_name || memberName.split(" ")[0] || "Member";
  const teamName = selectedTeam?.name || "No active team";
  const leagueName = selectedTeam?.divisions?.leagues?.name || "Lakewood Ranch LMS";
  const seasonName = dashboard.seasonName || selectedTeam?.divisions?.leagues?.seasons?.name || "Not selected";
  const divisionStandings = dashboard.divisionStandings || [];
  const standing = divisionStandings.find((row) => String(row.team_id) === String(teamId)) || null;
  const playoffTeamCount = Number(selectedTeam?.divisions?.playoff_team_count || 0);
  const standingsTiebreakText = standingsTiebreakLabels(selectedTeam?.divisions).join(" → ");
  const playoffTeamIds = new Set(divisionStandings
    .slice(0, playoffTeamCount > 0 ? playoffTeamCount : 0)
    .map((row) => String(row.team_id || row.id)));
  const allScheduleItems = dashboard.scheduleItems || [];
  const nextMatch = allScheduleItems.find((item) => item.type === "match")?.data || null;
  const selectedIsHome = nextMatch && String(nextMatch.home_team_id) === String(teamId);
  const opponentName = nextMatch ? (selectedIsHome ? nextMatch.away_team?.name : nextMatch.home_team?.name) || "Opponent" : "Schedule pending";
  const nextDate = shortDate(nextMatch?.scheduled_date);
  const allResults = useMemo(() => (dashboard.matches || [])
    .filter((match) => match.status === "completed" && (String(match.home_team_id) === String(teamId) || String(match.away_team_id) === String(teamId)))
    .sort((a, b) => String(b.scheduled_date || "").localeCompare(String(a.scheduled_date || ""))), [dashboard.matches, teamId]);
  const roster = useMemo(() => (dashboard.rosters?.[teamId] || [])
    .map((person) => ({ person, role: rosterRole(person, selectedTeam) }))
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || rosterSortName(a.person).localeCompare(rosterSortName(b.person))), [dashboard.rosters, selectedTeam, teamId]);
  const leadershipRoster = roster.filter(({ role: teamRole }) => teamRole !== "Player");

  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedMenu, setExpandedMenu] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [profileImageMessage, setProfileImageMessage] = useState("");
  const [profileImageSaving, setProfileImageSaving] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const appearance = useDashboardAppearance();
  const photoInputRef = useRef(null);

  const canUseCaptainDashboard = hasRole(role, "captain");
  const canUseAdminDashboard = hasRole(role, "league_manager");
  const hasMultipleTeams = teams.length > 1;
  const dashboardOptions = [
    { label: "Player Dashboard", path: "/player-dashboard" },
    ...(canUseCaptainDashboard ? [{ label: "Captain Dashboard", path: "/captain-dashboard" }] : []),
    ...(canUseAdminDashboard ? [{ label: "Admin Dashboard", path: "/" }] : []),
  ];
  const upcomingMatchCount = allScheduleItems.filter((item) => item.type === "match").length;
  const scheduleItems = showAllSchedule ? allScheduleItems : allScheduleItems.slice(0, 3);
  const recentResults = showAllResults ? allResults : allResults.slice(0, 2);
  const availableDocuments = (dashboard.leagueDocuments || []).filter((document) => document.available);
  const standingsMaximum = Math.max(1, ...(dashboard.standingsLeaders || []).map((leader) => Number(leader.chartValue || 0)));
  const currentYear = new Date().getFullYear();
  const savedProfileImage = profilePhotoUrl(member);
  const displayedProfileImage = profileImage || savedProfileImage;

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      setLogoutConfirmOpen(false);
      setProfileOpen(false);
      setExpandedMenu("");
      setMobileMenuOpen(false);
      setStandingsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function scrollToSection(section) {
    setActiveSection(section);
    document.getElementById(`preview-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openNavigationSection(section) {
    if (section === "schedule") {
      setActiveSection(section);
      dashboard.onOpenSchedule?.();
      return;
    }
    if (section === "standings") {
      setActiveSection(section);
      setStandingsOpen(true);
      return;
    }
    scrollToSection(section);
  }

  function selectTeam(team) {
    dashboard.onSelectTeam?.(team.id);
    setExpandedMenu("");
    setActiveSection("team");
  }

  function toggleExpandedMenu(menu) {
    setExpandedMenu((current) => current === menu ? "" : menu);
  }

  async function handleProfileImage(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setProfileImageError("");
    setProfileImageMessage("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileImageError("Choose a JPG, PNG, or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > 2_000_000) {
      setProfileImageError("Choose an image smaller than 2 MB.");
      input.value = "";
      return;
    }

    const previousImage = profileImage;
    setProfileImageSaving(true);

    try {
      const previewUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("The selected picture could not be read."));
        reader.readAsDataURL(file);
      });
      setProfileImage(previewUrl);

      const savedUrl = await dashboard.onSaveProfileImage?.(file);
      setProfileImage(savedUrl || previewUrl);
      setProfileImageMessage("Profile picture saved.");
    } catch (error) {
      setProfileImage(previousImage);
      setProfileImageError(error?.message || "Unable to save the profile picture.");
    } finally {
      setProfileImageSaving(false);
      input.value = "";
    }
  }

  async function confirmLogout() {
    setLogoutPending(true);
    setLogoutError("");
    try {
      await dashboard.onLogout?.();
    } catch (error) {
      setLogoutError(error?.message || "Unable to log out. Please try again.");
      setLogoutPending(false);
    }
  }

  const navButton = (section, label, icon, detail, onClick, expandable = false) => (
    <button type="button" className={activeSection === section ? styles.active : ""} aria-expanded={expandable ? expandedMenu === section : undefined} onClick={onClick || (() => scrollToSection(section))}>
      <Icon name={icon}/><span><b>{label}</b>{detail && <small>{detail}</small>}</span>
    </button>
  );

  return (
    <main className={["full-screen-main", styles.page, appearance.isLightCardHeaders ? styles.lightCardHeaders : "", appearance.isSidebarCollapsed ? styles.sidebarCollapsedLayout : ""].filter(Boolean).join(" ")} id="preview-dashboard">
      <aside className={[styles.sidebar, appearance.isLightSidebar ? styles.lightSidebar : "", appearance.isSidebarCollapsed ? styles.sidebarCollapsed : ""].filter(Boolean).join(" ")} aria-label="Dashboard navigation; hover to expand when collapsed" onMouseLeave={() => { if (appearance.isSidebarCollapsed) setExpandedMenu(""); }}>
        <a className={styles.brand} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer" title="Open the Lakewood Ranch Pickleball Club website">
          <Image src="/lms-icon-192.png" width={46} height={46} alt="Lakewood Ranch Pickleball Club" priority/>
          <strong>Lakewood Ranch Pickleball Club</strong>
        </a>

        <nav className={styles.sideNav} aria-label="Dashboard navigation">
          <div className={styles.navGroup}>
            {navButton("dashboard", "Dashboard", "dashboard", canUseCaptainDashboard ? "Player" : "", () => {
              if (canUseCaptainDashboard) toggleExpandedMenu("dashboard");
              else scrollToSection("dashboard");
            }, canUseCaptainDashboard)}
            {expandedMenu === "dashboard" && (
              <div className={styles.submenu}>
                <button type="button" className={styles.submenuActive} aria-current="page" onClick={() => { setExpandedMenu(""); scrollToSection("dashboard"); }}><span>Player Dashboard</span></button>
                {canUseCaptainDashboard && <button type="button" onClick={() => dashboard.onChangeDashboard?.("/captain-dashboard")}><span>Captain Dashboard</span></button>}
                {canUseAdminDashboard && <button type="button" onClick={() => dashboard.onChangeDashboard?.("/")}><span>Admin Dashboard</span></button>}
              </div>
            )}
          </div>

          <div className={styles.navGroup}>
            {navButton("team", "My Team", "team", hasMultipleTeams ? teamName : "", () => {
              if (hasMultipleTeams) toggleExpandedMenu("team");
              else scrollToSection("team");
            }, hasMultipleTeams)}
            {expandedMenu === "team" && (
              <div className={styles.submenu}>
                {teams.map((team) => <button type="button" className={String(team.id) === String(teamId) ? styles.submenuActive : ""} aria-current={String(team.id) === String(teamId) ? "true" : undefined} key={team.id} onClick={() => selectTeam(team)}><span>{team.name}</span></button>)}
              </div>
            )}
          </div>

          {navButton("history", "My Play History", "history", "", () => dashboard.onOpenHistory?.())}
          {navButton("schedule", "Division Schedule", "calendar", "", () => openNavigationSection("schedule"))}
          {navButton("standings", "Division Standings", "trophy", "", () => openNavigationSection("standings"))}


          <div className={styles.navGroup}>
            {navButton("documents", "League Documents", "document", leagueName, () => toggleExpandedMenu("documents"), true)}
            {expandedMenu === "documents" && <div className={styles.submenu}>{availableDocuments.length > 0 ? availableDocuments.map((document) => <button type="button" key={document.key} onClick={() => dashboard.onOpenLeagueDocument?.(document)}><span>{document.label}</span></button>) : <p>No documents are published for this league.</p>}</div>}
          </div>

        </nav>

        <div className={styles.season}><span>Selected season</span><strong>{seasonName}</strong><small>{leagueName}</small></div>
        <p className={styles.sidebarCopyright}>&copy; {currentYear} Lakewood Ranch Pickleball Club</p>
      </aside>

      {mobileMenuOpen && (
        <div className={styles.mobileDrawerLayer} role="dialog" aria-modal="true" aria-labelledby="player-mobile-navigation-title">
          <button type="button" className={styles.mobileDrawerBackdrop} onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu"/>
          <aside className={[styles.mobileDrawer, appearance.isLightSidebar ? styles.lightSidebar : ""].filter(Boolean).join(" ")} id="player-mobile-navigation">
            <div className={styles.mobileDrawerHeader}>
              <a className={styles.brand} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer">
                <Image src="/lms-icon-192.png" width={42} height={42} alt="Lakewood Ranch Pickleball Club"/>
                <strong id="player-mobile-navigation-title">Lakewood Ranch Pickleball Club</strong>
              </a>
              <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">&times;</button>
            </div>
            <nav className={styles.sideNav} aria-label="Mobile dashboard menu">
              <div className={styles.navGroup}>
                {navButton("dashboard", "Dashboard", "dashboard", canUseCaptainDashboard ? "Player" : "", () => {
                  if (canUseCaptainDashboard) toggleExpandedMenu("dashboard");
                  else { setMobileMenuOpen(false); scrollToSection("dashboard"); }
                }, canUseCaptainDashboard)}
                {expandedMenu === "dashboard" && <div className={styles.submenu}><button type="button" className={styles.submenuActive} aria-current="page" onClick={() => { setExpandedMenu(""); setMobileMenuOpen(false); scrollToSection("dashboard"); }}><span>Player Dashboard</span></button>{canUseCaptainDashboard && <button type="button" onClick={() => { setMobileMenuOpen(false); dashboard.onChangeDashboard?.("/captain-dashboard"); }}><span>Captain Dashboard</span></button>}{canUseAdminDashboard && <button type="button" onClick={() => { setMobileMenuOpen(false); dashboard.onChangeDashboard?.("/"); }}><span>Admin Dashboard</span></button>}</div>}
              </div>
              <div className={styles.navGroup}>
                {navButton("team", "My Team", "team", hasMultipleTeams ? teamName : "", () => {
                  if (hasMultipleTeams) toggleExpandedMenu("team");
                  else { setMobileMenuOpen(false); scrollToSection("team"); }
                }, hasMultipleTeams)}
                {expandedMenu === "team" && <div className={styles.submenu}>{teams.map((team) => <button type="button" className={String(team.id) === String(teamId) ? styles.submenuActive : ""} aria-current={String(team.id) === String(teamId) ? "true" : undefined} key={team.id} onClick={() => { setMobileMenuOpen(false); selectTeam(team); }}><span>{team.name}</span></button>)}</div>}
              </div>
              {navButton("history", "My Play History", "history", "", () => { setMobileMenuOpen(false); setActiveSection("history"); dashboard.onOpenHistory?.(); })}
              {navButton("schedule", "Division Schedule", "calendar", "", () => { setMobileMenuOpen(false); openNavigationSection("schedule"); })}
              {navButton("standings", "Division Standings", "trophy", "", () => { setMobileMenuOpen(false); openNavigationSection("standings"); })}
              <div className={styles.navGroup}>
                {navButton("documents", "League Documents", "document", leagueName, () => toggleExpandedMenu("documents"), true)}
                {expandedMenu === "documents" && <div className={styles.submenu}>{availableDocuments.length > 0 ? availableDocuments.map((document) => <button type="button" key={document.key} onClick={() => { setMobileMenuOpen(false); dashboard.onOpenLeagueDocument?.(document); }}><span>{document.label}</span></button>) : <p>No documents are published for this league.</p>}</div>}
              </div>
            </nav>
            <div className={styles.season}><span>Selected season</span><strong>{seasonName}</strong><small>{leagueName}</small></div>
          </aside>
        </div>
      )}

      <section className={styles.content}>
        <header className={styles.desktopHeader}>
          <div><span>Player dashboard</span><h1>Welcome, {firstName}</h1></div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.helpButton} onClick={() => dashboard.onOpenGuide?.()} aria-label="Open User Guide" title="User Guide"><Icon name="help"/></button>
            <a className={styles.helpButton} href={`mailto:${dashboard.contactEmail || "info@lwrpickleballclub.com"}`} aria-label="Email League Management" title="Email League Management"><Icon name="mail"/></a>
            <div className={styles.userIdentity}><strong>{memberName}</strong><small>{roleLabel(role)}</small></div>
            <button type="button" className={styles.profileButton} onClick={() => setProfileOpen(true)} aria-haspopup="dialog">
              <Avatar person={member} initials={initialsFor(member)} imageUrl={displayedProfileImage} user/>
            </button>
          </div>
        </header>

        <header className={styles.mobileHeader}>
          <div className={styles.mobileLeading}><button type="button" className={styles.mobileMenuButton} onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="player-mobile-navigation"><Icon name="menu" size={19}/></button><a className={styles.mobileLogo} href="https://lwrpickleballclub.com" target="_blank" rel="noreferrer" aria-label="Open Lakewood Ranch Pickleball Club website"><Image src="/lms-icon-192.png" width={36} height={36} alt=""/></a></div>
          <div className={styles.mobileTitle}><strong>Player Dashboard</strong><span>{teamName}</span></div>
          <div className={styles.mobileActions}><button type="button" onClick={() => dashboard.onOpenGuide?.()} aria-label="Open User Guide" title="User Guide"><Icon name="help" size={18}/></button><a href={`mailto:${dashboard.contactEmail || "info@lwrpickleballclub.com"}`} aria-label="Email League Management" title="Email League Management"><Icon name="mail" size={18}/></a><button type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile"><Avatar person={member} initials={initialsFor(member)} imageUrl={displayedProfileImage} user/></button></div>
        </header>

        {canUseCaptainDashboard && (
          <label className={styles.mobileDashboardSelect}>
            <span>Dashboard view</span>
            <select value="/player-dashboard" onChange={(event) => {
              if (event.target.value !== "/player-dashboard") dashboard.onChangeDashboard?.(event.target.value);
            }}>
              {dashboardOptions.map((option) => <option key={option.path} value={option.path}>{option.label}</option>)}
            </select>
          </label>
        )}

        {hasMultipleTeams && (
          <label className={styles.mobileTeamSelect}>
            <span>Active team</span>
            <select value={teamId || ""} onChange={(event) => {
              const team = teams.find((item) => String(item.id) === String(event.target.value));
              if (team) selectTeam(team);
            }}>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
        )}

        <section className={styles.hero}>
          <div className={styles.heroArt} aria-hidden="true"><Image src="/website-emblem.png" width={2048} height={2096} sizes="(max-width: 700px) 74px, 154px" className={styles.heroEmblem} alt="" priority/></div>
          <div className={styles.heroCopy}><div className={styles.nextMatch}><span>Next match</span>{nextMatch && <span className={styles.matchType}>{selectedIsHome ? "Home Match" : "Away Match"}</span>}<b>{nextMatch ? `${nextDate.label} - ${shortTime(nextMatch.scheduled_time)}` : "No upcoming match scheduled"}</b></div><h2>{teamName} <em>vs</em> {opponentName}</h2><div className={styles.location}><Icon name="pin" size={16}/><span>{nextMatch?.locations?.name || selectedTeam?.locations?.name || "Location TBD"}</span>{nextMatch?.week_number ? <><i>-</i><span>Week {nextMatch.week_number}</span></> : null}</div><div className={styles.heroButtons}><button type="button" className={[styles.primary, styles.secondaryPrimary].join(" ")} disabled={!nextMatch} onClick={() => nextMatch && dashboard.onOpenMatch?.(nextMatch)}>Match details</button><button type="button" className={[styles.primary, styles.secondaryPrimary].join(" ")} disabled={!nextMatch} onClick={() => nextMatch && dashboard.onOpenLineup?.(nextMatch)}>Match Lineup <Icon name="team" size={17}/></button></div></div>
        </section>

        <section className={styles.stats} id="preview-standings" aria-label="Team statistics">
          <article><div><Icon name="trend"/></div><span>Team record<strong>{standing ? `${Number(standing.match_wins || 0)}-${Number(standing.match_losses || 0)}` : "--"}</strong><small>{teamName} · {Number(standing?.standings_points || 0)} Team Points</small></span></article>
          <button type="button" className={styles.statCard} onClick={() => openNavigationSection("standings")} aria-label="Open Division Standings"><div><Icon name="trophy"/></div><span>Division rank<strong>{standing?.rank ? `#${standing.rank}` : "--"} <i>of {divisionStandings.length || 0}</i></strong><small>{leagueName} <b>|</b> {selectedTeam?.divisions?.name || "Division"}</small></span></button>
          <article><div><Icon name="star"/></div><span>Season rating<strong>{dashboard.ratingSummary?.value || "NR"}</strong><small>{dashboard.ratingSummary?.label || "Player rating"}</small></span></article>
        </section>

        <div className={styles.grid}>
          <section className={styles.card} id="preview-schedule">
            <Heading eyebrow="Stay on top of it" title="Upcoming schedule" meta={{ label: "Matches", value: upcomingMatchCount }} action={allScheduleItems.length > 3 ? (showAllSchedule ? "Show less" : "View all") : ""} onAction={() => setShowAllSchedule((show) => !show)}/>
            <div className={styles.schedule}>
              {scheduleItems.length > 0 ? scheduleItems.map((item) => {
                if (item.type === "bye") {
                  const bye = item.data;
                  const date = shortDate(bye.bye_date);
                  return <div className={styles.byeRow} key={item.key}><time><b>{date.day}</b><span>{date.month}</span></time><p><strong>{bye.teams?.name || teamName} Bye Week</strong><span>{date.label} - Week {bye.week_number || "-"} - No match scheduled</span></p><small>Bye</small></div>;
                }
                const match = item.data;
                const date = shortDate(match.scheduled_date);
                const isHome = String(match.home_team_id) === String(teamId);
                return <button type="button" className={styles.scheduleRow} key={item.key} onClick={() => dashboard.onOpenMatch?.(match)}><time><b>{date.day}</b><span>{date.month}</span></time><p><strong>{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</strong><span>{date.label} - {shortTime(match.scheduled_time)} - {match.locations?.name || "Location TBD"}</span></p><small className={isHome ? styles.home : ""}>{isHome ? "Home" : "Away"}</small><Icon name="arrow" size={16}/></button>;
              }) : <div className={styles.emptyRow}><time><b>--</b><span>TBD</span></time><p><strong>No upcoming matches</strong><span>Your published schedule will appear here.</span></p></div>}
            </div>
          </section>

          <section className={`${styles.card} ${styles.teamCard}`} id="preview-team">
            <Heading eyebrow="The squad" title="My team" action={roster.length > 0 ? "View team" : ""} onAction={() => dashboard.onOpenRoster?.()}/>
            <h4 className={styles.teamNameHeading}>{teamName}</h4>
            <div className={styles.roster}>{leadershipRoster.length > 0 ? leadershipRoster.map(({ person, role: teamRole }, index) => {
              const name = displayName(person);
              const content = <><Avatar person={person} initials={initialsFor(person)} imageUrl={profilePhotoUrl(person)} tone={["blue", "coral", "slate", "gold", "green"][index % 5]}/><p><strong>{name}</strong>{teamRole !== "Player" && <span>{teamRole}</span>}</p></>;
              return person.email ? <a key={person.id} href={`mailto:${person.email}`} title={`Email ${name}`}>{content}</a> : <div key={person.id} title="No email address on file">{content}</div>;
            }) : <p className={styles.emptyMessage}>{roster.length > 0 ? "Team leadership has not been assigned." : "No roster is published for this team."}</p>}</div>
          </section>

          <section className={`${styles.card} ${styles.resultsCard}`} id="preview-results">
            <Heading eyebrow="The scoreline" title="Recent results" hint="Click Match for Score Details" meta={{ label: "Total Team Points", value: Number(standing?.standings_points || 0) }} action={allResults.length > 2 ? (showAllResults ? "Show Less" : "Show More") : ""} onAction={() => setShowAllResults((show) => !show)}/>
            <div className={styles.results}>{recentResults.length > 0 ? recentResults.map((match) => {
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
              const rowTone = !verified ? styles.pendingRow : tied ? styles.tieRow : won ? styles.winRow : styles.lossRow;
              const scoreStatus = resultScoreStatusLabel(match);
              return (
                <button
                  type="button"
                  className={[styles.resultRow, rowTone].join(" ")}
                  key={match.id}
                  onClick={() => dashboard.onOpenMatch?.(match)}
                  aria-label={`Open score details. Your team ${selectedTeamName} scored ${selectedScore ?? "not available"}; opponent ${opponentTeamName} scored ${opponentScore ?? "not available"}. ${isHome ? "Home" : "Away"} match.`}
                >
                  <b className={styles[tone]}>{mark}</b>
                  <span className={styles.resultSummary}>
                    <strong>{match.home_team?.name || "Home"} <span>vs</span> {match.away_team?.name || "Away"}</strong>
                    <small>{shortDate(match.scheduled_date).label} - {isHome ? "Home" : "Away"} match</small>
                    {scoreStatus && <span className={styles.resultStatus}>{scoreStatus}</span>}
                  </span>
                  <span className={[styles.resultScore, styles[`${tone}Score`]].join(" ")} aria-hidden="true">
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
            }) : <p className={styles.emptyMessage}>No completed matches are published for this team.</p>}</div>
          </section>
        </div>

        <p className={styles.note}>Live dashboard · current player data and permissions</p>
        <p className={styles.mobileCopyright}>&copy; {currentYear} Lakewood Ranch Pickleball Club</p>
      </section>

      <nav className={styles.bottomNav} aria-label="Mobile dashboard navigation">
        {[["dashboard", "Dashboard", "dashboard"], ["history", "Play History", "history"], ["schedule", "Schedule", "calendar"], ["standings", "Standings", "trophy"], ["results", "Results", "chart"]].map(([section, label, icon]) => <button type="button" className={activeSection === section ? styles.active : ""} key={section} onClick={() => { if (section === "history") { setActiveSection("history"); dashboard.onOpenHistory?.(); return; } openNavigationSection(section); }}><Icon name={icon} size={20}/><span>{label}</span></button>)}
      </nav>

      {standingsOpen && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="standings-dialog-title">
          <button type="button" className={styles.backdrop} onClick={() => setStandingsOpen(false)} aria-label="Close standings"/>
          <section className={styles.standingsDialog}>
            <header><div><span>Division standings</span><div className={styles.standingsNames}><strong>{seasonName}</strong><strong>{leagueName}</strong><h2 id="standings-dialog-title">{selectedTeam?.divisions?.name || "Division"}</h2></div><p className={styles.standingsMetric}>Tiebreak: {standingsTiebreakText}</p></div><button type="button" onClick={() => setStandingsOpen(false)} aria-label="Close standings">&times;</button></header>
            <div className={styles.standingsChart}>
              {playoffTeamCount > 0 && <p className={styles.playoffNote}>Top {playoffTeamCount} teams highlighted for Playoffs / Championship Day</p>}
              {(dashboard.standingsLeaders || []).length > 0 ? dashboard.standingsLeaders.map((leader) => {
                const width = Math.max(7, Math.round((Number(leader.chartValue || 0) / standingsMaximum) * 100));
                const selected = String(leader.teamId) === String(teamId);
                const playoffTeam = playoffTeamIds.has(String(leader.teamId || leader.id));
                const rowClassName = [selected ? styles.selectedStanding : "", playoffTeam ? styles.playoffStanding : ""].filter(Boolean).join(" ");
                return <div className={rowClassName} key={leader.id}><strong>#{leader.rank} {leader.team}</strong><span><i style={{ width: `${width}%` }}/></span><b>{leader.chartValue}</b></div>;
              }) : <p className={styles.emptyMessage}>No standings have been published for this division.</p>}
            </div>
          </section>
        </div>
      )}

      {profileOpen && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
          <button type="button" className={styles.backdrop} onClick={() => setProfileOpen(false)} aria-label="Close profile"/>
          <section className={styles.profileDialog}>
            <header><Avatar person={member} initials={initialsFor(member)} imageUrl={displayedProfileImage} user/><div><span>Signed-in profile</span><h2 id="profile-dialog-title">{memberName}</h2><p>{roleLabel(role)}{member?.email ? ` · ${member.email}` : ""}</p></div><button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile">×</button></header>
            <div className={styles.profileActions}>
              <button type="button" onClick={() => dashboard.onChangePassword?.()}><Icon name="lock"/><span><strong>Change Password</strong><small>Update the password for this account</small></span><Icon name="arrow" size={17}/></button>
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={profileImageSaving}><Icon name="camera"/><span><strong>{profileImageSaving ? "Saving Picture..." : displayedProfileImage ? "Change Picture" : "Add Picture"}</strong><small>JPG, PNG, or WebP · maximum 2 MB</small></span><Icon name="arrow" size={17}/></button>
              <input ref={photoInputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileImage}/>
              <DashboardAppearanceControls isLightSidebar={appearance.isLightSidebar} isLightCardHeaders={appearance.isLightCardHeaders} isSidebarCollapsed={appearance.isSidebarCollapsed} onToggleSidebar={appearance.toggleSidebarTheme} onToggleCardHeaders={appearance.toggleCardHeaderTheme} onToggleSidebarCollapsed={appearance.toggleSidebarCollapsed}/>
              <a href={dashboard.membershipUrl || "https://lwrpickleballclub.com/manage-membership"} target="_blank" rel="noreferrer"><Icon name="external"/><span><strong>Club Membership</strong><small>Open the club membership website</small></span><Icon name="arrow" size={17}/></a>
              <button type="button" className={styles.logoutAction} onClick={() => setLogoutConfirmOpen(true)}><Icon name="logout"/><span><strong>Log Out</strong><small>Log out of this browser or device only</small></span><Icon name="arrow" size={17}/></button>
            </div>
            {profileImageError && <p className={styles.inlineError}>{profileImageError}</p>}
            {profileImageMessage && <p className={styles.inlineSuccess}>{profileImageMessage}</p>}
            <footer className={styles.profileMeta}>
              <span>Version {APP_VERSION}</span>
              <span>&copy; {currentYear} Lakewood Ranch Pickleball Club</span>
              <LmsInstallButton iconOnly/>
            </footer>
          </section>
        </div>
      )}

      {logoutConfirmOpen && (
        <div className={`${styles.modalLayer} ${styles.confirmLayer}`} role="alertdialog" aria-modal="true" aria-labelledby="preview-logout-title">
          <button type="button" className={styles.backdrop} onClick={() => !logoutPending && setLogoutConfirmOpen(false)} aria-label="Cancel logout"/>
          <section className={styles.confirmDialog}><span>Account</span><h2 id="preview-logout-title">Log out of this device?</h2><p>You will remain signed in on your other browsers and devices.</p>{logoutError && <p className={styles.inlineError}>{logoutError}</p>}<div><button type="button" onClick={() => setLogoutConfirmOpen(false)} disabled={logoutPending}>Stay signed in</button><button type="button" className={styles.confirmLogout} onClick={confirmLogout} disabled={logoutPending}>{logoutPending ? "Logging out..." : "Log out"}</button></div></section>
        </div>
      )}
    </main>
  );
}
