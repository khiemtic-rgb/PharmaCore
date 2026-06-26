const SEEN_KEY = 'pharmacore.seenSentDraftIds';

export function loadSeenSentDraftIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function markSentDraftsSeen(ids: string[]) {
  if (ids.length === 0) return;
  const seen = loadSeenSentDraftIds();
  ids.forEach((id) => seen.add(id));
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function countUnseenSentDrafts(sentDraftIds: string[]): number {
  const seen = loadSeenSentDraftIds();
  return sentDraftIds.filter((id) => !seen.has(id)).length;
}

export function filterUnseenSentDrafts<T extends { id: string }>(items: T[]): T[] {
  const seen = loadSeenSentDraftIds();
  return items.filter((item) => !seen.has(item.id));
}
