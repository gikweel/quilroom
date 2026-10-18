import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listDocs,
  createDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  type DocMeta,
} from "../lib/api";
import {
  getRecents,
  removeRecent,
  updateRecentTitle,
  type RecentDoc,
} from "../lib/recents";
import { getIdentityLabel } from "../lib/identity";
import IdentityModal from "../components/IdentityModal";
import {
  pickTextFiles,
  pickFolderTextFiles,
  supportsDirectoryPicker,
  titleFromFilename,
  stashImport,
  textToQuillHtml,
} from "../lib/filesystem";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Extract doc id from a full URL or raw id */
function parseDocRef(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("/d/")) {
      const u = new URL(trimmed, window.location.origin);
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.indexOf("d");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    /* not a URL */
  }
  // raw id (nanoid-ish)
  if (/^[A-Za-z0-9_-]{8,32}$/.test(trimmed)) return trimmed;
  return null;
}

export default function DocList() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [recents, setRecents] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [identityLabel, setIdentityLabel] = useState(getIdentityLabel());
  const [openRef, setOpenRef] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    try {
      setError(null);
      const data = await listDocs();
      setDocs(data);
    } catch (e: any) {
      setError(e.message || "Cannot reach server");
    } finally {
      setLoading(false);
      setRecents(getRecents());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const doc = await createDoc();
      navigate(`/d/${doc.id}`);
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  }

  async function handleRename(id: string, current: string) {
    const title = prompt("Rename document", current);
    if (title === null) return;
    try {
      await updateDoc(id, { title });
      updateRecentTitle(id, title);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try {
      await deleteDoc(id);
      removeRecent(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleOpenRef(e: React.FormEvent) {
    e.preventDefault();
    setOpenError(null);
    const id = parseDocRef(openRef);
    if (!id) {
      setOpenError("Paste a document link or ID");
      return;
    }
    setOpening(true);
    try {
      await getDoc(id);
      navigate(`/d/${id}`);
    } catch (err: any) {
      setOpenError(err.message || "Document not found");
    } finally {
      setOpening(false);
    }
  }

  async function importFiles(
    picker: () => Promise<{ name: string; text: string }[]>,
  ) {
    setImportMsg(null);
    setImporting(true);
    try {
      const files = await picker();
      if (!files.length) {
        setImporting(false);
        return;
      }
      // Import first file into a new doc and open it; batch the rest sequentially
      let firstId: string | null = null;
      for (const file of files) {
        const doc = await createDoc(titleFromFilename(file.name));
        const html = textToQuillHtml(file.text, file.name);
        stashImport(doc.id, html);
        if (!firstId) firstId = doc.id;
      }
      setImportMsg(
        files.length === 1
          ? `Imported “${files[0].name}”`
          : `Imported ${files.length} files`,
      );
      await load();
      if (firstId) navigate(`/d/${firstId}`);
    } catch (err: any) {
      setError(err.message || "Could not access files on this device");
    } finally {
      setImporting(false);
    }
  }

  // Recents that are not already in the server list (or all, for “on this device”)
  const serverIds = new Set(docs.map((d) => d.id));
  const deviceOnly = recents.filter((r) => !serverIds.has(r.id));

  return (
    <div className="min-h-full">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Quilroom</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIdentity(true)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-muted hover:bg-gray-50 hover:text-ink"
              title="How others see you"
            >
              {identityLabel}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
            >
              {creating ? "Creating…" : "New Document"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button type="button" onClick={load} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}

        {/* From this device's file explorer */}
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-ink">From this device</h2>
          <p className="mt-0.5 text-xs text-muted">
            Quilroom will ask your browser for permission to open files or a
            folder from your file explorer (.txt, .md, .html, …).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={() => importFiles(() => pickTextFiles(true))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {importing ? "Importing…" : "Open files…"}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => importFiles(() => pickFolderTextFiles())}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              title={
                supportsDirectoryPicker()
                  ? "Choose a folder (browser permission required)"
                  : "Your browser will open a multi-file picker instead"
              }
            >
              Open folder…
            </button>
          </div>
          {importMsg && (
            <p className="mt-2 text-sm text-teal-700">{importMsg}</p>
          )}
        </section>

        {/* Open by link / ID */}
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-ink">Open by link or ID</h2>
          <p className="mt-0.5 text-xs text-muted">
            Paste a share link or document ID.
          </p>
          <form onSubmit={handleOpenRef} className="mt-3 flex gap-2">
            <input
              value={openRef}
              onChange={(e) => setOpenRef(e.target.value)}
              placeholder="https://…/d/abc… or document ID"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={opening}
              className="shrink-0 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {opening ? "Opening…" : "Open"}
            </button>
          </form>
          {openError && (
            <p className="mt-2 text-sm text-red-600">{openError}</p>
          )}
        </section>

        {/* On this device */}
        {recents.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium text-muted">
              On this device
            </h2>
            <ul className="space-y-2">
              {recents.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/d/${r.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      Opened {relativeTime(r.openedAt)}
                      {!serverIds.has(r.id) ? " · not on this server list" : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeRecent(r.id);
                      setRecents(getRecents());
                    }}
                    className="ml-2 rounded-md px-2 py-1 text-xs text-muted hover:bg-gray-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {deviceOnly.length === 0 && docs.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                These are documents you opened on this browser.
              </p>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">
            All documents on server
          </h2>
          {loading ? (
            <p className="text-muted">Loading documents…</p>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <p className="text-muted mb-4">No documents on the server yet</p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Create your first document
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-gray-300"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/d/${doc.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-medium">{doc.title}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      Edited {relativeTime(doc.updated_at)}
                      {doc.hasPassword ? " · Protected" : ""}
                    </div>
                  </button>
                  <div className="ml-3 flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleRename(doc.id, doc.title)}
                      className="rounded-md px-2 py-1 text-xs text-muted hover:bg-gray-100 hover:text-ink"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="rounded-md px-2 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showIdentity && (
        <IdentityModal
          onClose={() => setShowIdentity(false)}
          onSaved={() => setIdentityLabel(getIdentityLabel())}
        />
      )}
    </div>
  );
}
