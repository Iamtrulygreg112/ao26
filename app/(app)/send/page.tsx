"use client";

import { useEffect, useRef, useState } from "react";
import { useSignalData } from "@/lib/signalData";
import { useSendData, type ScheduledSendRow, type SendPhotoDoc, type SendStatus } from "@/lib/sendData";
import { MAX_PHOTOS, MAX_TEXT, cancelSend, deleteSend, loadSendPhotos, scheduleSend } from "@/lib/adminWrites";
import { compressImage, formatBytes } from "@/lib/photos";
import { formatDateTime, nowISO } from "@/lib/dates";
import { errorText } from "@/lib/writes";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";

// ---- Time helpers -------------------------------------------------------------
//
// ASSUMPTION: the owner's device is in America/Los_Angeles, so the browser's
// local wall time IS the LA wall time. The date/time inputs are therefore
// parsed with `new Date(y, m, d, hh, mm)` (local) and `toISOString()` turns
// that into the UTC ISO string the bot expects in sendAt. If the device were
// ever in another zone the scheduled time would be off by the zone difference.

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Now, rounded up to the next 5 minutes. */
function defaultWhen(): Date {
  const step = 5 * 60 * 1000;
  return new Date(Math.ceil((Date.now() + 1) / step) * step);
}

function parseWhen(date: string, time: string): Date | null {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  const out = new Date(y, mo - 1, d, h, mi, 0, 0);
  return Number.isNaN(out.getTime()) ? null : out;
}

const SEND_NOW_WINDOW_MS = 60 * 1000;

// ---- Composer -----------------------------------------------------------------

