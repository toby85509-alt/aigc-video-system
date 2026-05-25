import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import ScriptEditor from './pages/ScriptEditor';
import VideoStudio from './pages/VideoStudio';
import TaskCenter from './pages/TaskCenter';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/scripts" element={<ScriptEditor />} />
          <Route path="/videos" element={<VideoStudio />} />
          <Route path="/tasks" element={<TaskCenter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
