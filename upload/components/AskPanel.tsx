'use client';

import { useEffect, useRef, useState } from 'react';

interface Msg {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  language: string;
  userPos: { lat: number; lng: number } | null;
}

export default function AskPanel({ language, userPos }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs, busy]);

  const suggestions = [
    'What are the biggest risks right now?',
    'Are there any strong earthquakes this week?',
    'Where are wildfires active?',
    ...(userPos ? ['What should I watch out for near me?'] : []),
  ];

  async function send(text: string) {
    const question = text.trim();
    if (question.length < 3 || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setQ('');
    setBusy(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question,
          language,
          near: userPos ? { lat: Math.round(userPos.lat * 10) / 10, lng: Math.round(userPos.lng * 10) / 10 } : undefined,
        }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: 'ai', text: res.ok ? data.answer : data.error ?? 'Something went wrong. Please try again.' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: 'The question could not be sent. Check your connection and try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask">
      <p className="muted">Ask about the live events on the map. Answers use only the data shown here.</p>
      {msgs.length === 0 && (
        <div className="suggest">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip-btn" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="thread" aria-live="polite">
        {msgs.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'msg user' : 'msg ai'}>
            {m.text}
          </p>
        ))}
        {busy && <p className="msg ai muted">Looking at the live data…</p>}
        <div ref={endRef} />
      </div>
      <form
        className="askform"
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={300}
          placeholder="Ask a question about current hazards"
          aria-label="Your question"
        />
        <button type="submit" disabled={busy || q.trim().length < 3}>
          Ask
        </button>
      </form>
      <p className="muted small">Informational only. In an emergency, follow your local authorities.</p>
    </div>
  );
}
