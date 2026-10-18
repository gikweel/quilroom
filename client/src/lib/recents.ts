import type { DocMeta } from './api';

const KEY = 'quilroom_recent_docs';
const MAX = 20;

export interface RecentDoc {
  id: string;
  title: string;
  openedAt: string;
}

export function getRecents(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentDoc[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function touchRecent(doc: Pick<DocMeta, 'id' | 'title'>) {
  const list = getRecents().filter((d) => d.id !== doc.id);
  list.unshift({
    id: doc.id,
    title: doc.title || 'Untitled',
    openedAt: new Date().toISOString(),
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function removeRecent(id: string) {
  const list = getRecents().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function updateRecentTitle(id: string, title: string) {
  const list = getRecents().map((d) =>
    d.id === id ? { ...d, title: title || 'Untitled' } : d
  );
  localStorage.setItem(KEY, JSON.stringify(list));
}
