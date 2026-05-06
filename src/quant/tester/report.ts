import { quantTesterReportV1Schema, type QuantTesterReportV1 } from "../schemas";

export function finalizeQuantTesterReport(report: QuantTesterReportV1): QuantTesterReportV1 {
  return quantTesterReportV1Schema.parse(report);
}
