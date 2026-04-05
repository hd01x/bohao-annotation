const styles: Record<string, string> = {
  FC: 'bg-blue-100 text-blue-800 border-blue-300',
  DR: 'bg-amber-100 text-amber-800 border-amber-300',
  S: 'bg-green-100 text-green-800 border-green-300',
  H: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
};

const labels: Record<string, string> = {
  FC: 'Factual',
  DR: 'Derived',
  S: 'Supported',
  H: 'Hallucinated',
};

export default function Badge({ type }: { type: string }) {
  const cls = styles[type] || styles.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>
      {type}{labels[type] ? ` — ${labels[type]}` : ''}
    </span>
  );
}
