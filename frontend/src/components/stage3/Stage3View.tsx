import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnnotationStore } from '../../stores/annotationStore';
import { api } from '../../api/client';
import ContextPanel from '../common/ContextPanel';
import Badge from '../common/Badge';
import type { Sample, LabeledClaim } from '../../types';

export default function Stage3View() {
  const { dataset, uid } = useParams<{ dataset: string; uid: string }>();
  const annotator = useAnnotationStore((s) => s.annotator);
  const navigate = useNavigate();

  const [sample, setSample] = useState<Sample | null>(null);
  const [claims, setClaims] = useState<LabeledClaim[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedDR, setExpandedDR] = useState<string | null>(null);
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
      api.loadAnnotation(3, annotator, uid!),
    ]);
    setSample(s);

    if (existing?.labeled_claims) {
      setClaims(existing.labeled_claims);
    } else {
      const s1 = await api.getStage1(uid!);
      if (s1?.labeled_claims) {
        setClaims(s1.labeled_claims.map((c: any) => ({
          id: c.id,
          text: c.text,
          claim_type: c.claim_type,
          dependencies: [],
        })));
      } else {
        const raw = s?.claims || [];
        setClaims(raw.map((text: string, i: number) => ({
          id: `C${i + 1}`,
          text,
          claim_type: 'FC',
          dependencies: [],
        })));
      }
    }
  }

  function toggleDependency(drClaimId: string, depId: string) {
    setClaims((prev) => prev.map((c) => {
      if (c.id !== drClaimId) return c;
      const deps = c.dependencies || [];
      if (deps.includes(depId)) {
        return { ...c, dependencies: deps.filter((d) => d !== depId) };
      } else {
        return { ...c, dependencies: [...deps, depId] };
      }
    }));
  }

  const drClaims = claims.filter((c) => c.claim_type === 'DR');
  void drClaims.every((c) => (c.dependencies || []).length > 0);

  async function handleSave() {
    setSaving(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    await api.saveAnnotation(3, {
      annotator,
      model: sample?.model_name || 'qwen3-30b-instruct',
      uid: uid!,
      labeled_claims: claims.map((c) => ({
        id: c.id,
        text: c.text,
        claim_type: c.claim_type,
        dependencies: c.dependencies || [],
      })),
      time_spent_seconds: elapsed,
    });
    setSaving(false);
    goNext();
  }

  function goNext() {
    if (currentIndex < allSamples.length - 1) {
      const next = allSamples[currentIndex + 1];
      navigate(`/stage3/${next.dataset}/${next.uid}`);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      const prev = allSamples[currentIndex - 1];
      navigate(`/stage3/${prev.dataset}/${prev.uid}`);
    }
  }

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
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-bold">Stage 3</span>
              <span className="text-sm font-semibold text-gray-900">Dependency Annotation</span>
            </div>
            <p className="text-xs text-gray-500">{sample.sample_id} &middot; {sample.dataset} &middot; {drClaims.length} DR claims to annotate</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {drClaims.filter((c) => (c.dependencies || []).length > 0).length}/{drClaims.length} DR claims annotated
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

      {/* Tip */}
      <div className="bg-purple-50 border-b border-purple-100 px-6 py-2 text-xs text-purple-700 shrink-0">
        <strong>Dependency:</strong> For each DR claim, select the claims it logically depends on. Shared entity mention alone is NOT dependency. Click claim chips to toggle.
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Claims Panel */}
        <div className="w-3/5 border-r border-gray-200 overflow-y-auto p-4 space-y-2">
          {claims.map((claim) => {
            const isDR = claim.claim_type === 'DR';
            const isExpanded = expandedDR === claim.id;
            const deps = claim.dependencies || [];

            return (
              <div key={claim.id} className={`rounded-xl border-2 transition-all ${
                isDR
                  ? isExpanded
                    ? 'border-purple-400 bg-purple-50 shadow-sm'
                    : deps.length > 0
                      ? 'border-purple-200 bg-white'
                      : 'border-amber-200 bg-amber-50'
                  : 'border-gray-100 bg-gray-50'
              }`}>
                <div
                  className={`p-4 ${isDR ? 'cursor-pointer' : ''}`}
                  onClick={() => isDR && setExpandedDR(isExpanded ? null : claim.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{claim.id}</span>
                        <Badge type={claim.claim_type || 'FC'} />
                        {isDR && deps.length > 0 && (
                          <span className="text-xs text-purple-600 font-medium">
                            deps: {deps.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-800 leading-relaxed">{claim.text}</span>
                    </div>
                    {isDR && (
                      <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Dependency Editor */}
                {isDR && isExpanded && (
                  <div className="px-4 pb-4 border-t border-purple-200">
                    <p className="text-xs text-gray-500 mt-3 mb-2">
                      Select claims that <strong>{claim.id}</strong> depends on:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {claims.filter((c) => c.id !== claim.id).map((candidate) => {
                        const isSelected = deps.includes(candidate.id);
                        return (
                          <button
                            key={candidate.id}
                            onClick={() => toggleDependency(claim.id, candidate.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isSelected
                                ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                                : candidate.claim_type === 'FC'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title={candidate.text}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span>{candidate.id}</span>
                            <span className="text-[10px] opacity-70">({candidate.claim_type})</span>
                          </button>
                        );
                      })}
                    </div>
                    {deps.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-purple-600">
                          <strong>Dependencies:</strong> {deps.sort().join(', ')}
                        </span>
                        <button
                          onClick={() => setClaims((prev) => prev.map((c) =>
                            c.id === claim.id ? { ...c, dependencies: [] } : c
                          ))}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {/* Show dependency claim texts for context */}
                    {deps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {deps.sort().map((depId) => {
                          const dep = claims.find((c) => c.id === depId);
                          return dep ? (
                            <div key={depId} className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100">
                              <span className="font-mono text-purple-500 mr-1">{depId}:</span>
                              {dep.text}
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          disabled={saving}
          className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}
