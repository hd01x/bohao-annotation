import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnotationStore } from '../../stores/annotationStore';
import { api } from '../../api/client';
import ProgressBar from '../common/ProgressBar';

const DATASETS = ['medhop', 'musique', 'wiki2mhqa'];
const STAGE_INFO = [
  { num: 1, title: 'FC/DR Classification', desc: 'Classify each claim as Factual (FC) or Derived (DR)', color: 'blue' },
  { num: 2, title: 'Claim Verification', desc: 'Label claims as Supported (S) or Hallucinated (H)', color: 'green' },
  { num: 3, title: 'Dependency Annotation', desc: 'Mark directed dependency edges for DR claims', color: 'purple' },
];

export default function DashboardView() {
  const annotator = useAnnotationStore((s) => s.annotator);
  const setAnnotator = useAnnotationStore((s) => s.setAnnotator);
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Record<number, any>>({});
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [selectedDataset, setSelectedDataset] = useState('');

  useEffect(() => {
    loadData();
  }, [annotator]);

  async function loadData() {
    const [s, p1, p2, p3] = await Promise.all([
      api.getSamples(),
      api.getProgress(1, annotator),
      api.getProgress(2, annotator),
      api.getProgress(3, annotator),
    ]);
    setSamples(s || []);
    setProgress({ 1: p1, 2: p2, 3: p3 });
  }

  async function handleContinue(stage: number, dataset?: string) {
    const res = await api.getNextUid(stage, annotator, dataset || undefined);
    if (res?.uid) {
      const sample = samples.find((s) => s.uid === res.uid);
      navigate(`/stage${stage}/${sample?.dataset || 'medhop'}/${res.uid}`);
    }
  }

  function handleBrowse(stage: number, dataset: string) {
    setSelectedStage(stage);
    setSelectedDataset(dataset);
  }

  const filteredSamples = samples.filter((s) =>
    !selectedDataset || s.dataset === selectedDataset
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PremGuard Annotator</h1>
              <p className="text-xs text-gray-500">EPR Annotation Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Signed in as <span className="font-semibold text-indigo-600">{annotator}</span>
            </span>
            <button
              onClick={() => { setAnnotator(''); navigate('/login'); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {STAGE_INFO.map((stage) => {
            const p = progress[stage.num];
            const overall = p?.overall || { done: 0, total: 300 };
            const colorMap: Record<string, string> = {
              blue: 'from-blue-500 to-blue-600',
              green: 'from-emerald-500 to-emerald-600',
              purple: 'from-purple-500 to-purple-600',
            };
            const bgMap: Record<string, string> = {
              blue: 'bg-blue-50 border-blue-200',
              green: 'bg-emerald-50 border-emerald-200',
              purple: 'bg-purple-50 border-purple-200',
            };
            return (
              <div key={stage.num} className={`rounded-2xl border p-6 ${bgMap[stage.color]} transition-shadow hover:shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${colorMap[stage.color]} text-white text-sm font-bold`}>
                    {stage.num}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {overall.done}/{overall.total} done
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{stage.title}</h3>
                <p className="text-xs text-gray-500 mb-4">{stage.desc}</p>
                <ProgressBar done={overall.done} total={overall.total} />
                <div className="mt-4 space-y-1.5">
                  {DATASETS.map((ds) => {
                    const dp = p?.datasets?.[ds] || { done: 0, total: 100 };
                    return (
                      <div key={ds} className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleBrowse(stage.num, ds)}
                          className="text-gray-600 hover:text-indigo-600 font-medium capitalize"
                        >
                          {ds}
                        </button>
                        <span className="text-gray-400">{dp.done}/{dp.total}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleContinue(stage.num)}
                  className={`w-full mt-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${colorMap[stage.color]} hover:opacity-90 transition-opacity`}
                >
                  {overall.done > 0 ? 'Continue' : 'Start'} Annotating
                </button>
              </div>
            );
          })}
        </div>

        {/* Sample Browser */}
        {selectedStage && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Stage {selectedStage} — {selectedDataset ? selectedDataset.charAt(0).toUpperCase() + selectedDataset.slice(1) : 'All'} Samples
              </h2>
              <div className="flex gap-2">
                {['', ...DATASETS].map((ds) => (
                  <button
                    key={ds}
                    onClick={() => setSelectedDataset(ds)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedDataset === ds
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ds || 'All'}
                  </button>
                ))}
                <button onClick={() => setSelectedStage(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2">UID</th>
                    <th className="px-3 py-2">Dataset</th>
                    <th className="px-3 py-2">Claims</th>
                    <th className="px-3 py-2">Hops</th>
                    <th className="px-3 py-2">Stage 1</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSamples.map((s) => (
                    <tr key={s.uid} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{s.sample_id}</td>
                      <td className="px-3 py-2 capitalize">{s.dataset}</td>
                      <td className="px-3 py-2">{s.num_claims}</td>
                      <td className="px-3 py-2">{s.hop_count}</td>
                      <td className="px-3 py-2">
                        {s.has_stage1 ? (
                          <span className="text-green-600 text-xs font-medium">Done</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => navigate(`/stage${selectedStage}/${s.dataset}/${s.uid}`)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Annotate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