type Photo = {
  key: string;
  name: string;
  url: string; // object URL for the thumbnail
  bytes: number;
  base64: string;
};

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function Composer() {
  const { groups } = useSignalData();
  const enabled = groups.filter((g) => g.enabled).sort((a, b) => a.name.localeCompare(b.name));

  const [groupId, setGroupId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(0);
  const [date, setDate] = useState(() => toDateInput(defaultWhen()));
  const [time, setTime] = useState(() => toTimeInput(defaultWhen()));
  const [sendNow, setSendNow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Ticks so "Send now" vs "Schedule" stays right while the page sits open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Release thumbnail object URLs when the composer goes away.
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const group = enabled.find((g) => g.groupId === groupId) ?? null;
  const when = parseWhen(date, time);
  const isNow = sendNow || (when !== null && when.getTime() <= now + SEND_NOW_WINDOW_MS);
  const sendAtMs = isNow ? now : when?.getTime() ?? null;
  const ready = group !== null && sendAtMs !== null && compressing === 0 && (text.trim() !== "" || photos.length > 0);

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setPhotoErrors([]);
    const room = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, Math.max(0, room));
    const errs: string[] = [];
    if (files.length > accepted.length) errs.push(`Up to ${MAX_PHOTOS} photos — ${files.length - accepted.length} skipped.`);
    setCompressing((n) => n + accepted.length);
    await Promise.all(
      accepted.map(async (file) => {
        try {
          const out = await compressImage(file);
          const photo: Photo = {
            key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            url: URL.createObjectURL(out.blob),
            bytes: out.bytes,
            base64: out.base64,
          };
          setPhotos((ps) => (ps.length < MAX_PHOTOS ? [...ps, photo] : ps));
        } catch (err) {
          errs.push(errorText(err));
        } finally {
          setCompressing((n) => n - 1);
        }
      }),
    );
    if (errs.length > 0) setPhotoErrors(errs);
  }

  function removePhoto(key: string) {
    setPhotos((ps) => {
      const gone = ps.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return ps.filter((p) => p.key !== key);
    });
  }

  function chooseNow() {
    const d = new Date();
    setDate(toDateInput(d));
    setTime(toTimeInput(d));
    setSendNow(true);
  }

  async function submit() {
    if (!group || sendAtMs === null) return;
    setError(null);
    await scheduleSend({
      groupId: group.groupId,
      groupName: group.name,
      text,
      sendAt: isNow ? nowISO() : new Date(sendAtMs).toISOString(),
      photos: photos.map((p) => ({ base64: p.base64 })),
    });
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPhotoErrors([]);
    setText("");
    setSendNow(false);
    const next = defaultWhen();
    setDate(toDateInput(next));
    setTime(toTimeInput(next));
    if (fileInput.current) fileInput.current.value = "";
    setConfirming(false);
    setNotice(isNow ? "Sent to the queue." : "Scheduled.");
  }

  const label = isNow ? "Send now" : "Schedule";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted">Group</p>
        {enabled.length === 0 ? (
          <p className="text-sm text-muted">No enabled groups yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enabled.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={groupId === g.groupId}
                onClick={() => setGroupId(g.groupId)}
                className={`h-9 rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.98] ${
                  groupId === g.groupId ? "border-azure bg-azure/10 text-azure" : "border-border bg-surface2 text-muted hover:text-text"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="send-text" className="text-xs uppercase tracking-widest text-muted">Message</label>
        <textarea
          id="send-text"
          value={text}
          maxLength={MAX_TEXT}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's the word?"
          className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm outline-none focus:border-azure"
        />
        <p className={`text-right text-[11px] tabular-nums ${text.length >= MAX_TEXT ? "text-danger" : "text-muted"}`}>
          {text.length} / {MAX_TEXT}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted">Photos</p>
          <span className="text-[11px] tabular-nums text-muted">{photos.length} / {MAX_PHOTOS}</span>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-surface2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not an optimizable asset */}
              <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-bg/70 px-1 text-center text-[10px] tabular-nums text-text">{formatBytes(p.bytes)}</span>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => removePhoto(p.key)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-text"
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
          {compressing > 0 && (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-surface2">
              <Spinner />
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted transition hover:border-azure hover:text-text"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add photos
            </button>
          )}
        </div>
        {photoErrors.map((e) => (
          <p key={e} className="text-sm text-danger">{e}</p>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted">When</p>
          <button type="button" onClick={chooseNow} className="text-sm text-azure underline-offset-4 hover:underline">
            Send now
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSendNow(false);
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface2 px-3 text-sm outline-none focus:border-azure"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setSendNow(false);
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface2 px-3 text-sm outline-none focus:border-azure"
          />
        </div>
        <p className="text-xs text-muted">
          {sendAtMs === null ? "Pick a date and time." : isNow ? "Goes out on the bot's next pass." : formatDateTime(new Date(sendAtMs).toISOString())}
        </p>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={() => setConfirming(true)}
        className="h-11 w-full rounded-xl bg-azure px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {label}
      </button>
      {notice && <p className="text-center text-sm font-medium text-gold" aria-live="polite">{notice}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {confirming && group && sendAtMs !== null && (
        <ConfirmDialog
          title={`Send to ${group.name} ${isNow ? "now" : `at ${formatDateTime(new Date(sendAtMs).toISOString())}`}?`}
          body="This goes to the real group."
          confirmLabel={label}
          onClose={() => setConfirming(false)}
          onConfirm={submit}
        />
      )}
    </section>
  );
}

// ---- Queue --------------------------------------------------------------------

function StatusPill({ status }: { status: SendStatus }) {
  const base = "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium";
  switch (status) {
    case "pending":
      return <span className={`${base} border border-azure/30 bg-azure/10 text-azure`}>pending</span>;
    case "sending":
      return <span className={`${base} animate-pulse border border-azure/30 bg-azure/10 text-azure`}>sending</span>;
    case "sent":
      return (
        <span className={`${base} bg-surface2 text-text`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12l5 5L20 7" />
          </svg>
          sent
        </span>
      );
    case "failed":
      return <span className={`${base} border border-danger/30 bg-danger/10 text-danger`}>failed</span>;
    case "dry_run":
      return <span className={`${base} border border-gold/30 bg-gold/10 text-gold`}>DRY RUN</span>;
    case "cancelled":
      return <span className={`${base} border border-border text-muted line-through`}>cancelled</span>;
  }
}

function SendRow({ s, onDelete }: { s: ScheduledSendRow; onDelete: (s: ScheduledSendRow) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SendPhotoDoc[] | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const firstLine = s.text.split("\n")[0]?.trim() ?? "";
  const pending = s.status === "pending";

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await cancelSend(s.id, s.status);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadPhotos() {
    setLoadingPhotos(true);
    setError(null);
    try {
      setPhotos(await loadSendPhotos(s.id));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingPhotos(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-w-0 flex-1 contain-inline-size text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill status={s.status} />
            <span className="truncate text-sm font-medium">{s.groupName}</span>
            <span className="text-xs text-muted tabular-nums">{formatDateTime(s.sendAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className={`min-w-0 truncate ${firstLine ? "" : "italic"}`}>{firstLine || "(no text)"}</span>
            {s.photoCount > 0 && (
              <span className="shrink-0 text-xs tabular-nums">
                {s.photoCount} photo{s.photoCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </button>
        {pending ? (
          <button
            type="button"
            disabled={busy}
            onClick={cancel}
            className="flex h-9 shrink-0 items-center gap-1 px-1 text-sm font-medium text-danger transition disabled:opacity-60"
          >
            {busy && <Spinner />}
            Cancel
          </button>
        ) : s.status === "sending" ? null : (
          <button
            type="button"
            aria-label="Delete"
            onClick={() => onDelete(s)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:text-danger"
          >
            <XIcon />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {s.status === "failed" && s.error && <p className="text-sm text-danger">{s.error}</p>}
          {s.status === "dry_run" && s.note && <p className="text-sm text-gold">{s.note}</p>}
          {s.attemptedAt && <p className="text-xs text-muted">Attempted {formatDateTime(s.attemptedAt)}</p>}
          {s.text ? (
            <p className="whitespace-pre-wrap break-words text-sm">{s.text}</p>
          ) : (
            <p className="text-sm italic text-muted">(no text)</p>
          )}
          {s.photoCount > 0 &&
            (photos === null ? (
              <button
                type="button"
                disabled={loadingPhotos}
                onClick={loadPhotos}
                className="flex h-9 items-center gap-2 rounded-xl border border-border bg-surface2 px-3 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60"
              >
                {loadingPhotos && <Spinner />}
                Load photos
              </button>
            ) : photos.length === 0 ? (
              <p className="text-sm text-muted">No photos found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element -- inline base64 from Firestore
                  <img key={p.order} src={`data:${p.mime};base64,${p.base64}`} alt={`Photo ${p.order + 1}`} className="h-24 w-24 rounded-xl border border-border object-cover" />
                ))}
              </div>
            ))}
        </div>
      )}
    </li>
  );
}

function Queue() {
  const { sends, loaded, error } = useSendData();
  const [toDelete, setToDelete] = useState<ScheduledSendRow | null>(null);

  const upcoming = sends.filter((s) => s.status === "pending").sort((a, b) => a.sendAt.localeCompare(b.sendAt));
  const history = sends
    .filter((s) => s.status !== "pending")
    .sort((a, b) => b.sendAt.localeCompare(a.sendAt))
    .slice(0, 30);

  if (!loaded) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-danger">{error}</p>}
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {upcoming.map((s) => (
              <SendRow key={s.id} s={s} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {history.map((s) => (
              <SendRow key={s.id} s={s} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete this send?"
          body={`${toDelete.groupName} · ${formatDateTime(toDelete.sendAt)}. This only removes it from the queue history.`}
          confirmLabel="Delete"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            await deleteSend(toDelete.id, toDelete.status);
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}

export default function SendPage() {
  return (
    <div className="space-y-8">
      <Composer />
      <Queue />
    </div>
  );
}
