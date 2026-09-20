'use client';

import { useState } from 'react';

interface Result {
  urgency: 'low' | 'moderate' | 'high' | 'call_emergency';
  hazards: string[];
  actions: string[];
  limits: string;
}

const URGENCY_TEXT: Record<Result['urgency'], string> = {
  low: 'Little concern visible',
  moderate: 'Take precautions',
  high: 'Serious hazards visible',
  call_emergency: 'Contact emergency services now if anyone is in danger',
};

async function downscale(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

export default function PhotoPanel({ language }: { language: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setResult(null);
    setError(null);
    if (!file) return;
    try {
      setPreview(await downscale(file));
    } catch {
      setPreview(null);
      setError('That image could not be read. Try a JPEG or PNG photo.');
    }
  }

  async function analyse() {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: preview, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo">
      <p className="muted">
        Upload a photo of flooding, damage or smoke to get a list of visible hazards and precautions.
      </p>
      <p className="notice">
        This cannot confirm that a building, road, water or food is safe. If anyone is in danger, contact emergency
        services first. The photo is sent to an AI service for analysis and is not stored by this app.
      </p>
      <label className="filebtn">
        Choose or take a photo
        <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {preview && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={preview} alt="Your uploaded photo" />
          <button type="button" className="primary" onClick={analyse} disabled={busy}>
            {busy ? 'Checking the photo…' : 'Check this photo'}
          </button>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {result && (
        <section className="result" data-urgency={result.urgency}>
          <h3>{URGENCY_TEXT[result.urgency]}</h3>
          <h4>Visible hazards</h4>
          <ul>
            {result.hazards.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <h4>What to do now</h4>
          <ul>
            {result.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          {result.limits && <p className="muted small">{result.limits}</p>}
          <p className="muted small">A photo cannot show every danger. Follow guidance from local authorities.</p>
        </section>
      )}
    </div>
  );
}
