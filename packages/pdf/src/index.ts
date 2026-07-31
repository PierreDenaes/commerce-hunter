import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AuditReport, type AuditReportData } from "./audit-report.js";

export type { AuditReportData } from "./audit-report.js";

export async function renderAuditReport(
  data: AuditReportData,
): Promise<Buffer> {
  // AuditReport renders <Document> as root — the type cast satisfies
  // renderToBuffer's strict ReactElement<DocumentProps> signature.
  const element = React.createElement(AuditReport, { data }) as unknown as React.ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
