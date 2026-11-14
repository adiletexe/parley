import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import './styles/base.css';
import {MeProvider} from './lib/me';
import {AppShell} from './components/AppShell';

const Landing = lazy(() => import('./pages/funnel/Landing'));
const Quiz = lazy(() => import('./pages/funnel/Quiz'));
const PlanReveal = lazy(() => import('./pages/funnel/PlanReveal'));
const Pricing = lazy(() => import('./pages/funnel/Pricing'));
const Welcome = lazy(() => import('./pages/funnel/Welcome'));
const Demo = lazy(() => import('./pages/funnel/Demo'));
const Reply = lazy(() => import('./pages/app/Reply'));
const Journal = lazy(() => import('./pages/app/Journal'));
const Timeline = lazy(() => import('./pages/app/Timeline'));
const Plan = lazy(() => import('./pages/app/Plan'));
const Settings = lazy(() => import('./pages/app/Settings'));

function Loading() { return <div style={{minHeight: '50vh', display: 'grid', placeItems: 'center', color: 'var(--faint)'}}><span className="spin" /></div>; }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MeProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:step" element={<Quiz />} />
            <Route path="/your-plan" element={<PlanReveal />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/reply" replace />} />
              <Route path="reply" element={<Reply />} />
              <Route path="journal" element={<Journal />} />
              <Route path="timeline" element={<Timeline />} />
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
