import { getRequestAuthorizationHeaders } from "./auth";

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

// Dashboard guides live in the public documents bucket. These values stay
// separate from league-document settings, which can be customized per league.
export const DEFAULT_GUIDE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_GUIDES_BUCKET || "documents";
export const DEFAULT_GUIDE_PREFIX =
  process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_GUIDES_PREFIX || "league-documents";

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

    return normalizeGuideDocument(parsed);
  } catch {
    return normalizeGuideDocument({ path: template?.body || "" });
  }
}

export function guideDocumentBody(document) {
  const normalized = normalizeGuideDocument(document);

  return JSON.stringify({
    bucket: normalized.bucket,
    path: normalized.path,
  });
}

export function normalizeGuideDocument(document) {
  const bucket = String(document?.bucket || "").trim();
  const path = String(document?.path || "")
    .trim()
    .replace(/^\/+/, "");
  const normalizedPath = path.startsWith("private/")
    ? `${DEFAULT_GUIDE_PREFIX}/${path.slice("private/".length)}`
    : path && !path.includes("/")
      ? `${DEFAULT_GUIDE_PREFIX}/${path}`
      : path;

  return {
    bucket: bucket === "league-documents" ? DEFAULT_GUIDE_BUCKET : bucket || DEFAULT_GUIDE_BUCKET,
    path: normalizedPath,
  };
}

export async function loadGuideDocument(templateKey) {
  const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(templateKey)}`, {
    headers: await getRequestAuthorizationHeaders(),
  });
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

  const { data } = supabase.storage
    .from(guideDocument.bucket || DEFAULT_GUIDE_BUCKET)
    .getPublicUrl(guideDocument.path);
  const documentUrl = data?.publicUrl || "";

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
