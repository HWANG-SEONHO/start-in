import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setCsrfToken, setUnauthorizedHandler } from './api';

const AccountContext = createContext(null);
export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [notice, setNotice] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const sessionVersion = useRef(0);
  async function acceptSession(session) {
    const version = ++sessionVersion.current;
    setCsrfToken(session.csrf_token || null);
    const saved = session.user ? await api('/me/saved') : [];
    if (version !== sessionVersion.current) return;
    setUser(session.user);
    setSavedJobs(saved);
    setNotice('');
    setReady(true);
  }
  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    setUnauthorizedHandler(() => { sessionVersion.current++; setUser(null); setSavedJobs([]); setCsrfToken(null); setNotice('로그인이 만료되었습니다. 다시 로그인해 주세요.'); });
    api('/auth/session').then(session => { if (active && version === sessionVersion.current) return acceptSession(session); })
      .catch(error => { if (active) { setNotice(error.message); setReady(true); } });
    return () => { active = false; setUnauthorizedHandler(null); };
  }, []);
  async function toggleSaved(job) {
    if (pendingIds.has(job.id)) return;
    const version = sessionVersion.current;
    setPendingIds(previous => new Set([...previous, job.id]));
    try {
      const exists = savedJobs.some(item => item.id === job.id);
      await api(`/me/saved/${job.id}`, { method: exists ? 'DELETE' : 'PUT' });
      if (version !== sessionVersion.current) return;
      setSavedJobs(previous => exists ? previous.filter(item => item.id !== job.id) : [...previous, job]);
    } catch (error) { setNotice(error.message); }
    finally { setPendingIds(previous => { const next = new Set(previous); next.delete(job.id); return next; }); }
  }
  async function logout() {
    sessionVersion.current++;
    try { await api('/auth/logout', { method: 'POST' }); await acceptSession({ user: null }); }
    catch (error) { setNotice(error.message); }
  }
  return <AccountContext.Provider value={{ user, ready, savedJobs, pendingIds, toggleSaved, acceptSession, logout, setNotice }}>
    {children}
    {notice && <div className="service-toast" role="alert">{notice}<button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
  </AccountContext.Provider>;
}
export const useAccount = () => useContext(AccountContext);
