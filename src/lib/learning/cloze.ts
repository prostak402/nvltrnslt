const CLOZE_TOKEN_REGEX = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

type ClozeToken = {
  index: number;
  value: string;
  start: number;
  end: number;
};

export type ClozeData = {
  hasCloze: boolean;
  clozeText: string | null;
  clozeAnswer: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractClozeTokens(context: string): ClozeToken[] {
  const tokens: ClozeToken[] = [];
  const normalizedContext = context ?? "";

  for (const match of normalizedContext.matchAll(CLOZE_TOKEN_REGEX)) {
    const value = match[0];
    const start = match.index;
    if (start === undefined) {
      continue;
    }

    tokens.push({
      index: tokens.length + 1,
      value,
      start,
      end: start + value.length,
    });
  }

  return tokens;
}

function buildClozeFromToken(context: string, token: ClozeToken): ClozeData {
  return {
    hasCloze: true,
    clozeText: `${context.slice(0, token.start)}______${context.slice(token.end)}`,
    clozeAnswer: token.value,
  };
}

function buildLegacyCloze(context: string, answer: string): ClozeData {
  const trimmedAnswer = answer.trim();
  const trimmedContext = context.trim();

  if (!trimmedAnswer || !trimmedContext) {
    return {
      hasCloze: false,
      clozeText: null,
      clozeAnswer: null,
    };
  }

  const pattern = new RegExp(escapeRegExp(trimmedAnswer), "i");
  const match = trimmedContext.match(pattern);
  if (!match || match.index === undefined) {
    return {
      hasCloze: false,
      clozeText: null,
      clozeAnswer: null,
    };
  }

  const matchedValue = match[0];
  return {
    hasCloze: true,
    clozeText: `${trimmedContext.slice(0, match.index)}______${trimmedContext.slice(match.index + matchedValue.length)}`,
    clozeAnswer: matchedValue,
  };
}

export function buildClozeData(params: {
  context: string;
  answer: string;
  contextWordPosition?: number | null;
}): ClozeData {
  const context = params.context ?? "";
  const answer = params.answer ?? "";
  const contextWordPosition =
    typeof params.contextWordPosition === "number" && Number.isInteger(params.contextWordPosition)
      ? params.contextWordPosition
      : null;

  if (contextWordPosition !== null && contextWordPosition > 0) {
    const tokens = extractClozeTokens(context);
    const token = tokens.find((entry) => entry.index === contextWordPosition);
    if (token) {
      return buildClozeFromToken(context, token);
    }
  }

  return buildLegacyCloze(context, answer);
}
