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
  const guideDocument = await loadGuideDocument(guideType.key);

  if (!guideDocument.path) {
    alert(`${guideType.label} is not configured yet.`);
    return;
  }

  const { data, error } = await supabase.storage
    .from(guideDocument.bucket || DEFAULT_GUIDE_BUCKET)
    .createSignedUrl(guideDocument.path, 60 * 60);

  if (!error && data?.signedUrl) {
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const publicUrl = supabase.storage
    .from(guideDocument.bucket || DEFAULT_GUIDE_BUCKET)
    .getPublicUrl(guideDocument.path);
  const documentUrl = publicUrl.data?.publicUrl || "";

  if (!documentUrl) {
    alert("Unable to open this guide. Check the Supabase Storage bucket and file path.");
    return;
  }

  window.open(documentUrl, "_blank", "noopener,noreferrer");
}
