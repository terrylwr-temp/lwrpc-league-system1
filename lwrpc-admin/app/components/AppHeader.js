"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { hasRole, roleLabel } from "../lib/permissions";
import { confirmUnsavedChanges } from "../lib/useUnsavedChangesWarning";
import { DEFAULT_SYSTEM_SETTINGS, cacheSystemSettings, mergeSystemSettings } from "../lib/systemSettings";
import { findMembersByEmail, highestRoleForMembers, memberEmailResolution } from "../lib/memberLookup";
import { APP_VERSION } from "../lib/version";
import { adminNavigationSections } from "../lib/adminNavigation";
import adminShellStyles from "../design-preview/page.module.css";

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 7a3 3 0 0 1 0 6m-1 2a5 5 0 0 1 5 5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  structure: <><circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M6 17v-3h12v3"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/></>,
  modules: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 14v6m-3-3h6"/></>,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.2-1.5 2.7m0 3.5h.01"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  external: <><path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v6H5V6h6"/></>,
  logout: <><path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"/></>,
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function memberDisplayName(member) {
  return [member?.first_name, member?.last_name].filter(Boolean).join(" ").trim() || member?.full_name || member?.email || "User";
}

function memberInitials(member) {
  return memberDisplayName(member).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function profilePhotoUrl(member) {
  const urls = Array.isArray(member?.profile_image_urls) ? member.profile_image_urls : [];
  return urls.find((url) => String(url).includes("/storage/v1/object/public/profile-photos/")) || "";
}

function ProfileAvatar({ member, size = 40 }) {
  const imageUrl = profilePhotoUrl(member);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-900 font-black text-white shadow-md" style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.3)) }}>
      {imageUrl && !failed ? <Image src={imageUrl} width={96} height={96} alt={`${memberDisplayName(member)} profile`} className="h-full w-full object-cover" onError={() => setFailed(true)} unoptimized/> : memberInitials(member)}
    </span>
  );
}

