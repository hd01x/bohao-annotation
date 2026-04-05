import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAnnotationStore } from './stores/annotationStore';
import LoginScreen from './components/dashboard/LoginScreen';
import DashboardView from './components/dashboard/DashboardView';
import Stage1View from './components/stage1/Stage1View';
import Stage2View from './components/stage2/Stage2View';
import Stage3View from './components/stage3/Stage3View';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const annotator = useAnnotationStore((s) => s.annotator);
  if (!annotator) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
        <Route path="/stage1/:dataset/:uid" element={<ProtectedRoute><Stage1View /></ProtectedRoute>} />
        <Route path="/stage2/:dataset/:uid" element={<ProtectedRoute><Stage2View /></ProtectedRoute>} />
        <Route path="/stage3/:dataset/:uid" element={<ProtectedRoute><Stage3View /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
