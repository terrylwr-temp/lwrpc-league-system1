"use client";

import { useParams } from "next/navigation";
import OfficialDocumentViewer from "../../components/OfficialDocumentViewer";

export default function OfficialDocumentPage() {
  const params = useParams();
  return <OfficialDocumentViewer citation={String(params?.citation || "")}/>;
}
