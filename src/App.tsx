import React from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Onboarding from './screens/Onboarding';
import RoutineSetup from './screens/RoutineSetup';
import WeekView from './screens/WeekView';
import ShoppingList from './screens/ShoppingList';
import PrepPlan from './screens/PrepPlan';
import RecipeEditor from './screens/RecipeEditor';
import BasesLibrary from './screens/BasesLibrary';
import Settings from './screens/Settings';
import StartNextWeek from './screens/StartNextWeek';
import PrintCentre from './screens/PrintCentre';
import PrintStub from './screens/PrintStub';
import { findConflicts } from './lib/days';
import { useWeekStore } from './store/useWeekStore';
import { Button } from './components/ui';

/** The 390x844 frame the wireframes are drawn at, centred on a neutral stage. */
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-full justify-center bg-stage px-4 py-5">
    <div className="flex h-[844px] max-h-[88vh] w-full max-w-[390px] flex-col overflow-hidden rounded-2xl bg-bg text-ink shadow-2xl">
      {children}
    </div>
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, message, canUndo, undo, save, setMessage } = useWeekStore();
  const nav = useNavigate();
  const loc = useLocation();

  const onSave = () => {
    const bad = state.routines.findIndex(
      (r) => !r.name.trim() || r.groups.some((g) => !g.name.trim() || g.slots.some((s) => !s.name.trim())),
    );
    if (bad >= 0) { nav('/routines'); setMessage('Name every routine, group and meal first.'); return; }

    const conflicts = findConflicts(state.routines);
    if (conflicts.length) {
      nav('/routines');
      setMessage(`Showing the ${conflicts[0].label} conflict — resolve it to save.`);
      return;
    }
    if (save()) {
      const n = Object.keys(state.dayInstances).length;
      setMessage(`Saved · ${state.routines.length} routines${n ? ` · ${n} edited ${n === 1 ? 'day' : 'days'}` : ''}`);
    }
  };

  const tab = (to: string, label: string) => (
    <NavLink to={to} className={({ isActive }) =>
      `flex-1 min-h-[36px] border-0 px-2 py-1.5 text-center text-[12.5px] leading-6
       ${isActive ? 'bg-ink font-semibold text-bg' : 'bg-white text-ink'}`}>
      {label}
    </NavLink>
  );

  return (
    <>
      <header className="flex-shrink-0 border-b border-line px-4 pb-2.5 pt-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-2">Tiffin Week</div>
            <h1 className="mt-0.5 font-display text-[21px] font-bold tracking-tight">
              {loc.pathname.startsWith('/week') ? 'This week' : 'Your routines'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
                  isActive ? 'bg-ink font-semibold text-bg' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              Settings
            </NavLink>
            <Button variant="quiet" onClick={() => nav('/')}>Start over</Button>
          </div>
        </div>
        <div className="mt-2.5 flex overflow-hidden rounded-lg border border-line-2">
          {tab('/routines', 'Routines')}
          {tab('/week', 'This week')}
          {tab('/shopping', 'Shopping')}
          {tab('/prep', 'Prep')}
        </div>
      </header>

      {children}

      <div className="flex-shrink-0 border-t border-line bg-bg px-4 py-3">
        <Button variant="primary" className="w-full" onClick={onSave}>Save</Button>
        <div role="status" aria-live="polite" className="mt-2 min-h-4 text-center text-[11.5px] text-ink-2">
          {message}
          {canUndo && <button type="button" onClick={undo} className="ml-1.5 border-0 bg-transparent px-1.5 font-semibold text-green">Undo</button>}
        </div>
      </div>
    </>
  );
};

export default function App() {
  const { state, ready } = useWeekStore();
  const loc = useLocation();
  if (!ready) return <Frame><div className="p-4 text-sm text-ink-2">Loading…</div></Frame>;

  const configured = state.routines.length > 0;

  // Print sheets render at real page dimensions (A3/A4/A5) and must escape the
  // 390x844 phone frame. The Print centre itself (/print exact) stays inside it.
  const isPrintSheet = /^\/print\/[a-z]+/.test(loc.pathname);
  if (isPrintSheet) {
    return (
      <Routes>
        <Route path="/print/wall" element={<PrintStub id="wall" />} />
        <Route path="/print/prep" element={<PrintStub id="prep" />} />
        <Route path="/print/shopping" element={<PrintStub id="shopping" />} />
        <Route path="/print/fridge" element={<PrintStub id="fridge" />} />
        <Route path="/print/blank" element={<PrintStub id="blank" />} />
        <Route path="/print/recipes" element={<PrintStub id="recipes" />} />
      </Routes>
    );
  }

  return (
    <Frame>
      <Routes>
        <Route path="/" element={configured ? <Navigate to="/routines" replace /> : <Onboarding />} />
        <Route path="/routines" element={<Shell><RoutineSetup /></Shell>} />
        <Route path="/week" element={<Shell><WeekView /></Shell>} />
        <Route path="/week/:date" element={<Shell><WeekView /></Shell>} />
        <Route path="/shopping" element={<ShoppingList />} />
        <Route path="/prep" element={<PrepPlan />} />
        <Route path="/recipes/:id" element={<RecipeEditor />} />
        <Route path="/bases" element={<BasesLibrary />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/start-next-week" element={<StartNextWeek />} />
        <Route path="/print" element={<PrintCentre />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Frame>
  );
}
