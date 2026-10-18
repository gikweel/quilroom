export interface DocMeta {
  id: string;
  title: string;
  hasPassword?: boolean;
  created_at: string;
  updated_at: string;
  last_edited_by?: string | null;
}

const base = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  // Only set JSON content-type when we actually send a body.
  // Empty DELETE/GET with Content-Type: application/json causes Fastify 400.
  if (options?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || res.statusText || 'Request failed'
    );
  }
  // 204 or empty
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function listDocs() {
  return request<DocMeta[]>('/api/docs');
}

export function getDoc(id: string) {
  return request<DocMeta>(`/api/docs/${id}`);
}

export function createDoc(title?: string) {
  return request<DocMeta>('/api/docs', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function updateDoc(
  id: string,
  data: { title?: string; password?: string | null }
) {
  return request<DocMeta>(`/api/docs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function unlockDoc(id: string, password: string) {
  return request<{ ok: boolean }>(`/api/docs/${id}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deleteDoc(id: string) {
  return request<{ ok: boolean }>(`/api/docs/${id}`, { method: 'DELETE' });
}

export function getPresence() {
  return request<Record<string, number>>('/api/presence');
}
