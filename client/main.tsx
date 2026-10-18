import type { User, Data } from './types.ts';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  Leaf,
  LayoutDashboard,
  BookOpen,
  MessagesSquare,
  ArrowUpRight,
  LogOut,
  ChevronRight,
  LifeBuoy,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
import { api } from './api.ts';
import { date } from './utils.ts';
import { Empty } from './components/shared.tsx';
import Brand from './components/Brand.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Books from './pages/Books.tsx';
import TicketQueue from './pages/TicketQueue.tsx';
import NewTicket from './pages/NewTicket.tsx';
import TicketDetail from './pages/TicketDetail.tsx';
import { createRoot } from 'react-dom/client';
import './styles.css';
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(location.pathname),
    [notice, setNotice] = useState(''),
    [mobile, setMobile] = useState(false);
  const navigate = useCallback((p: string) => {
    history.pushState({}, '', p);
    setPath(p);
    setMobile(false);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    window.addEventListener('popstate', pop);
    api<Data<User>>('/auth/me')
      .then((r) => setUser(r.data))
      .catch((e) => {
        if (e.status !== 401) setNotice(e.message);
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const notify = useCallback((s: string) => {
    setNotice(s);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  if (loading)
    return (
      <div className="boot">
        <Leaf /> Opening BookLeaf…
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          navigate('/');
        }}
      />
    );
  const admin = user.role === 'admin';
  const links: [string, string, LucideIcon][] = [
    ['/', 'Overview', LayoutDashboard],
    ...(!admin
      ? [['/books', 'My books', BookOpen] as [string, string, LucideIcon]]
      : []),
    ['/tickets', admin ? 'Ticket queue' : 'My tickets', MessagesSquare],
  ];
  const active =
    path === '/'
      ? 'Overview'
      : path.startsWith('/books')
        ? 'My books'
        : admin
          ? 'Ticket queue'
          : 'My tickets';
  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? 'shown' : ''}`}>
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <Brand />
        </a>
        <div className="workspace">
          {admin ? 'OPERATIONS WORKSPACE' : 'AUTHOR WORKSPACE'}
        </div>
        <nav>
          {links.map(([url, label, Icon]) => (
            <a
              key={url}
              className={active === label ? 'active' : ''}
              href={url}
              onClick={(e) => {
                e.preventDefault();
                navigate(url);
              }}
            >
              <Icon size={19} />
              {label}
              {active === label && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-help">
          <div className="help-icon">
            <LifeBuoy size={21} />
          </div>
          <h4>A little support goes a long way.</h4>
          <p>We’re here for every chapter of your publishing journey.</p>
          <button onClick={() => navigate(admin ? '/tickets' : '/tickets/new')}>
            {' '}
            {admin ? 'Open ticket queue' : 'Let’s talk'}{' '}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">
            {user.name
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>{admin ? 'Support administrator' : 'BookLeaf author'}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Log out"
            onClick={async () => {
              try {
                await api('/auth/logout', { method: 'POST' });
                setUser(null);
              } catch (e) {
                notify(e instanceof Error ? e.message : 'Request failed.');
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <button
            className="mobile-toggle icon-button"
            onClick={() => setMobile(!mobile)}
            aria-label="Toggle navigation"
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <span className="breadcrumb">
            Workspace <ChevronRight size={13} /> <b>{active}</b>
          </span>
          <div className="header-right">
            <span className="live-dot" />{' '}
            {admin ? 'Operations portal' : 'Author portal'}
            <span className="header-divider" />
            <span className="header-date">{date(new Date())}</span>
          </div>
        </header>
        <main>
          {path === '/tickets/new' && !admin ? (
            <NewTicket navigate={navigate} notify={notify} />
          ) : path.startsWith('/tickets/') ? (
            <TicketDetail
              id={path.split('/')[2]}
              user={user}
              navigate={navigate}
              notify={notify}
            />
          ) : path === '/tickets' ? (
            <TicketQueue admin={admin} navigate={navigate} notify={notify} />
          ) : path === '/books' && !admin ? (
            <Books notify={notify} />
          ) : path === '/' ? (
            <Dashboard user={user} navigate={navigate} notify={notify} />
          ) : (
            <Empty title="Page not found">
              <button className="button" onClick={() => navigate('/')}>
                Back to overview
              </button>
            </Empty>
          )}
        </main>
        <footer>
          Publishing made easy. Support for every chapter.
          <span>BookLeaf Publishing · Author Support</span>
        </footer>
      </div>
      {notice && (
        <div role="status" className="toast">
          <AlertCircle size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');
createRoot(root).render(<App />);
