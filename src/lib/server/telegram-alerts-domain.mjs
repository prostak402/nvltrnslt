export function buildTelegramAlertMessage(input) {
  const categoryLabel = input.category === "error" ? "error" : "admin";
  const lines = [
    `[${input.appName}] ${categoryLabel}: ${input.title}`,
    ...input.lines.filter(Boolean),
    `time: ${input.occurredAt}`,
  ];

  return `${lines.join("\n")}\n`;
}

export function shouldSendTelegramAlert(previousSentAt, now, minIntervalMs) {
  if (!previousSentAt || !minIntervalMs || minIntervalMs <= 0) {
    return true;
  }

  const previousMs =
    previousSentAt instanceof Date
      ? previousSentAt.getTime()
      : new Date(previousSentAt).getTime();

  if (Number.isNaN(previousMs)) {
    return true;
  }

  return now.getTime() - previousMs >= minIntervalMs;
}
