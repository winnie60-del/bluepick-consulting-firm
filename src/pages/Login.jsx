import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { COMPANY } from '../config/company';
import Logo from '../components/Logo';

export default function Login() {
  const { db, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!login(email, password)) setError('Email or password is incorrect. Try one of the demo accounts below.');
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <h1>{COMPANY.loginHeading}</h1>
        <p className="muted">{COMPANY.system}</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn" type="submit">Sign in</button>
        <details>
          <summary>Demo accounts</summary>
          {db.users.map((u) => (
            <button type="button" key={u.id} className="link" onClick={() => { setEmail(u.email); setPassword(u.password); }}>
              {u.name} ({u.role})
            </button>
          ))}
        </details>
      </form>
    </div>
  );
}
