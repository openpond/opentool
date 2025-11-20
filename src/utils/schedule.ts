import { NormalizedSchedule } from "../types/index";

const CRON_WRAPPED_REGEX = /^cron\((.*)\)$/i;
const CRON_TOKEN_REGEX = /^[A-Za-z0-9*?/,\-#L]+$/;

export function normalizeScheduleExpression(raw: string, context: string): NormalizedSchedule {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${context}: profile.schedule.cron must be a non-empty string`);
  }

  const cronBody = extractCronBody(value);
  const cronFields = cronBody.trim().split(/\s+/).filter(Boolean);

  if (cronFields.length !== 5 && cronFields.length !== 6) {
    throw new Error(`${context}: cron expression must have 5 or 6 fields (got ${cronFields.length})`);
  }

  validateCronTokens(cronFields, context);

  return {
    type: "cron",
    expression: cronFields.join(" "),
  };
}

function extractCronBody(value: string): string {
  const cronMatch = CRON_WRAPPED_REGEX.exec(value);
  if (cronMatch) {
    return (cronMatch[1] ?? "").trim();
  }
  return value;
}

function validateCronTokens(fields: string[], context: string): void {
  fields.forEach((token, idx) => {
    if (!CRON_TOKEN_REGEX.test(token)) {
      throw new Error(`${context}: invalid cron token "${token}" at position ${idx + 1}`);
    }
  });
}
