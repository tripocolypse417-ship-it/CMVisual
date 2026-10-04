import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function TeamForm({ onCreate, color = '#00ff88' }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), desc.trim());
      setName('');
      setDesc('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-mono text-xs tracking-wider transition-all disabled:opacity-40 hover:scale-[1.02]"
        style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
      >
        <Plus className="w-4 h-4" /> {busy ? 'CREATING…' : 'CREATE TEAM'}
      </button>
    </form>
  );
}