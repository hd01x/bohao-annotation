import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnnotationStore } from '../../stores/annotationStore';
import { api } from '../../api/client';
import ContextPanel from '../common/ContextPanel';
import type { Sample, LabeledClaim } from '../../types';

export default function Stage2View() {
  const { dataset, uid } = useParams<{ dataset: string; uid: string }>();
  const annotator = useAnnotationStore((s) => s.annotator);
  const navigate = useNavigate();

  const [sample, setSample] = useState<Sample | null>(null);
  const [claims, setClaims] = useState<LabeledClaim[]>([]);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeClaim, setActiveClaim] = useState(0);
  const startTime = useRef(Date.now());
  const [allSamples, setAllSamples] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!uid) return;
    loadSample();
    loadSampleList();
  }, [uid]);

  async function loadSampleList() {
    const samples = await api.getSamples(dataset);
    setAllSamples(samples || []);
    const idx = (samples || []).findIndex((s: any) => s.uid === uid);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }

  async function loadSample() {
    startTime.current = Date.now();
    const [s, existing, shuffleRes] = await Promise.all([
      api.getSample(uid!),
      api.loadAnnotation(2, annotator, uid!),
      api.getShuffleOrder(uid!, annotator),
    ]);
    setSample(s);

    if (existing?.labeled_claims) {
      setClaims(existing.labeled_claims);
      setDisplayOrder(existing.presentation_order || shuffleRes?.order || []);
    } else {
      // Build claims from stage1 or raw
      const s1 = await api.getStage1(uid!);
      let baseClaims: LabeledClaim[];
      if (s1?.labeled_claims) {
        // Strip FC/DR labels for blinding
        baseClaims = s1.labeled_claims.map((c: any) => ({
          id: c.id,
          text: c.text,
          verdict: undefined,
        }));
      } else {
        baseClaims = (s?.claims || []).map((text: string, i: number) => ({
          id: `C${i + 1}`,
          text,
          verdict: undefined,
        }));
      }
      setClaims(baseClaims);
      setDisplayOrder(shuffleRes?.order || baseClaims.map((c) => c.id));
    }
    setActiveClaim(0);
  }

  // Claims in display order
  const orderedClaims = displayOrder
    .map((id) => claims.find((c) => c.id === id))
    .filter(Boolean) as LabeledClaim[];

  function setVerdict(claimId: string, verdict: string) {
    setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, verdict } : c));
  }

  const allVerified = claims.every((c) => c.verdict);

  async function handleSave() {
    setSaving(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    await api.saveAnnotation(2, {
      annotator,
      model: sample?.model_name || 'qwen3-30b-instruct',
      uid: uid!,
      presentation_order: displayOrder,
      labeled_claims: claims.map((c) => ({ id: c.id, text: c.text, verdict: c.verdict })),
      time_spent_seconds: elapsed,
    });
    setSaving(false);
    goNext();
  }

  function goNext() {
    if (currentIndex < allSamples.length - 1) {
      const next = allSamples[currentIndex + 1];
      navigate(`/stage2/${next.dataset}/${next.uid}`);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      const prev = allSamples[currentIndex - 1];
      navigate(`/stage2/${prev.dataset}/${prev.uid}`);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      const currentClaim = orderedClaims[activeClaim];
      if (!currentClaim) return;
      if (e.key === 's' || e.key === 'S') {
        setVerdict(currentClaim.id, 'S');
        if (activeClaim < orderedClaims.length - 1) setActiveClaim(activeClaim + 1);
      } else if (e.key === 'h' || e.key === 'H') {
        setVerdict(currentClaim.id, 'H');
        if (activeClaim < orderedClaims.length - 1) setActiveClaim(activeClaim + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveClaim(Math.max(0, activeClaim - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveClaim(Math.min(orderedClaims.length - 1, activeClaim + 1));
      } else if (e.key === 'Enter' && allVerified) {
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeClaim, orderedClaims, allVerified]);

  if (!sample) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">Stage 2</span>
              <span className="text-sm font-semibold text-gray-900">Claim Verification</span>
            </div>
            <p className="text-xs text-gray-500">{sample.sample_id} &middot; {sample.dataset} &middot; {sample.hop_count} hops</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {claims.filter((c) => c.verdict).length}/{claims.length} verified
          </span>
          <span className="text-xs text-gray-400">
            Sample {currentIndex + 1} of {allSamples.length}
          </span>
        </div>
      </header>

      {/* Question */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-gray-900">{sample.question}</p>
      </div>

      {/* Default-to-H reminder */}
      <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 text-xs text-amber-700 shrink-0">
        <strong>Default-to-H:</strong> Only mark Supported when documents provide clear evidence. When in doubt, lean toward Hallucinated. Keys: <kbd className="px-1 py-0.5 bg-amber-100 rounded text-xs font-mono">S</kbd>=Supported <kbd className="px-1 py-0.5 bg-amber-100 rounded text-xs font-mono">H</kbd>=Hallucinated <kbd className="px-1 py-0.5 bg-amber-100 rounded text-xs font-mono">&uarr;&darr;</kbd>=Navigate
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Claims Panel (randomized order, no FC/DR labels) */}
        <div className="w-3/5 border-r border-gray-200 overflow-y-auto p-4 space-y-2">
          {orderedClaims.map((claim, displayIdx) => (
            <div
              key={claim.id}
              onClick={() => setActiveClaim(displayIdx)}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                displayIdx === activeClaim
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                  : claim.verdict === 'S'
                    ? 'border-green-200 bg-green-50'
                    : claim.verdict === 'H'
                      ? 'border-red-200 bg-red-50'
                      : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-mono text-gray-300 mr-2">{claim.id}</span>
                  <span className="text-sm text-gray-800 leading-relaxed">{claim.text}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setVerdict(claim.id, 'S'); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      claim.verdict === 'S'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setVerdict(claim.id, 'H'); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      claim.verdict === 'H'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'
                    }`}
                  >
                    H
                  </button>
                </div>
              </div>
              {claim.verdict && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                    claim.verdict === 'S'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {claim.verdict === 'S' ? 'Supported' : 'Hallucinated'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Context Panel */}
        <div className="w-2/5 p-4 overflow-hidden flex flex-col">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Reference Documents ({sample.context.length})
          </h3>
          <ContextPanel context={sample.context} />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button onClick={goPrev} disabled={currentIndex === 0} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
            &larr; Previous
          </button>
          <button onClick={goNext} disabled={currentIndex >= allSamples.length - 1} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
            Next &rarr;
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!allVerified || saving}
          className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}
