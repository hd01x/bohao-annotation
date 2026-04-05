import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnnotationStore } from '../../stores/annotationStore';
import { api } from '../../api/client';
import ContextPanel from '../common/ContextPanel';
import Badge from '../common/Badge';
import type { Sample, LabeledClaim } from '../../types';

export default function Stage1View() {
  const { dataset, uid } = useParams<{ dataset: string; uid: string }>();
  const annotator = useAnnotationStore((s) => s.annotator);
  const navigate = useNavigate();

  const [sample, setSample] = useState<Sample | null>(null);
  const [claims, setClaims] = useState<LabeledClaim[]>([]);
  const [, setExistingAnnotation] = useState<any>(null);
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
    const [s, existing] = await Promise.all([
      api.getSample(uid!),
      api.loadAnnotation(1, annotator, uid!),
    ]);
    setSample(s);

    if (existing?.labeled_claims) {
      setClaims(existing.labeled_claims);
      setExistingAnnotation(existing);
    } else {
      // Check if majority vote exists
      const s1 = await api.getStage1(uid!);
      if (s1?.labeled_claims) {
        setClaims(s1.labeled_claims.map((c: any) => ({ ...c })));
      } else {
        // Fresh annotation from raw claims
        const raw = s?.claims || [];
        setClaims(raw.map((text: string, i: number) => ({
          id: `C${i + 1}`,
          text,
          claim_type: undefined,
        })));
      }
    }
    setActiveClaim(0);
  }

  function setClaimType(idx: number, type: string) {
    setClaims((prev) => prev.map((c, i) => i === idx ? { ...c, claim_type: type } : c));
  }

  const allLabeled = claims.every((c) => c.claim_type);

  async function handleSave() {
    setSaving(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    await api.saveAnnotation(1, {
      annotator,
      model: sample?.model_name || 'qwen3-30b-instruct',
      uid: uid!,
      labeled_claims: claims.map((c) => ({ id: c.id, text: c.text, claim_type: c.claim_type })),
      time_spent_seconds: elapsed,
    });
    setSaving(false);
    goNext();
  }

  function goNext() {
    if (currentIndex < allSamples.length - 1) {
      const next = allSamples[currentIndex + 1];
      navigate(`/stage1/${next.dataset}/${next.uid}`);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      const prev = allSamples[currentIndex - 1];
      navigate(`/stage1/${prev.dataset}/${prev.uid}`);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'f' || e.key === 'F') {
        setClaimType(activeClaim, 'FC');
        if (activeClaim < claims.length - 1) setActiveClaim(activeClaim + 1);
      } else if (e.key === 'd' || e.key === 'D') {
        setClaimType(activeClaim, 'DR');
        if (activeClaim < claims.length - 1) setActiveClaim(activeClaim + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveClaim(Math.max(0, activeClaim - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveClaim(Math.min(claims.length - 1, activeClaim + 1));
      } else if (e.key === 'Enter' && allLabeled) {
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeClaim, claims, allLabeled]);

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
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">Stage 1</span>
              <span className="text-sm font-semibold text-gray-900">FC/DR Classification</span>
            </div>
            <p className="text-xs text-gray-500">{sample.sample_id} &middot; {sample.dataset} &middot; {sample.hop_count} hops</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {claims.filter((c) => c.claim_type).length}/{claims.length} labeled
          </span>
          <span className="text-xs text-gray-400">
            Sample {currentIndex + 1} of {allSamples.length}
          </span>
        </div>
      </header>

      {/* Question */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-gray-900">{sample.question}</p>
        <p className="text-xs text-gray-400 mt-1">Gold: {sample.gold_answer} &middot; Predicted: {sample.predicted_answer}</p>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 text-xs text-blue-700 shrink-0">
        <strong>Default-to-FC:</strong> When ambiguous, classify as FC (safer). Keys: <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs font-mono">F</kbd>=FC <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs font-mono">D</kbd>=DR <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs font-mono">&uarr;&darr;</kbd>=Navigate
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Claims Panel */}
        <div className="w-3/5 border-r border-gray-200 overflow-y-auto p-4 space-y-2">
          {claims.map((claim, i) => (
            <div
              key={claim.id}
              onClick={() => setActiveClaim(i)}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                i === activeClaim
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                  : claim.claim_type
                    ? 'border-gray-200 bg-white'
                    : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-mono text-gray-400 mr-2">{claim.id}</span>
                  <span className="text-sm text-gray-800 leading-relaxed">{claim.text}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setClaimType(i, 'FC'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      claim.claim_type === 'FC'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    FC
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setClaimType(i, 'DR'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      claim.claim_type === 'DR'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
                    }`}
                  >
                    DR
                  </button>
                </div>
              </div>
              {claim.claim_type && (
                <div className="mt-2">
                  <Badge type={claim.claim_type} />
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
          disabled={!allLabeled || saving}
          className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}
