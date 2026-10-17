import React from 'react';
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
import { api } from './api';
import { date } from './utils';
import { Empty } from './components/shared';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import TicketQueue from './pages/TicketQueue';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';
import { createRoot } from 'react-dom/client';
import './styles.css';
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(location.pathname),
    [notice, setNotice] = useState(''),
    [mobile, setMobile] = useState(false);
  const navigate = useCallback((p) => {
    history.pushState({}, '', p);
    setPath(p);
    setMobile(false);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    window.addEventListener('popstate', pop);
    api('/auth/me')
      .then((r) => setUser(r.data))
      .catch((e) => {
        if (e.status !== 401) setNotice(e.message);
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const notify = useCallback((s) => {
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
  const links = [
    ['/', 'Overview', LayoutDashboard],
    ...(!admin ? [['/books', 'My books', BookOpen]] : []),
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
          <div className="brand-icon">
            <Leaf size={25} />
          </div>
          <div>
            bookleaf<span>PUBLISHING</span>
          </div>
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
                notify(e.message);
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
          Made for the stories that matter.
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
createRoot(document.getElementById('root')).render(<App />);
