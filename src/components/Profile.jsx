import { useEffect, useState } from 'react';
import { getAccount } from '../auth/session';

export default function Profile({ totalFinds, points, onSignOut, onClose }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    let active = true;
    getAccount()
      .then((value) => active && setAccount(value))
      .catch(() => active && setAccount({ name: null, email: null, guest: false }));
    return () => {
      active = false;
    };
  }, []);

  const balance = points ? points.earned - points.spent : 0;
  const details = [
    { label: 'Name', value: account?.name ?? '—' },
    { label: 'Email', value: account?.guest ? 'guest account' : account?.email ?? '—' },
    { label: 'Finds', value: totalFinds },
    { label: 'Points', value: balance },
  ];

  return (
    <div className="min-h-screen bg-grey animate-fade-in pb-lg">
      <div className="p-lg pb-md max-w-md mx-auto">
        <button
          onClick={onClose}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Back
        </button>
        <h1 className="font-primary text-3xl text-green mb-md">Profile</h1>
      </div>

      <div className="px-lg max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm divide-y divide-grey mb-lg">
          {details.map(({ label, value }) => (
            <div key={label} className="p-md flex items-baseline justify-between gap-md">
              <p className="font-buttons text-sm text-black">{label}</p>
              <p className="font-body text-sm text-dark-grey truncate">{account ? value : '…'}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onSignOut}
          className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
