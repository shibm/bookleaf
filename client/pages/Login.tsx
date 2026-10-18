import type { FormEvent } from 'react';
import type { User, Data } from '../types.ts';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, LockKeyhole, BookOpen } from 'lucide-react';
import Brand from '../components/Brand.tsx';
import { api } from '../api.ts';
export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(
        (
          await api<Data<{ user: User; csrfToken: string }>>('/auth/login', {
            method: 'POST',
            body: { email, password },
          })
        ).data.user,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <a
          className="brand"
          href="https://www.bookleafpub.in/"
          target="_blank"
          rel="noreferrer"
        >
          <Brand />
        </a>
        <div className="login-intro">
          <span className="eyebrow">YOUR PUBLISHING JOURNEY, TOGETHER.</span>
          <h1>
            Publishing made easy.
            <br />
            <span>
              Support for every <br />
              new chapter.
            </span>
          </h1>
          <p>
            Your books, your royalties, and a team that’s always in your corner.
            A little support for the stories only you can tell.
          </p>
          <div
            className="author-community"
            aria-label="Authors from the BookLeaf community"
          >
            <img
              src="/brand/author-community-1.png"
              alt="BookLeaf author with her published book"
              className="community-photo photo-one"
            />
            <img
              src="/brand/author-community-3.png"
              alt="BookLeaf author holding his book"
              className="community-photo photo-two"
            />
            <img
              src="/brand/author-community-2.jpg"
              alt="BookLeaf author sharing her published book"
              className="community-photo photo-three"
            />
            <div className="community-caption">
              <BookOpen size={19} />
              <span>
                Real stories.
                <br />
                <strong>Extraordinary storytellers.</strong>
              </span>
            </div>
          </div>
        </div>
        <a
          className="website-link"
          href="https://www.bookleafpub.in/"
          target="_blank"
          rel="noreferrer"
        >
          Visit BookLeaf Publishing <ArrowUpRight size={15} />
        </a>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="eyebrow">WELCOME BACK TO BOOKLEAF</span>
          <h2>Your author workspace.</h2>
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
