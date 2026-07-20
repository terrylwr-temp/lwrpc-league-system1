"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const SIDEBAR_THEME_KEY = "lwrpc-dashboard-sidebar-theme";
const CARD_HEADER_THEME_KEY = "lwrpc-dashboard-card-header-theme";

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

  useEffect(() => {
    setIsLightSidebar(storedLightPreference(SIDEBAR_THEME_KEY));
    setIsLightCardHeaders(storedLightPreference(CARD_HEADER_THEME_KEY));
  }, []);

  function updatePreference(setter, key) {
    setter((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(key, next ? "light" : "dark");
      } catch {
        // The preference still applies for this visit if browser storage is unavailable.
      }
      return next;
    });
  }

  return {
    isLightSidebar,
    isLightCardHeaders,
    toggleSidebarTheme: () => updatePreference(setIsLightSidebar, SIDEBAR_THEME_KEY),
    toggleCardHeaderTheme: () => updatePreference(setIsLightCardHeaders, CARD_HEADER_THEME_KEY),
  };
}

export function DashboardAppearanceControls({ isLightSidebar, isLightCardHeaders, onToggleSidebar, onToggleCardHeaders }) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <label>
          <span><strong>Card Headers</strong><small>{isLightCardHeaders ? "Light background / dark text" : "Dark background / light text"}</small></span>
          <input type="checkbox" checked={isLightCardHeaders} onChange={onToggleCardHeaders}/>
          <i className={styles.appearanceSwitch} aria-hidden="true"/>
        </label>
      </div>}
    </section>
  );
}
