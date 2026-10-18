import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { getDoc, unlockDoc, updateDoc, deleteDoc } from "../lib/api";
import { getAwarenessUser, getIdentityLabel } from "../lib/identity";
import { touchRecent, updateRecentTitle, removeRecent } from "../lib/recents";
import { takeImport, saveTextToDevice } from "../lib/filesystem";
import SharePanel from "../components/SharePanel";
import IdentityModal from "../components/IdentityModal";

const SOFT_LIMIT = 8;

export default function Editor() {
  const { docId } = useParams<{ docId: string }>();
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);

  const [title, setTitle] = useState("Untitled");
  const [hasPassword, setHasPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [users, setUsers] = useState<{ name: string; color: string }[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [identityLabel, setIdentityLabel] = useState(getIdentityLabel());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Load metadata + password gate
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    (async () => {
      try {
        const meta = await getDoc(docId);
        if (cancelled) return;
        setTitle(meta.title);
        setHasPassword(Boolean(meta.hasPassword));
        touchRecent({ id: meta.id, title: meta.title });
        if (!meta.hasPassword) setUnlocked(true);
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || "Document not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Init Yjs + Quill once unlocked
  useEffect(() => {
    if (!docId || !unlocked || !editorRef.current) return;

    // Avoid double-init in StrictMode
    if (quillRef.current) return;

    const ydoc = new Y.Doc();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const provider = new WebsocketProvider(
      `${protocol}://${host}/ws`,
      docId,
      ydoc,
      { connect: true },
    );
    providerRef.current = provider;

    const user = getAwarenessUser();
    provider.awareness.setLocalStateField("user", user);

    const ytext = ydoc.getText("quill");
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Start writing…",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link"],
          ["clean"],
        ],
      },
    });
    quillRef.current = quill;

    const binding = new QuillBinding(ytext, quill, provider.awareness);
    bindingRef.current = binding;

    // Apply content imported from the device file explorer (once)
    const imported = takeImport(docId);
    if (imported) {
      // Wait a tick so binding is ready, then set HTML if doc is empty
      queueMicrotask(() => {
        const current = quill.getText().trim();
        if (!current) {
          quill.clipboard.dangerouslyPasteHTML(imported);
        }
      });
    }

    const onStatus = (e: { status: string }) => {
      setStatus(
        e.status === "connected"
          ? "connected"
          : e.status === "connecting"
            ? "connecting"
            : "disconnected",
      );
    };
    provider.on("status", onStatus);

    const onAwareness = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const list = states.map((s: any) => s.user).filter(Boolean) as {
        name: string;
        color: string;
      }[];
      const seen = new Set<string>();
      const unique = list.filter((u) => {
        const key = `${u.name}:${u.color}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setUsers(unique);
    };
    provider.awareness.on("change", onAwareness);
    onAwareness();

    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
      quillRef.current = null;
      providerRef.current = null;
      bindingRef.current = null;
    };
  }, [docId, unlocked]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!docId) return;
    setPasswordError(null);
    try {
      await unlockDoc(docId, passwordInput);
      setUnlocked(true);
    } catch {
      setPasswordError("Wrong password");
    }
  }

  async function handleTitleBlur() {
    if (!docId) return;
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    try {
      await updateDoc(docId, { title: trimmed });
      updateRecentTitle(docId, trimmed);
    } catch {
      /* ignore */
    }
  }

  function applyIdentity() {
    const user = getAwarenessUser();
    providerRef.current?.awareness.setLocalStateField("user", user);
    setIdentityLabel(getIdentityLabel());
  }

  async function handleDelete() {
    if (!docId) return;
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try {
      await deleteDoc(docId);
      removeRecent(docId);
      window.location.href = "/";
    } catch (e: any) {
      alert(e.message || "Could not delete");
    }
  }

  async function handleSaveToDevice() {
    const quill = quillRef.current;
    if (!quill) return;
    // Prefer plain text for .txt; also offer markdown-ish plain export
    const text = quill.getText();
    const safe =
      (title || "document").replace(/[^\w\s-]+/g, "").trim() || "document";
    await saveTextToDevice(`${safe}.txt`, text, "text/plain");
  }

  async function handleSaveHtmlToDevice() {
    const quill = quillRef.current;
    if (!quill) return;
    const html = quill.root.innerHTML;
    const safe =
      (title || "document").replace(/[^\w\s-]+/g, "").trim() || "document";
    await saveTextToDevice(`${safe}.html`, html, "text/html");
  }

  if (loadError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted">{loadError}</p>
        <Link to="/" className="text-accent underline">
          Back to documents
        </Link>
      </div>
    );
  }

  if (hasPassword && !unlocked) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Protected document</h2>
          <p className="mt-1 text-sm text-muted">
            Enter the password to open it.
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Password"
            autoFocus
          />
          {passwordError && (
            <p className="mt-2 text-sm text-red-600">{passwordError}</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Unlock
          </button>
          <Link
            to="/"
            className="mt-3 block text-center text-sm text-muted hover:text-ink"
          >
            Back
          </Link>
        </form>
      </div>
    );
  }

  const overLimit = users.length > SOFT_LIMIT;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <Link
            to="/"
            className="shrink-0 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-gray-100 hover:text-ink"
          >
            ← Docs
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none"
            aria-label="Document title"
          />
          <div className="hidden items-center gap-1 sm:flex">
            {users.slice(0, 6).map((u, i) => (
              <span
                key={i}
                title={u.name}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: u.color }}
              >
                {u.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
            {users.length > 6 && (
              <span className="text-xs text-muted">+{users.length - 6}</span>
            )}
          </div>

          {/* Tools: identity, connection, more, share */}
          <button
            type="button"
            onClick={() => setShowIdentity(true)}
            className="rounded-md px-2 py-1.5 text-xs text-muted hover:bg-gray-100"
            title="How others see you"
          >
            {identityLabel}
          </button>
          <span
            className={`hidden h-2 w-2 rounded-full sm:inline-block ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-amber-400"
                  : "bg-red-400"
            }`}
            title={status}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md px-2 py-1.5 text-sm text-muted hover:bg-gray-100"
              aria-label="More tools"
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowIdentity(true);
                    }}
                  >
                    Identity…
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowShare(true);
                    }}
                  >
                    Share…
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSaveToDevice();
                    }}
                  >
                    Save to device (.txt)…
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSaveHtmlToDevice();
                    }}
                  >
                    Save to device (.html)…
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                  >
                    Delete document
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Share
          </button>
        </div>
        {overLimit && (
          <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
            {users.length} people are editing — performance may slow with many
            concurrent users.
          </div>
        )}
      </header>

      <div className="flex-1 bg-white">
        <div ref={editorRef} />
      </div>

      {showShare && docId && (
        <SharePanel
          docId={docId}
          hasPassword={hasPassword}
          onClose={() => setShowShare(false)}
          onPasswordChange={(v) => setHasPassword(v)}
        />
      )}

      {showIdentity && (
        <IdentityModal
          onClose={() => setShowIdentity(false)}
          onSaved={applyIdentity}
        />
      )}
    </div>
  );
}
