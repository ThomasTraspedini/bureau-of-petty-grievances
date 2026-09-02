export function pseudoLocalize(value: string): string {
  const expanded = value.replace(/\{[^}]+\}|[A-Za-z]/g, (token) => {
    if (token.startsWith("{")) {
      return token;
    }

    const replacements: Record<string, string> = {
      a: "à",
      e: "ë",
      i: "ï",
      o: "ô",
      u: "ü",
      A: "À",
      E: "Ë",
      I: "Ï",
      O: "Ö",
      U: "Ü",
    };

    return replacements[token] ?? token;
  });

  return `［${expanded} ···］`;
}

function isCatalog(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pseudoLocalizeCatalog(
  catalog: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [
      key,
      typeof value === "string"
        ? pseudoLocalize(value)
        : isCatalog(value)
          ? pseudoLocalizeCatalog(value)
          : value,
    ]),
  );
}
