import { useState } from 'react';
import {
  getDisplayName,
  getIdentityMode,
  setDisplayName,
  setIdentityMode,
  type IdentityMode,
} from '../lib/identity';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

export default function IdentityModal({ onClose, onSaved }: Props) {
  const [mode, setMode] = useState<IdentityMode>(getIdentityMode());
  const [name, setName] = useState(getDisplayName() || '');

  function save() {
    if (mode === 'named') {
      const trimmed = name.trim();
      if (!trimmed) {
        // require a name when choosing "show my name"
        return;
      }
      setDisplayName(trimmed);
      setIdentityMode('named');
    } else {
      setIdentityMode('anonymous');
      // keep stored name for later, but don't show it
    }
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">How should others see you?</h3>
        <p className="mt-1 text-sm text-muted">
          This only applies on this device. You can change it anytime.
        </p>

        <div className="mt-4 space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
              mode === 'anonymous'
                ? 'border-accent bg-accent-soft/40'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="identity"
              checked={mode === 'anonymous'}
              onChange={() => setMode('anonymous')}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Stay anonymous</span>
              <span className="text-sm text-muted">
                Others see you as “Anonymous”
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
              mode === 'named'
                ? 'border-accent bg-accent-soft/40'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="identity"
              checked={mode === 'named'}
              onChange={() => setMode('named')}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Show my name</span>
              <span className="text-sm text-muted">
                Others see the name you enter below
              </span>
              {mode === 'named' && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              )}
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={mode === 'named' && !name.trim()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
