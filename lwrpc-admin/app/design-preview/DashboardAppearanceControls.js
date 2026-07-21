"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const SIDEBAR_THEME_KEY = "lwrpc-dashboard-sidebar-theme";
const CARD_HEADER_THEME_KEY = "lwrpc-dashboard-card-header-theme";
const SIDEBAR_COLLAPSED_KEY = "lwrpc-dashboard-sidebar-collapsed";
const APPEARANCE_CHANGE_EVENT = "lwrpc-dashboard-appearance-change";

function storedLightPreference(key) {
  try {
    return window.localStorage.getItem(key) === "light";
  } catch {
    return false;
  }
}

export function useDashboardAppearance() {
  const [isLightSidebar, setIsLightSidebar] = useState(false);
  const [isLightCardHeaders, setIsLightCardHeaders] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    function syncStoredPreferences(event) {
      if (event?.type === "storage" && event.key && ![SIDEBAR_THEME_KEY, CARD_HEADER_THEME_KEY, SIDEBAR_COLLAPSED_KEY].includes(event.key)) return;
      setIsLightSidebar(storedLightPreference(SIDEBAR_THEME_KEY));
      setIsLightCardHeaders(storedLightPreference(CARD_HEADER_THEME_KEY));
      setIsSidebarCollapsed(storedLightPreference(SIDEBAR_COLLAPSED_KEY));
    }

    syncStoredPreferences();
    window.addEventListener("storage", syncStoredPreferences);
    window.addEventListener("focus", syncStoredPreferences);
    window.addEventListener("pageshow", syncStoredPreferences);
    window.addEventListener(APPEARANCE_CHANGE_EVENT, syncStoredPreferences);

    return () => {
      window.removeEventListener("storage", syncStoredPreferences);
      window.removeEventListener("focus", syncStoredPreferences);
      window.removeEventListener("pageshow", syncStoredPreferences);
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, syncStoredPreferences);
    };
  }, []);

  function updatePreference(setter, key) {
    setter((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(key, next ? "light" : "dark");
        window.setTimeout(() => window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT)), 0);
      } catch {
        // The preference still applies for this visit if browser storage is unavailable.
      }
      return next;
    });
  }

  return {
    isLightSidebar,
    isLightCardHeaders,
    isSidebarCollapsed,
    toggleSidebarTheme: () => updatePreference(setIsLightSidebar, SIDEBAR_THEME_KEY),
    toggleCardHeaderTheme: () => updatePreference(setIsLightCardHeaders, CARD_HEADER_THEME_KEY),
    toggleSidebarCollapsed: () => updatePreference(setIsSidebarCollapsed, SIDEBAR_COLLAPSED_KEY),
  };
}

export function DashboardAppearanceControls({ isLightSidebar, isLightCardHeaders, isSidebarCollapsed, onToggleSidebar, onToggleCardHeaders, onToggleSidebarCollapsed }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fallbackAppearance = useDashboardAppearance();
  const sidebarCollapsed = typeof isSidebarCollapsed === "boolean" ? isSidebarCollapsed : fallbackAppearance.isSidebarCollapsed;
  const toggleSidebarCollapsed = onToggleSidebarCollapsed || fallbackAppearance.toggleSidebarCollapsed;

  return (
    <section className={styles.appearanceSettings}>
      <button type="button" className={styles.appearanceSettingsHeader} aria-expanded={isExpanded} aria-controls="dashboard-appearance-options" onClick={() => setIsExpanded((current) => !current)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <circle cx="12" cy="12" r="7"/>
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1"/>
        </svg>
        <span><strong>Dashboard Appearance</strong><small>Saved on this browser</small></span>
        <svg className={styles.appearanceChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      {isExpanded && <div className={styles.appearanceSettingsOptions} id="dashboard-appearance-options">
        <label>
          <span><strong>Sidebar Menu</strong><small>{isLightSidebar ? "Light background / dark text" : "Dark background / light text"}</small></span>
          <input type="checkbox" checked={isLightSidebar} onChange={onToggleSidebar}/>
          <i className={styles.appearanceSwitch} aria-hidden="true"/>
        </label>
        <label className={styles.appearanceCollapseSidebarOption}>
          <span><strong>Collapse Sidebar</strong><small>{sidebarCollapsed ? "Icons until you hover over it" : "Keep sidebar expanded"}</small></span>
          <input type="checkbox" checked={sidebarCollapsed} onChange={toggleSidebarCollapsed}/>
          <i className={styles.appearanceSwitch} aria-hidden="true"/>
        </label>
        <label>
          <span><strong>Card Headers</strong><small>{isLightCardHeaders ? "Light background / dark text" : "Dark background / light text"}</small></span>
          <input type="checkbox" checked={isLightCardHeaders} onChange={onToggleCardHeaders}/>
          <i className={styles.appearanceSwitch} aria-hidden="true"/>
        </label>
      </div>}
    </section>
  );
}
