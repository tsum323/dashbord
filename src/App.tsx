import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BoardPage } from './pages/BoardPage';
import { FeedPage } from './pages/FeedPage';
import { FinancePage } from './pages/FinancePage';
import { HomePage } from './pages/HomePage';
import { IdeasPage } from './pages/IdeasPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';

// HashRouter: GitHub Pages не умеет отдавать index.html на любой путь.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="ideas" element={<IdeasPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
