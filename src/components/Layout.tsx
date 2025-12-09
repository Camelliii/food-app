import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, CheckSquare, Refrigerator, Upload } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/recipes', icon: BookOpen, label: '菜谱库' },
    { path: '/todo', icon: CheckSquare, label: '待办清单' },
    { path: '/inventory', icon: Refrigerator, label: '冰箱库存' },
    { path: '/import', icon: Upload, label: '导入菜谱' },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">家庭菜谱与食材管理</h1>
      </header>
      
      <nav className="app-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