export default function AppHeader({
  title = "League Management",
  subtitle = "League operations and administration.",
  hideSubtitleOnMobile = false,
  actions = null,
  welcomeAction = null,
  mobileSidebarAction = null,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("player");
  const [member, setMember] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("");
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [memberEmailIssue, setMemberEmailIssue] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const dashboardLinks = useMemo(() => [
    { label: "Player Dashboard", path: "/design-preview", aliases: ["/player-dashboard"], role: "player" },
    { label: "Captain Dashboard", path: "/design-preview/captain", aliases: ["/captain-dashboard"], role: "captain" },
    { label: "Admin Dashboard", path: "/", aliases: ["/design-preview/admin"], role: "league_manager" },
  ].filter((link) => hasRole(role, link.role)), [role]);

  const adminGroups = useMemo(() => {
    if (!hasRole(role, "league_manager")) return [];
    return adminNavigationSections(role).map((section) => ({
      key: section.key,
      label: section.navLabel,
      icon: section.icon,
      links: section.cards.map((card) => ({
        label: card.title,
        path: card.path,
        dialog: card.dialog,
      })),
    }));
  }, [role]);

  const quickLinks = useMemo(() => hasRole(role, "league_manager") ? [
    { label: "League Analytics", path: "/#admin-preview-analytics", icon: "structure" },
    { label: "Dashboard Guides", path: "/?adminPanel=guides", icon: "document" },
    { label: "Dashboard Messages", path: "/?adminPanel=messages", icon: "document" },
  ] : [], [role]);

  const isPathActive = useCallback((path, aliases = []) => {
    const paths = [path, ...aliases];
    return paths.some((candidate) => candidate === "/" ? pathname === "/" : pathname === candidate || pathname.startsWith(`${candidate}/`));
  }, [pathname]);

  const activeAdminGroup = useMemo(() => adminGroups.find((group) => group.links.some((link) => isPathActive(link.path))), [adminGroups, isPathActive]);
  const dashboardActive = dashboardLinks.some((link) => isPathActive(link.path, link.aliases));
  const contextLabel = activeAdminGroup?.label || (dashboardActive ? (hasRole(role, "league_manager") ? "Admin Dashboard" : "Dashboard") : "Administration");
  const displayName = memberDisplayName(member);
  const firstName = member?.first_name || displayName.split(" ")[0] || "User";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: memberRows } = await findMembersByEmail(supabase, user.email, "id, first_name, last_name, email, is_active_member, profile_image_urls, user_roles(role)");
      const { activeMembers, duplicateCount, hasDuplicateMemberships, selectedMember } = memberEmailResolution(memberRows);
      const selected = selectedMember || { email: user.email, profile_image_urls: [] };
      setMember(selected);
      setRole(highestRoleForMembers(activeMembers.length > 0 ? activeMembers : [selected]));
      setMemberEmailIssue(hasDuplicateMemberships ? { count: duplicateCount, selectedName: memberDisplayName(selected) } : null);
    }

    async function loadSettings() {
      const response = await fetch("/api/system-settings");
      const result = await response.json().catch(() => ({}));
      if (result.settings) {
        const nextSettings = mergeSystemSettings(result.settings);
        cacheSystemSettings(nextSettings);
        setSystemSettings(nextSettings);
      }
    }

    load();
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeAdminGroup) setOpenGroup(activeAdminGroup.key);
    else if (dashboardActive && dashboardLinks.length > 1) setOpenGroup("dashboard");
  }, [activeAdminGroup, dashboardActive, dashboardLinks.length]);

  useEffect(() => {
    function closeDialogs(event) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setProfileOpen(false);
      if (!logoutPending) setLogoutDialogOpen(false);
    }
    window.addEventListener("keydown", closeDialogs);
    return () => window.removeEventListener("keydown", closeDialogs);
  }, [logoutPending]);

  function navigate(path) {
    if (!confirmUnsavedChanges()) return;
    setMenuOpen(false);
    setProfileOpen(false);
    router.push(path);
  }

  function toggleGroup(key) {
    setOpenGroup((current) => current === key ? "" : key);
  }

  function requestLogout() {
    if (!confirmUnsavedChanges()) return;
    setLogoutError("");
    setMenuOpen(false);
    setProfileOpen(false);
    setLogoutDialogOpen(true);
  }

  async function logout() {
    setLogoutPending(true);
    setLogoutError("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
      setLogoutPending(false);
      return;
    }
    setLogoutDialogOpen(false);
    router.replace("/login");
    router.refresh();
  }

  function navigationTarget(link) {
    return link.dialog ? `/?adminPanel=${encodeURIComponent(link.dialog)}` : link.path;
  }

  function NavLink({ link, nested = false }) {
    const active = isPathActive(link.path, link.aliases);
    if (nested) {
      return (
        <button type="button" onClick={() => navigate(navigationTarget(link))} aria-current={active ? "page" : undefined} className={active ? adminShellStyles.submenuActive : ""}>
          <span>{link.label}</span>
        </button>
      );
    }
    return (
      <button type="button" onClick={() => navigate(navigationTarget(link))} aria-current={active ? "page" : undefined} className={active ? adminShellStyles.active : ""}>
        <Icon name={link.icon || "document"} size={20}/><span><b>{link.label}</b></span>
      </button>
    );
  }

  function Group({ group }) {
    const expanded = openGroup === group.key;
    const active = group.links.some((link) => isPathActive(link.path, link.aliases));
    return (
      <div className={adminShellStyles.navGroup}>
        <button type="button" onClick={() => toggleGroup(group.key)} aria-expanded={expanded} className={active ? adminShellStyles.active : ""}>
          <Icon name={group.icon} size={20}/><span><b>{group.label}</b></span>
        </button>
        {expanded && <div className={adminShellStyles.submenu}>{group.links.map((link) => <NavLink key={`${link.path}-${link.label}`} link={link} nested/>)}</div>}
      </div>
    );
  }

  function Navigation({ className = "" }) {
    const dashboardExpandable = dashboardLinks.length > 1;
    const setupGroups = adminGroups.filter((group) => group.key !== "modules");
    const moduleGroups = adminGroups.filter((group) => group.key === "modules");
    return (
      <nav className={`${adminShellStyles.sideNav} ${className}`} aria-label="League Management navigation">
        {dashboardExpandable ? <Group group={{ key: "dashboard", label: "Dashboard", icon: "dashboard", links: dashboardLinks }}/> : dashboardLinks[0] ? <NavLink link={{ ...dashboardLinks[0], label: "Dashboard", icon: "dashboard" }}/> : null}
        {quickLinks.slice(0, 1).map((link) => <NavLink key={link.path} link={link}/>)}
        {setupGroups.map((group) => <Group key={group.key} group={group}/>)}
        {quickLinks.slice(1).map((link) => <NavLink key={link.path} link={link}/>)}
        {moduleGroups.map((group) => <Group key={group.key} group={group}/>)}
      </nav>
    );
  }

  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubWebsite = systemSettings.club_website || DEFAULT_SYSTEM_SETTINGS.club_website;
  const membershipUrl = systemSettings.membership_url || DEFAULT_SYSTEM_SETTINGS.membership_url;
  const contactEmail = systemSettings.main_email || DEFAULT_SYSTEM_SETTINGS.main_email;

  return (
    <>
      <aside className={adminShellStyles.sidebar} style={{ "--blue": "#1558d5" }}>
        <a href={clubWebsite} target="_blank" rel="noreferrer" className={adminShellStyles.brand} title={`Open ${clubName} website`}>
          <Image src={logoUrl} alt={clubName} width={46} height={46} unoptimized/>
          <strong>{clubName}</strong>
        </a>
        <Navigation/>
        <div className={adminShellStyles.season}>
          <span>Selected scope</span>
          <strong>Active Seasons</strong>
          <small>Admin operations</small>
        </div>
        <p className={adminShellStyles.sidebarCopyright}>{"\u00A9"} {new Date().getFullYear()} {clubName}</p>
      </aside>

      <header className="-mt-4 mx-auto mb-2 hidden min-h-[68px] max-w-[1180px] items-center justify-between gap-5 md:-mt-6 min-[701px]:flex">
        <div className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-[.13em] text-[#76839a]">{contextLabel}</span>
          <h1 className="mt-1 truncate text-[25px] font-black leading-tight tracking-[-.02em] text-[#102e64]">Welcome, {firstName}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate(`/help/${role}`)} className="grid h-11 w-11 place-items-center rounded-full border border-[#e3e8f0] bg-white text-[#536079] transition hover:-translate-y-0.5 hover:border-[#99b7ed] hover:text-[#1558d5]" aria-label="Open User Guide" title="User Guide"><Icon name="help" size={20}/></button>
          <a href={`mailto:${contactEmail}`} className="grid h-11 w-11 place-items-center rounded-full border border-[#e3e8f0] bg-white text-[#536079] transition hover:-translate-y-0.5 hover:border-[#99b7ed] hover:text-[#1558d5]" aria-label="Email League Management" title="Email League Management"><Icon name="mail" size={20}/></a>
          <div className="ml-2 grid min-w-[112px] text-right"><strong className="truncate text-[14px] font-black text-[#102e64]">{displayName}</strong><small className="text-[12px] font-semibold text-[#76839a]">{roleLabel(role)}</small></div>
          <button type="button" onClick={() => setProfileOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border border-[#e3e8f0] bg-white p-1 shadow-sm transition hover:border-[#b8cbec] hover:shadow-md" aria-label="Open profile" aria-haspopup="dialog"><ProfileAvatar member={member} size={40}/></button>
        </div>
      </header>

      <header className="sticky top-0 z-30 -mx-4 -mt-4 mb-3 grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#dce4ef] bg-[#f7f9fc]/95 px-4 py-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl min-[701px]:hidden">
        <div className="flex items-center gap-2"><button type="button" onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-[#dce4ef] bg-white text-[#102e64]" aria-label="Open navigation">{"\u2630"}</button><a href={clubWebsite} target="_blank" rel="noreferrer"><Image src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white object-contain" unoptimized/></a></div>
        <div className="min-w-0 text-center"><strong className="block truncate text-[13px] font-black text-[#102e64]">{title}</strong><span className="block truncate text-[14px] font-black text-[#102e64]">{contextLabel}</span></div>
        <div className="flex items-center gap-1"><button type="button" onClick={() => navigate(`/help/${role}`)} className="grid h-9 w-9 place-items-center rounded-full border border-[#dce4ef] bg-white text-[#536079]" aria-label="Open User Guide"><Icon name="help" size={18}/></button><button type="button" onClick={() => setProfileOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-transparent" aria-label="Open profile"><ProfileAvatar member={member} size={36}/></button></div>
      </header>

      <section className="mx-auto mb-6 max-w-[1180px] overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-[#102e64] via-[#154b9b] to-[#1558d5] px-5 py-5 text-white shadow-[0_14px_32px_rgba(20,64,145,.16)] md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#bcd1f6]">{contextLabel}</span><h2 className="mt-1 text-[24px] font-black leading-tight text-white">{title}</h2><p className={`${hideSubtitleOnMobile ? "hidden sm:block" : ""} mt-1 max-w-3xl text-[14px] font-semibold leading-5 text-[#d8e5fb]`}>{subtitle}</p></div>
          {(actions || welcomeAction) && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}{welcomeAction}</div>}
        </div>
      </section>

      {memberEmailIssue && <div className="mx-auto mb-6 max-w-[1180px] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950 shadow-sm">This login email is linked to {memberEmailIssue.count} member records. Showing data for {memberEmailIssue.selectedName || "the first active member record"}. Contact league support if this does not look right.</div>}

      {menuOpen && <div className="fixed inset-0 z-[60] min-[701px]:hidden"><button type="button" className="absolute inset-0 bg-slate-950/60" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/><aside className="relative flex h-full w-[min(88vw,320px)] flex-col overflow-y-auto bg-gradient-to-b from-[#102e64] to-[#0d2249] p-5 text-white shadow-2xl" style={{ "--blue": "#1558d5" }}><div className="flex items-center justify-between gap-3"><a href={clubWebsite} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3"><Image src={logoUrl} alt={clubName} width={46} height={46} className="h-11 w-11 rounded-full bg-white object-contain" unoptimized/><strong className="text-sm font-black leading-tight">{clubName}</strong></a><button type="button" onClick={() => setMenuOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl" aria-label="Close navigation">{"\u00D7"}</button></div><Navigation className="mt-5"/>{mobileSidebarAction && <div className="mt-5" onClick={() => setMenuOpen(false)}>{mobileSidebarAction}</div>}<p className="mt-auto pt-6 text-center text-[11px] font-bold text-[#afc1dd]">{"\u00A9"} {new Date().getFullYear()} {clubName}</p></aside></div>}

      {profileOpen && <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="shared-profile-title"><button type="button" className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setProfileOpen(false)} aria-label="Close profile"/><section className="relative w-full max-w-[500px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"><header className="flex items-center gap-4 bg-gradient-to-r from-[#102e64] to-[#1558d5] px-5 py-5 text-white"><ProfileAvatar member={member} size={54}/><div className="min-w-0 flex-1"><span className="text-[11px] font-black uppercase tracking-[.12em] text-[#bcd1f6]">Signed-in profile</span><h2 id="shared-profile-title" className="truncate text-[23px] font-black">{displayName}</h2><p className="truncate text-[13px] font-semibold text-[#d8e5fb]">{roleLabel(role)}{member?.email ? ` - ${member.email}` : ""}</p></div><button type="button" onClick={() => setProfileOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-2xl" aria-label="Close profile">{"\u00D7"}</button></header><div className="grid gap-2 p-4">
        <button type="button" onClick={() => navigate(`/reset-password?returnTo=${encodeURIComponent(pathname)}`)} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"><Icon name="lock"/><span className="grid flex-1"><strong className="text-[15px] font-black text-slate-900">Change Password</strong><small className="text-[13px] font-semibold text-slate-500">Update this account</small></span><span aria-hidden="true">{"\u203A"}</span></button>
        <a href={membershipUrl} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"><Icon name="external"/><span className="grid flex-1"><strong className="text-[15px] font-black text-slate-900">Club Membership</strong><small className="text-[13px] font-semibold text-slate-500">Open membership management</small></span><span aria-hidden="true">{"\u203A"}</span></a>
        {dashboardLinks.map((link) => <button type="button" key={link.path} onClick={() => navigate(link.path)} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"><Icon name="dashboard"/><span className="grid flex-1"><strong className="text-[15px] font-black text-slate-900">{link.label}</strong><small className="text-[13px] font-semibold text-slate-500">Switch dashboard view</small></span><span aria-hidden="true">{"\u203A"}</span></button>)}
        <button type="button" onClick={requestLogout} className="flex min-h-16 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 text-left text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"><Icon name="logout"/><span className="grid flex-1"><strong className="text-[15px] font-black">Log Out</strong><small className="text-[13px] font-semibold text-red-600">This browser or device only</small></span><span aria-hidden="true">{"\u203A"}</span></button>
      </div><footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-500"><span>Version {APP_VERSION}</span><span>{"\u00A9"} {new Date().getFullYear()} {clubName}</span></footer></section></div>}

      {logoutDialogOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title"><button type="button" className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => !logoutPending && setLogoutDialogOpen(false)} aria-label="Close logout dialog"/><section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><span className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Account</span><h2 id="logout-dialog-title" className="mt-1 text-2xl font-black text-slate-950">Log out of this device?</h2></div><div className="px-6 py-5"><div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><strong className="block font-black text-slate-950">{displayName}</strong><span className="mt-1 block text-sm font-semibold text-slate-600">{roleLabel(role)}</span></div><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">You will remain signed in on your other devices.</p>{logoutError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{logoutError}</div>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setLogoutDialogOpen(false)} disabled={logoutPending} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">Stay signed in</button><button type="button" onClick={logout} disabled={logoutPending} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">{logoutPending ? "Logging out..." : "Log out"}</button></div></div></section></div>}
    </>
  );
}
