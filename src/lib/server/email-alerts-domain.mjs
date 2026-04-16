export function buildAlertEmailSubject({ appName, category, title }) {
  return `[${appName}] ${category}: ${title}`;
}

export function buildAlertEmailText({
  appName,
  category,
  title,
  lines,
  occurredAt,
}) {
  const parts = [
    `${appName} ${category} alert`,
    "",
    title,
  ];

  if (lines.length) {
    parts.push("", ...lines);
  }

  parts.push("", `time: ${occurredAt}`);

  return `${parts.join("\n")}\n`;
}
