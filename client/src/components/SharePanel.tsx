import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { updateDoc } from '../lib/api';

interface Props {
  docId: string;
  hasPassword: boolean;
  onClose: () => void;
  onPasswordChange: (has: boolean) => void;
}

export default function SharePanel({
  docId,
  hasPassword,
  onClose,
  onPasswordChange,
}: Props) {
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const url = `${window.location.origin}/d/${docId}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQr);
  }, [url]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function setOrClearPassword(clear: boolean) {
    setSaving(true);
    try {
      await updateDoc(docId, {
        password: clear ? null : password || null,
      });
      onPasswordChange(!clear && Boolean(password));
      if (clear) setPassword('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Share</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-muted hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <p className="mt-1 text-sm text-muted">
          Anyone on your local network can open this link.
        </p>

        {qr && (
          <div className="mt-4 flex justify-center">
            <img src={qr} alt="QR code" className="rounded-lg border" />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={url}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
          />
          <button
            onClick={copy}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium">Password protection</h4>
          {hasPassword ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted">Password is set</span>
              <button
                disabled={saving}
                onClick={() => setOrClearPassword(true)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                disabled={saving || !password}
                onClick={() => setOrClearPassword(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Set
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
