import { useState, useMemo } from 'react';

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
    );
  } catch {
    return text;
  }
}

export default function ContextPanel({ context }: { context: string[] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const matchingIndices = useMemo(() => {
    if (!search.trim()) return new Set<number>();
    const s = new Set<number>();
    context.forEach((c, i) => {
      if (c.toLowerCase().includes(search.toLowerCase())) s.add(i);
    });
    return s;
  }, [search, context]);

  const toggleAll = () => {
    if (expanded.size === context.length) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(context.map((_, i) => i)));
    }
  };

  const toggle = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  };

  const isOpen = (i: number) => expanded.has(i) || matchingIndices.has(i);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <svg className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button onClick={toggleAll} className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap font-medium">
          {expanded.size === context.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      {search && matchingIndices.size > 0 && (
        <div className="text-xs text-indigo-600 mb-2">{matchingIndices.size} document{matchingIndices.size !== 1 ? 's' : ''} match</div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {context.map((doc, i) => {
          const preview = doc.slice(0, 80).replace(/\s+/g, ' ');
          return (
            <div key={i} className={`border rounded-lg transition-colors ${matchingIndices.has(i) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <svg className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${isOpen(i) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-xs font-mono text-gray-400 shrink-0">D{i + 1}</span>
                <span className="text-gray-600 truncate">{preview}...</span>
              </button>
              {isOpen(i) && (
                <div className="px-3 pb-3 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                  <div className="pt-2">{highlightText(doc, search)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
