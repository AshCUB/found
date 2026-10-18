import { useState } from 'react';
import { importLegacyData, removeLegacyData, setImportState, verifyLegacyImport } from '../services/legacyImport';

const primaryButton =
  'font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity disabled:opacity-50';
const textButton = 'font-buttons text-sm text-dark-grey hover:text-green transition-colors w-full';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Offers to import this browser's pre-account data into the signed-in account, verifies it, and only then
// lets the user remove the old local copy. step starts at 'offer', or 'imported' if it was imported on an earlier visit.
export default function ImportLocalData({ userId, legacy, initialStep, onImported, onClose }) {
  const [step, setStep] = useState(initialStep);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const runImport = async () => {
    setStep('importing');
    setMessage(null);
    try {
      const verified = await importLegacyData(userId, legacy, (done, total) => setProgress({ done, total }));
      setResult(verified);
      if (verified.ok) {
        setImportState(userId, 'imported');
        onImported();
      }
      setStep(verified.ok ? 'done' : 'error');
    } catch (error) {
      console.error('Error importing local data:', error.cause ?? error);
      setResult(null);
      setStep('error');
    }
  };

  // Checks the account once more right before removing anything from this device.
  const removeLocalCopy = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const verified = await verifyLegacyImport(userId, legacy);
      if (!verified.ok) {
        setResult(verified);
        setStep('error');
        return;
      }
      removeLegacyData();
      onClose();
    } catch (error) {
      console.error('Error verifying import:', error.cause ?? error);
      setMessage("we couldn't check your account. check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    setImportState(userId, 'dismissed');
    onClose();
  };

  const content = {
    offer: {
      title: 'Bring your finds with you',
      body: `This device has ${plural(legacy.captures.length, 'find')} and ${plural(legacy.lists.length, 'list')} saved from before you had an account. Import them into your account so they're on every device you sign in on?`,
      actions: (
        <>
          <button onClick={runImport} className={primaryButton}>Import</button>
          <button onClick={onClose} className={textButton}>Not now</button>
          <button onClick={dismiss} className={textButton}>This isn't my data</button>
        </>
      ),
    },
    importing: {
      title: 'Importing…',
      body: progress.total ? `${progress.done} of ${plural(progress.total, 'find')}. Keep this page open.` : 'Keep this page open.',
      actions: null,
    },
    error: {
      title: "Not everything imported",
      body: `${result ? `${plural(result.missing.length, 'item')} didn't make it into your account. ` : ''}Check your connection and try again. Nothing on this device has been removed.`,
      actions: (
        <>
          <button onClick={runImport} className={primaryButton}>Try again</button>
          <button onClick={onClose} className={textButton}>Not now</button>
        </>
      ),
    },
    done: {
      title: 'All set',
      body: `${plural(result?.logs ?? 0, 'find')}, ${plural(result?.photos ?? 0, 'photo')} and ${plural(result?.lists ?? 0, 'list')} are now in your account and have been checked. The old copy is still on this device. Once your finds look right, you can remove it.`,
      actions: null,
    },
    imported: {
      title: 'Your finds are in your account',
      body: 'The finds this device saved before you had an account have been imported. Remove the old copy from this device?',
      actions: null,
    },
  }[step];

  const removeActions = (
    <>
      <button onClick={removeLocalCopy} disabled={busy} className={primaryButton}>
        {busy ? 'Checking…' : 'Remove old copy'}
      </button>
      <button onClick={onClose} disabled={busy} className={textButton}>Keep it for now</button>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-lg animate-fade-in">
      <div className="bg-white p-lg rounded-lg shadow-sm max-w-md w-full text-center" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <h3 id="import-title" className="font-primary text-2xl text-green mb-md">{content.title}</h3>
        <p className="font-body text-sm text-dark-grey mb-lg" aria-live="polite">{content.body}</p>
        {message && (
          <p className="font-body text-xs text-dark-grey mb-md" role="alert">{message}</p>
        )}
        <div className="space-y-md">{content.actions ?? (step === 'importing' ? null : removeActions)}</div>
      </div>
    </div>
  );
}
