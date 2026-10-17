import React from 'react';
import { useState } from 'react';
import { Leaf, BookOpen, ArrowRight, LockKeyhole } from 'lucide-react';
import { api } from '../api';
export default function Login({ onLogin }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(
        (
          await api('/auth/login', {
            method: 'POST',
            body: { email, password },
          })
        ).data.user,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <div className="brand-icon">
            <Leaf />
          </div>
          <div>
            bookleaf<span>PUBLISHING</span>
          </div>
        </div>
        <div>
          <span className="eyebrow">YOUR WORDS. OUR SHARED JOURNEY.</span>
          <h1>
            Every great story
            <br />
            deserves support.
          </h1>
          <p>
            Your books, your royalties, and a team that’s always in your corner.
            Welcome to your author workspace.
          </p>
          <div className="story-art">
            <BookOpen size={105} strokeWidth={0.7} />
            <span>
              THE NEXT
              <br />
              <i>chapter</i>
              <small>STARTS WITH YOU</small>
            </span>
          </div>
        </div>
        <small>BookLeaf Publishing · India & United States</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="eyebrow">WELCOME TO BOOKLEAF</span>
          <h2>A space for your story.</h2>
          <p>Sign in to your author or operations account.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
            <button className="button full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to your workspace'}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-note">
            <LockKeyhole size={16} />
            <span>
              Your account and conversations stay private.
              <br />
              Demo credentials are available in the project README.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
