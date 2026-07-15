import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  DEFAULT_LEAGUE_DOCUMENT_PREFIX,
} from "./leagueDocuments";

export const GUIDE_DOCUMENT_TYPES = [
  {
    key: "player_guide_pdf",
    label: "Players Guide",
    buttonLabel: "Players Guide",
  },
  {
    key: "captain_guide_pdf",
    label: "Captains Guide",
    buttonLabel: "Captains Guide",
  },
  {
    key: "admin_guide_pdf",
    label: "Admin Guide",
    buttonLabel: "Admin Guide",
  },
];

export const DEFAULT_GUIDE_BUCKET = DEFAULT_LEAGUE_DOCUMENT_BUCKET;
export const DEFAULT_GUIDE_PREFIX = DEFAULT_LEAGUE_DOCUMENT_PREFIX;

export function initialGuideDocuments() {
  return Object.fromEntries(
    GUIDE_DOCUMENT_TYPES.map((guideType) => [
      guideType.key,
      {
        bucket: DEFAULT_GUIDE_BUCKET,
        path: "",
      },
    ])
  );
}

export function parseGuideDocument(template) {
  try {
    const parsed = JSON.parse(template?.body || "{}");

    return {
      bucket: parsed.bucket || DEFAULT_GUIDE_BUCKET,
      path: parsed.path || "",
    };
  } catch {
    return {
      bucket: DEFAULT_GUIDE_BUCKET,
      path: template?.body || "",
    };
  }
}

export function guideDocumentBody(document) {
  return JSON.stringify({
    bucket: document?.bucket || DEFAULT_GUIDE_BUCKET,
    path: document?.path || "",
  });
}

export async function loadGuideDocument(templateKey) {
  const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(templateKey)}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    return {
      bucket: DEFAULT_GUIDE_BUCKET,
      path: "",
    };
  }

  return parseGuideDocument(result.template);
}

export async function openGuideDocument(supabase, guideType) {
  const guideWindow = window.open("", "_blank");
  const document = await guidePdfDocument(supabase, guideType);

  if (!document) {
    guideWindow?.close();
    return;
  }

  if (!guideWindow) {
    alert("Unable to open the guide. Please allow popups for this site and try again.");
    return;
  }

  guideWindow.opener = null;
  guideWindow.location.replace(document.url);
}

export async function guidePdfDocument(supabase, guideType) {
  const guideDocument = await loadGuideDocument(guideType.key);

  if (!guideDocument.path) {
    alert(`${guideType.label} is not configured yet.`);
    return null;
  }

  const { data, error } = await supabase.storage
    .from(guideDocument.bucket || DEFAULT_GUIDE_BUCKET)
    .createSignedUrl(guideDocument.path, 60 * 60);

  if (!error && data?.signedUrl) {
    return {
      title: guideType.label,
      leagueName: "Dashboard Guide",
      teamName: guideType.buttonLabel,
      url: data.signedUrl,
      path: guideDocument.path,
    };
  }

  const publicUrl = supabase.storage
    .from(guideDocument.bucket || DEFAULT_GUIDE_BUCKET)
    .getPublicUrl(guideDocument.path);
  const documentUrl = publicUrl.data?.publicUrl || "";

  if (!documentUrl) {
    alert("Unable to open this guide. Check the Supabase Storage bucket and file path.");
    return null;
  }

  return {
    title: guideType.label,
    leagueName: "Dashboard Guide",
    teamName: guideType.buttonLabel,
    url: documentUrl,
    path: guideDocument.path,
  };
}
