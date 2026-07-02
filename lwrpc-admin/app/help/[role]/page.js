import { notFound } from "next/navigation";
import HelpCenterClient from "./HelpCenterClient";
import { helpRoleConfig, loadHelpGuide } from "../../lib/helpContent";

export async function generateMetadata({ params }) {
  const { role } = await params;
  const config = helpRoleConfig(role);

  return {
    title: config ? `${config.title} | LWR PC LMS` : "Help Center",
    description: config?.description || "LWR PC League Management System Help Center",
  };
}

export default async function HelpCenterPage({ params }) {
  const { role } = await params;
  const guide = loadHelpGuide(role);

  if (!guide) notFound();

  return <HelpCenterClient guide={guide} />;
}
