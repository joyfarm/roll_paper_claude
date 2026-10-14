import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ensureSession, supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useToast } from '../components/Toast';
import { NOTE_PALETTE } from '../constants/notePalette';
import { countChars, randomSlug, sliceChars, timeAgo } from '../lib/utils';

const HERO_NOTES = [
  { text: '생일 축하해! 🎂', who: '지민', x: '4%', y: '6%', r: -6, c: 0 },
  { text: '늘 고마워 💕', who: '서연', x: '52%', y: '0%', r: 5, c: 2 },
  { text: '졸업 축하합니다 🎓', who: '도윤', x: '18%', y: '48%', r: 3, c: 3 },
  { text: '새 출발 응원해요!', who: '하린', x: '60%', y: '44%', r: -4, c: 4 },
  { text: '보고 싶을 거야 🥹', who: '민준', x: '36%', y: '24%', r: -1, c: 1 },
];

function HeroWall() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl">
      <div className="wall absolute inset-0 rounded-[2rem] opacity-90" />
      {HERO_NOTES.map((n, i) => {
        const sw = NOTE_PALETTE[n.c];
        return (
          <motion.div
            key={n.text}
            className="absolute flex h-[38%] w-[34%] flex-col rounded-[3px] p-3 pt-5"
            style={{ left: n.x, top: n.y, backgroundColor: sw.bg, color: sw.text, boxShadow: 'var(--shadow-note)' }}
            initial={{ opacity: 0, scale: 0.6, rotate: n.r - 12 }}
            animate={{ opacity: 1, scale: 1, rotate: n.r, y: [0, -6, 0] }}
            transition={{
              opacity: { delay: 0.2 + i * 0.12 },
              scale: { delay: 0.2 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 },
              rotate: { delay: 0.2 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 },
              y: { repeat: Infinity, duration: 4 + i * 0.6, ease: 'easeInOut', delay: i * 0.3 },
            }}
            whileHover={{ scale: 1.08, rotate: 0, zIndex: 10 }}
          >
            <span className="tape absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2" />
            <p className="font-hand flex-1 text-[clamp(14px,2.2vw,22px)] leading-tight">{n.text}</p>
            <p className="font-hand text-right text-[clamp(12px,1.6vw,16px)] font-bold opacity-80">— {n.who}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function AuthPanel({ onBack }) {
  const toast = useToast();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleKakaoLogin = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast(error.message);
        setBusy(false);
      }
    } catch {
      toast('카카오 로그인 연결 중 오류가 발생했어요');
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast(error.message.includes('confirm') ? '이메일 인증을 먼저 완료해 주세요' : '이메일 또는 비밀번호를 확인해 주세요');
      else if (onBack) onBack();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast(error.message);
      else if (!data.session) setSent(true);
      else if (onBack) onBack();
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-5xl">📬</div>
        <h2 className="font-display mt-3 text-2xl text-white">메일함을 확인해 주세요</h2>
        <p className="mt-2 text-sm text-ink-300">
          <b className="text-ink-100">{email}</b> 으로 인증 링크를 보냈어요.
          <br />
          링크를 누르면 바로 보드를 관리할 수 있어요.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" className="btn-ghost" onClick={() => { setSent(false); setMode('signin'); }}>
            로그인으로 가기
          </button>
          {onBack && (
            <button type="button" className="btn-ghost" onClick={onBack}>
              닫기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-xs text-ink-300 transition hover:text-white"
        >
          ← 로그인 없이 바로 보드 만들기
        </button>
      )}

      {/* 카카오 간편 로그인 버튼 */}
      <button
        type="button"
        onClick={handleKakaoLogin}
        disabled={busy}
        id="btn-kakao-login"
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3 text-sm font-bold text-[#191919] shadow-md transition hover:bg-[#FDD835] active:scale-[0.98] disabled:opacity-50"
      >
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.76 1.838 5.178 4.622 6.516-.204.757-.738 2.748-.847 3.176-.135.534.195.526.41.383.17-.113 2.684-1.823 3.766-2.56.666.096 1.349.146 2.049.146 5.523 0 10-3.477 10-7.772S17.523 3 12 3z" />
        </svg>
        카카오로 3초 만에 시작하기
      </button>

      <div className="flex items-center gap-3 text-xs text-ink-500">
        <span className="h-px flex-1 bg-white/10" />
        <span>또는 이메일로 계속하기</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 rounded-xl bg-white/5 p-1 text-sm">
          {[
            ['signin', '로그인'],
            ['signup', '회원가입'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              id={`tab-${key}`}
              onClick={() => setMode(key)}
              className={`relative rounded-lg py-2 font-semibold transition ${mode === key ? 'text-ink-950' : 'text-ink-300 hover:text-white'}`}
            >
              {mode === key && (
                <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-ink-100" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <input id="auth-email" type="email" required className="field" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input
          id="auth-password"
          type="password"
          required
          minLength={6}
          className="field"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />
        <button type="submit" className="btn-primary py-3" disabled={busy} id="auth-submit">
          {busy ? '잠시만요…' : mode === 'signin' ? '로그인' : '가입하고 시작하기'}
        </button>
      </form>
    </div>
  );
}

function CreateBoard({ user, isMember, onSwitchToAuth }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [boards, setBoards] = useState(null);

  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) toast(error.message);
    } catch {
      toast('카카오 로그인 연결 중 오류가 발생했어요');
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setBoards([]);
      return;
    }
    supabase
      .from('boards')
      .select('id, title, slug, is_locked, created_at, messages(count)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBoards(data ?? []));
  }, [user?.id]);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);

    let ownerId = user?.id;
    if (!ownerId) {
      try {
        const session = await ensureSession();
        ownerId = session?.user?.id;
      } catch (err) {
        console.error('Session error:', err);
        toast('세션을 준비하지 못했어요. 페이지를 새로고침해 주세요.');
        setBusy(false);
        return;
      }
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = randomSlug();
      const { error } = await supabase.from('boards').insert({
        owner_id: ownerId,
        title: title.trim(),
        description: description.trim() || null,
        slug,
      });
      if (!error) return navigate(`/b/${slug}`);
      if (error.code === '42501') {
        toast('Supabase DB에 익명 보드 생성 RLS 정책 적용이 필요해요');
        console.error('RLS policy issue: Please run supabase/migrations/20261014200500_allow_anonymous_boards.sql in Supabase SQL Editor');
        break;
      }
      if (error.code !== '23505') break; // slug 충돌일 때만 재시도
    }
    setBusy(false);
    toast('보드를 만들지 못했어요');
  };

  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '회원';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-white">새 롤링페이퍼 만들기</h2>
          {isMember ? (
            <div className="flex items-center gap-2">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover border border-white/20"
                />
              )}
              <span className="max-w-[120px] truncate text-xs text-ink-300">{displayName}</span>
              <button
                type="button"
                className="text-xs text-ink-500 hover:text-ink-300"
                onClick={() => supabase.auth.signOut()}
                id="btn-signout"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-glow-violet transition hover:underline"
              onClick={onSwitchToAuth}
              id="btn-switch-auth"
            >
              로그인 / 가입 →
            </button>
          )}
        </div>

        {!isMember && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-xs text-ink-300">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                로그인 없이 바로 보드 만들기 가능
              </span>
              <span className="text-[11px] text-ink-500">계정을 연결하면 다른 기기에서도 보드를 관리할 수 있어요.</span>
            </div>
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FEE500] px-3 py-1.5 text-xs font-bold text-[#191919] transition hover:bg-[#FDD835]"
              id="btn-quick-kakao"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.76 1.838 5.178 4.622 6.516-.204.757-.738 2.748-.847 3.176-.135.534.195.526.41.383.17-.113 2.684-1.823 3.766-2.56.666.096 1.349.146 2.049.146 5.523 0 10-3.477 10-7.772S17.523 3 12 3z" />
              </svg>
              카카오 로그인
            </button>
          </div>
        )}

        <input
          id="board-title"
          className="field"
          placeholder="예) 민수 생일 축하해! 🎉"
          value={title}
          onChange={(e) => setTitle(countChars(e.target.value) > 100 ? sliceChars(e.target.value, 100) : e.target.value)}
          required
        />
        <input
          id="board-description"
          className="field"
          placeholder="한 줄 소개 (선택)"
          value={description}
          onChange={(e) => setDescription(sliceChars(e.target.value, 500))}
        />
        <button type="submit" className="btn-primary py-3" disabled={busy || !title.trim()} id="board-create">
          {busy ? '만드는 중…' : '보드 만들기 →'}
        </button>
      </form>

      {user?.id && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">내 보드</h3>
          {boards === null ? (
            <p className="text-sm text-ink-500">불러오는 중…</p>
          ) : boards.length === 0 ? (
            <p className="text-sm text-ink-500">아직 만든 보드가 없어요.</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
              {boards.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/b/${b.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:border-glow-violet/40 hover:bg-white/[0.07]"
                  >
                    <span className="truncate text-sm text-ink-100">
                      {b.is_locked && '🔒 '}
                      {b.title}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-ink-500">
                      📝 {b.messages?.[0]?.count ?? 0} · {timeAgo(b.created_at)}
                      <span className="ml-1 inline-block transition group-hover:translate-x-0.5">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, loading, isMember } = useSession();
  const [view, setView] = useState('create'); // 'create' | 'auth'

  useEffect(() => {
    document.title = '롤링페이퍼 — 마음을 붙이는 디지털 벽';
    // 비로그인 방문자도 즉시 세션을 갖도록 보장
    ensureSession().catch(() => {});
  }, []);

  return (
    <main className="aurora min-h-screen">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:min-h-screen lg:grid-cols-[1.1fr_1fr] lg:py-0">
        <section className="flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> 실시간으로 함께 채워요
            </span>
            <h1 className="font-display mt-5 text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              마음을 붙이는
              <br />
              <span className="bg-linear-to-r from-glow-amber via-glow-pink to-glow-violet bg-clip-text text-transparent">
                디지털 벽
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-300">
              링크 하나만 공유하면 친구들이 파스텔 포스트잇에 마음을 적어 붙여요. 원하는 자리로 끌어서 옮기고,
              다른 사람이 붙이는 모습도 실시간으로 볼 수 있어요.
            </p>
          </motion.div>

          <motion.div
            className="glass max-w-md rounded-3xl p-6 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            {loading ? (
              <p className="py-8 text-center text-sm text-ink-500">확인 중…</p>
            ) : view === 'auth' && !isMember ? (
              <AuthPanel onBack={() => setView('create')} />
            ) : (
              <CreateBoard
                user={user}
                isMember={isMember}
                onSwitchToAuth={() => setView('auth')}
              />
            )}
          </motion.div>
        </section>

        <section aria-label="롤링페이퍼 예시">
          <HeroWall />
        </section>
      </div>
    </main>
  );
}

