export const DEFAULT_SYSTEM_SETTINGS = {
  club_name: "Lakewood Ranch Pickleball Club",
  club_short_name: "LWRPC",
  system_name: "LWRPC League Management System",
  logo_url: "https://lwrpickleballclub.com/lwrpc-logo.png",
  main_email: "info@lwrpickleballclub.com",
  support_email: "info@lwrpickleballclub.com",
  club_website: "https://lwrpickleballclub.com",
  membership_url: "https://lwrpickleballclub.com/manage-membership",
  league_site_url: "https://league.lwrpickleballclub.com",
  timezone: "America/New_York",
};

export const SYSTEM_SETTING_FIELDS = [
  {
    key: "club_name",
    label: "Club Name",
    type: "text",
    hint: "Full public club name shown in app branding and emails.",
  },
  {
    key: "club_short_name",
    label: "Short Name",
    type: "text",
    hint: "Short club abbreviation used where space is tight.",
  },
  {
    key: "system_name",
    label: "System Name",
    type: "text",
    hint: "Name of this league management system.",
  },
  {
    key: "logo_url",
    label: "Logo URL",
    type: "url",
    hint: "Public image URL for the club logo.",
  },
  {
    key: "main_email",
    label: "Main League Email",
    type: "email",
    hint: "Primary address for league questions and automated request emails.",
  },
  {
    key: "support_email",
    label: "Support Email",
    type: "email",
    hint: "Address for admin/support alerts.",
  },
  {
    key: "club_website",
    label: "Club Website",
    type: "url",
    hint: "Main public club website.",
  },
  {
    key: "membership_url",
    label: "Membership URL",
    type: "url",
    hint: "Membership or account-management page.",
  },
  {
    key: "league_site_url",
    label: "League Site URL",
    type: "url",
    hint: "Public URL for this league system deployment.",
  },
  {
    key: "timezone",
    label: "Timezone",
    type: "text",
    hint: "IANA timezone name used for display and email placeholders.",
  },
];

export function mergeSystemSettings(settings = {}) {
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...Object.fromEntries(
      Object.entries(settings || {}).filter(([, value]) => value !== null && value !== undefined && value !== "")
    ),
  };
}
