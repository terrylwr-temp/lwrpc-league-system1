"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { hasRole, roleLabel } from "../lib/permissions";
import { confirmUnsavedChanges } from "../lib/useUnsavedChangesWarning";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";
import { DEFAULT_SYSTEM_SETTINGS, cacheSystemSettings, mergeSystemSettings } from "../lib/systemSettings";
import { findMembersByEmail, highestRoleForMembers, memberEmailResolution } from "../lib/memberLookup";

export default function AppHeader({
  title = "LWR PC League Management System",
  subtitle = "League Operations Dashboard",
  actions = null,
  welcomeAction = null,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState("player");
  const [memberName, setMemberName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [memberEmailIssue, setMemberEmailIssue] = useState(null);

  const primaryLinks = useMemo(() => [
    { label: "Player Dashboard", path: "/player-dashboard", role: "player", icon: "\u{1F3E0}" },
    {
      label: "Captain Dashboard",
      path: "/captain-dashboard",
      role: "captain",
      icon: "\u{1F9E2}"
    },
    { label: "Admin Dashboard", path: "/", role: "league_manager", icon: "\u{2699}\u{FE0F}" }
  ], []);

  const groups = useMemo(() => [
    {
      key: "operations",
      label: "League Operations",
      links: [
        { label: "Members", path: "/members", role: "league_manager", icon: "\u{1F465}" },
        { label: "Ratings", path: "/ratings", role: "league_manager", icon: "\u{2B50}" },
        { label: "Scoring", path: "/scoring", role: "league_manager", icon: "\u{2705}" },
        { label: "Standings", path: "/standings", role: "player", icon: "\u{1F3C6}" }
      ]
    },
    {
      key: "scheduling",
      label: "Scheduling",
      links: [
        { label: "Scheduling", path: "/scheduling", role: "league_manager", icon: "\u{1F4C5}" },
        { label: "Schedule Editor", path: "/schedule-editor", role: "league_manager", icon: "\u{1F6E0}\u{FE0F}" },
        { label: "Matches", path: "/matches", role: "captain", icon: "\u{1F4CB}" }
      ]
    },
    {
      key: "league-setup",
      label: "League Setup",
      links: [
        { label: "Teams", path: "/teams", role: "captain", icon: "\u{1F3D3}" },
        { label: "Seasons", path: "/seasons", role: "league_manager", icon: "\u{1F4C6}" },
        { label: "Leagues", path: "/leagues", role: "league_manager", icon: "\u{1F3DF}\u{FE0F}" },
        { label: "Divisions", path: "/divisions", role: "league_manager", icon: "\u{1F4CA}" },
      ]
    },
    {
      key: "system-setup",
      label: "System Setup",
      links: [
        { label: "Locations", path: "/locations", role: "league_manager", icon: "\u{1F4CD}" },
        { label: "Email Options", path: "/email-options", role: "league_manager", icon: "\u{2709}\u{FE0F}" },
        { label: "Score Sheets", path: "/score-sheets", role: "league_manager", icon: "\u{1F4DD}" },
        { label: "Club Setup", path: "/system-setup", role: "commissioner", icon: "\u{1F3F7}\u{FE0F}" },
      ]
    }
  ], []);

  async function loadUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.email) return;

    const { data: memberRows } = await findMembersByEmail(
      supabase,
      user.email,
      "id, first_name, last_name, email, is_active_member, user_roles(role)"
    );
    const { activeMembers, duplicateCount, hasDuplicateMemberships, selectedMember: member } =
      memberEmailResolution(memberRows);

    if (member) {
      setMemberName(
        `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
          member.email
      );
      setRole(highestRoleForMembers(activeMembers.length > 0 ? activeMembers : [member]));
      setMemberEmailIssue(
        hasDuplicateMemberships
          ? {
              count: duplicateCount,
              selectedName:
                `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
                member.email,
            }
          : null
      );
    } else {
      setMemberName(user.email);
      setRole("player");
      setMemberEmailIssue(null);
    }
  }

  async function logout() {
    if (!confirmUnsavedChanges()) return;

    await supabase.auth.signOut();
    router.push("/login");
  }

  async function loadSystemSettings() {
    const response = await fetch("/api/system-settings");
    const result = await response.json().catch(() => ({}));

    if (result.settings) {
      const nextSettings = mergeSystemSettings(result.settings);
      cacheSystemSettings(nextSettings);
      setSystemSettings(nextSettings);
    }
  }

  const isActive = useCallback(function isActive(path) {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  }, [pathname]);

  useEffect(() => {
    loadUser();
    loadSystemSettings();

    const savedCollapsed = window.localStorage.getItem("lwrpc-sidebar-collapsed");
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === "true");
    }
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "5rem" : "18rem"
    );
    if (sidebarReady) {
      window.localStorage.setItem("lwrpc-sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, sidebarReady]);

  useEffect(() => {
    const activeGroup = groups.find(group =>
      group.links.some(link => isActive(link.path))
    );

    if (activeGroup) {
      setOpenGroups({ [activeGroup.key]: true });
    }
  }, [groups, isActive]);

  const visiblePrimaryLinks = useMemo(() => {
    return primaryLinks.filter(link => hasRole(role, link.role));
  }, [primaryLinks, role]);

  const visibleGroups = useMemo(() => {
    if (role === "player" || role === "captain") return [];

    return groups
      .map(group => ({
        ...group,
        links: group.links.filter(link => hasRole(role, link.role))
      }))
      .filter(group => group.links.length > 0);
  }, [groups, role]);

  function toggleGroup(key) {
    setOpenGroups(prev => (prev[key] ? {} : { [key]: true }));
  }

  function LinkButton({ link, mobile = false }) {
    const active = isActive(link.path);

    return (
      <button
        key={link.path}
        title={collapsed && !mobile ? link.label : ""}
        onClick={() => {
          if (!confirmUnsavedChanges()) return;

          router.push(link.path);
          setMenuOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
          active
            ? "bg-blue-700 text-white shadow"
            : "text-slate-200 hover:bg-blue-900 hover:text-white"
        } ${collapsed && !mobile ? "justify-center px-2" : ""}`}
      >
        <span className="text-lg">{link.icon}</span>

        {(!collapsed || mobile) && (
          <span>{link.label}</span>
        )}
      </button>
    );
  }

  function NavGroups({ mobile = false }) {
    return (
      <nav className="mt-6 space-y-3">
        <div className="space-y-1">
          {visiblePrimaryLinks.map(link => (
            <LinkButton
              key={link.path}
              link={link}
              mobile={mobile}
            />
          ))}
        </div>

        {visibleGroups.map(group => (
          <div key={group.key}>
            {!collapsed || mobile ? (
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400 hover:bg-white/5"
              >
                <span>{group.label}</span>
                <span>{openGroups[group.key] ? "\u{2212}" : "+"}</span>
              </button>
            ) : (
              <div className="my-2 border-t border-white/10" />
            )}

            {(openGroups[group.key] || collapsed || mobile) && (
              <div className="mt-1 space-y-1">
                {group.links.map(link => (
                  <LinkButton
                    key={link.path}
                    link={link}
                    mobile={mobile}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    );
  }

  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const systemName = systemSettings.system_name || DEFAULT_SYSTEM_SETTINGS.system_name;
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubWebsite = systemSettings.club_website || DEFAULT_SYSTEM_SETTINGS.club_website;

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen bg-slate-950 text-white shadow-2xl transition-all duration-200 lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <a
              href={clubWebsite}
              target="_blank"
              rel="noreferrer"
              title={`Open ${clubName} website`}
              className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <Image
                src={logoUrl}
                alt={clubName}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full bg-white object-contain p-1"
                unoptimized
              />
            </a>

            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-black leading-tight">
                  {clubName}
                </div>

                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-yellow-300">
                  {systemName}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "\u{2192}" : "\u{2190} Collapse"}
          </button>

          <NavGroups />

          <div className="mt-auto border-t border-white/10 pt-5">
            {!collapsed ? (
              <>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Signed in as
                </div>

                <div className="mt-1 text-sm font-bold text-white">
                  {memberName || "User"}
                </div>

                <div className="mt-1 text-xs text-slate-300">
                  {roleLabel(role)}
                </div>

                <button
                  onClick={logout}
                  className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Logout
                </button>

                <div className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
                  {"\u{00A9}"} {COPYRIGHT_YEAR} {clubName}
                  <br />
                  All rights reserved.
                  <br />
                  Version {APP_VERSION}
                </div>
              </>
            ) : (
              <button
                onClick={logout}
                className="w-full rounded-xl bg-white/10 px-2 py-3 text-sm font-semibold text-white hover:bg-white/20"
                title="Logout"
              >
                {"\u{23FB}"}
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow">
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-500" />
        <div className="flex flex-col gap-4 bg-gradient-to-r from-slate-950 to-blue-950 px-5 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-xl bg-white/10 px-3 py-2 text-white hover:bg-white/20 lg:hidden"
            >
              {"\u{2630}"}
            </button>

            <Image
              src={logoUrl}
              alt={clubName}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-contain lg:hidden"
              unoptimized
            />

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-sky-200">
                {systemName}
              </div>

              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">
                {title}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-200">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            {actions && (
              <div className="flex flex-wrap gap-2 md:justify-end">
                {actions}
              </div>
            )}

            <div className="hidden flex-col items-end gap-2 md:flex">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-wide text-sky-200">
                  Welcome
                </div>

                <div className="font-bold text-white">
                  {memberName || "User"}
                </div>

                <div className="text-xs text-slate-200">
                  {roleLabel(role)}
                </div>
              </div>

              {welcomeAction}
            </div>
          </div>
        </div>
      </div>

      {memberEmailIssue && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950 shadow-sm">
          This login email is linked to {memberEmailIssue.count} member records. Showing data for {memberEmailIssue.selectedName || "the first active member record"}. Contact league support if this does not look right.
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative h-full w-80 max-w-[85vw] overflow-y-auto bg-slate-950 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <a
                href={clubWebsite}
                target="_blank"
                rel="noreferrer"
                title={`Open ${clubName} website`}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <Image
                  src={logoUrl}
                  alt={clubName}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full bg-white object-contain p-1"
                  unoptimized
                />
              </a>

              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-2 font-bold"
              >
                {"\u{2715}"}
              </button>
            </div>

            <div className="mt-4 text-lg font-black">
              {clubName}
            </div>

            <div className="text-sm font-bold uppercase tracking-wide text-yellow-300">
              {systemName}
            </div>

            <NavGroups mobile />

            <button
              onClick={logout}
              className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 font-semibold text-white"
            >
              Logout
            </button>

            <div className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
              {"\u{00A9}"} {COPYRIGHT_YEAR} {clubName}
              <br />
              All rights reserved.
              <br />
              Version {APP_VERSION}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

