import type { DeterminationSnapshot } from "@/domain/determination/determination-experience";

export function remedyStampPlacement(
  snapshot: Pick<DeterminationSnapshot, "reference" | "issuedAt">,
) {
  // Both fields survive session restoration and publication, including old records.
  let hash = 2166136261;
  for (const character of `${snapshot.reference}|${snapshot.issuedAt}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }

  return {
    x: (hash % 11) - 5,
    y: (Math.floor(hash / 11) % 9) - 4,
    rotation: (Math.floor(hash / 99) % 7) - 10,
  };
}
