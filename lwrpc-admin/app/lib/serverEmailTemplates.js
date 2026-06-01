import { createClient } from "@supabase/supabase-js";
import { getEmailTemplateConfig } from "./emailTemplates";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function loadEmailTemplate(templateKey) {
  const fallback = getEmailTemplateConfig(templateKey);
  const supabase = adminClient();

  if (!supabase) {
    return {
      template_key: templateKey,
      subject: fallback?.defaultSubject || "",
      body: fallback?.defaultBody || "",
    };
  }

  const { data, error } = await supabase
    .from("notification_templates")
    .select("template_key, subject, body")
    .eq("template_key", templateKey)
    .maybeSingle();

  if (error || !data) {
    return {
      template_key: templateKey,
      subject: fallback?.defaultSubject || "",
      body: fallback?.defaultBody || "",
    };
  }

  return {
    template_key: templateKey,
    subject: data.subject || fallback?.defaultSubject || "",
    body: data.body || fallback?.defaultBody || "",
  };
}
