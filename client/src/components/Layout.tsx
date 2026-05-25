import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: '工作台', icon: '📊' },
  { to: '/materials', label: '素材管理', icon: '📦' },
  { to: '/scripts', label: '剧本生成', icon: '📝' },
  { to: '/videos', label: '视频创作', icon: '🎬' },
  { to: '/tasks', label: '任务中心', icon: '⚡' },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🎬 AIGC 带货视频</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)' }}>
          v1.0 · AI 全栈挑战赛
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
