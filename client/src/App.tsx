import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import ScriptEditor from './pages/ScriptEditor';
import VideoStudio from './pages/VideoStudio';
import TaskCenter from './pages/TaskCenter';
import Methodology from './pages/Methodology';
import QuickCreate from './pages/QuickCreate';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quick-create" element={<QuickCreate />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/scripts" element={<ScriptEditor />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/videos" element={<VideoStudio />} />
            <Route path="/tasks" element={<TaskCenter />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
