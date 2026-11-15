import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import './styles/base.css';
import {MeProvider} from './lib/me';
import {AppShell} from './components/AppShell';

/* A tab opened before a deploy asks for page chunks the new build no longer has; the import then fails and the page
   would stay blank. Reload once to pick up the new build (the flag stops a reload loop). */
function load<T>(f: () => Promise<T>): () => Promise<T> {
  return () => f().then((m) => { sessionStorage.removeItem('chunk-reload'); return m; }).catch((e) => {
    if (!sessionStorage.getItem('chunk-reload')) { sessionStorage.setItem('chunk-reload', '1'); location.reload(); return new Promise<T>(() => {}); }
    throw e;
  });
}
const Landing = lazy(load(() => import('./pages/funnel/Landing')));
const Quiz = lazy(load(() => import('./pages/funnel/Quiz')));
const PlanReveal = lazy(load(() => import('./pages/funnel/PlanReveal')));
const Pricing = lazy(load(() => import('./pages/funnel/Pricing')));
const Welcome = lazy(load(() => import('./pages/funnel/Welcome')));
const Demo = lazy(load(() => import('./pages/funnel/Demo')));
const Reply = lazy(load(() => import('./pages/app/Reply')));
const Record = lazy(load(() => import('./pages/app/Record')));
const Plan = lazy(load(() => import('./pages/app/Plan')));
const Settings = lazy(load(() => import('./pages/app/Settings')));

function Loading() { return <div style={{minHeight: '50vh', display: 'grid', placeItems: 'center', color: 'var(--faint)'}}><span className="spin" /></div>; }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MeProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:step" element={<Quiz />} />
            <Route path="/your-plan" element={<PlanReveal />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/plan" replace />} />
              <Route path="course" element={<Navigate to="/app/plan" replace />} />
              <Route path="reply" element={<Reply />} />
              <Route path="record" element={<Record />} />
              <Route path="journal" element={<Navigate to="/app/record" replace />} />
              <Route path="timeline" element={<Navigate to="/app/record" replace />} />
              <Route path="plan" element={<Plan />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MeProvider>
    </BrowserRouter>
  </StrictMode>,
);
