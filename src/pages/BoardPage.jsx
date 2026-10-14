import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ensureSession, supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useBoardNotes } from '../hooks/useBoardNotes';
import { decorateNote } from '../lib/noteMapper';
import { clampPosition } from '../lib/utils';
import { NOTE_SIZE } from '../constants/board';
import { useToast } from '../components/Toast';
import BoardCanvas from '../components/BoardCanvas';
import NoteComposerModal from '../components/NoteComposerModal';
import NoteDetailModal from '../components/NoteDetailModal';

export default function BoardPage() {
  const { slug } = useParams();
  const { user } = useSession();
  const toast = useToast();
  const canvasRef = useRef(null);

  const [board, setBoard] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | notfound
  const [composerOpen, setComposerOpen] = useState(false);
  const [openNoteId, setOpenNoteId] = useState(null);

  /* 3-1. 세션 확보 → 보드 조회 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureSession();
      } catch {
        // 익명 로그인이 꺼져 있어도 열람·작성은 가능
      }
      const { data } = await supabase.from('boards').select('*').eq('slug', slug).maybeSingle();
      if (!alive) return;
      if (!data) return setState('notfound');
      setBoard(data);
      setState('ready');
      document.title = `${data.title} — 롤링페이퍼`;
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const { notes, loading, online, addNote, retryNote, discardNote, moveNote, deleteNote } = useBoardNotes(
    board?.id,
    { onError: toast }
  );

  const isOwner = !!user && user.id === board?.owner_id;
  const viewNotes = useMemo(
    () => notes.map((n) => decorateNote(n, user?.id, board?.owner_id)),
    [notes, user?.id, board?.owner_id]
  );
  const openNote = viewNotes.find((n) => n.id === openNoteId) ?? null;

  const handleOpen = useCallback((note) => setOpenNoteId(note.id), []);

  const handleSubmit = async ({ authorName, content, color }) => {
    let currentUserId = user?.id;
    if (!currentUserId) {
      try {
        const session = await ensureSession();
        currentUserId = session?.user?.id;
      } catch (err) {
        console.warn('익명 세션 생성 실패:', err);
      }
    }
    const c = canvasRef.current?.getViewportCenter() ?? { x: 800, y: 500 };
    const jitter = () => (Math.random() - 0.5) * 80;
    const position = clampPosition({ x: c.x - NOTE_SIZE / 2 + jitter(), y: c.y - NOTE_SIZE / 2 + jitter() });
    setComposerOpen(false);
    addNote({ authorId: currentUserId, authorName, content, color, position });
  };

  const handleDelete = async (id) => {
    setOpenNoteId(null);
    if (await deleteNote(id)) toast('포스트잇을 뗐어요', 'success');
  };

  const toggleLock = async () => {
    const next = !board.is_locked;
    setBoard((b) => ({ ...b, is_locked: next }));
    const { error } = await supabase.from('boards').update({ is_locked: next }).eq('id', board.id);
    if (error) {
      setBoard((b) => ({ ...b, is_locked: !next }));
      toast('설정을 바꾸지 못했어요');
    } else {
      toast(next ? '작성을 마감했어요' : '다시 작성을 받을게요', 'success');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('링크를 복사했어요. 친구들에게 공유해 보세요!', 'success');
    } catch {
      toast('링크를 복사하지 못했어요');
    }
  };

  if (state === 'loading') {
    return (
      <main className="aurora flex min-h-screen items-center justify-center">
        <motion.div
          className="h-14 w-14 rounded-md bg-[#FFF59D] shadow-xl"
          animate={{ rotate: [-6, 6, -6], y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          aria-label="불러오는 중"
        />
      </main>
    );
  }

  if (state === 'notfound') {
    return (
      <main className="aurora flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">🫥</div>
        <h1 className="font-display text-3xl text-white">보드를 찾을 수 없어요</h1>
        <p className="text-ink-300">링크가 잘못되었거나 비공개로 바뀐 보드예요.</p>
        <Link to="/" className="btn-primary mt-2">
          홈으로
        </Link>
      </main>
    );
  }

  const canWrite = board.is_public && !board.is_locked;

  return (
    <main className="aurora min-h-screen pb-28">
      {!online && (
        <div className="sticky top-0 z-40 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-ink-950">
          연결이 끊겼어요. 다시 연결되면 자동으로 맞춰 드릴게요.
        </div>
      )}

      <header className="mx-auto flex max-w-[1680px] flex-wrap items-end justify-between gap-4 px-4 pb-5 pt-6 sm:px-8">
        <div className="min-w-0">
          <Link to="/" className="text-sm text-ink-300 transition hover:text-white" id="nav-home">
            ← 롤링페이퍼
          </Link>
          <h1 className="font-display mt-2 truncate text-3xl text-white sm:text-4xl">{board.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-300">
            {board.description && <span className="mr-2">{board.description}</span>}
            <span className="rounded-full bg-white/5 px-2.5 py-0.5">📝 {notes.length}장</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5">
              <span className={`h-2 w-2 rounded-full ${online ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
              {online ? '실시간' : '오프라인'}
            </span>
            {board.is_locked && <span className="rounded-full bg-red-400/15 px-2.5 py-0.5 text-red-300">🔒 마감됨</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={copyLink} id="btn-copy-link">
            🔗 링크 복사
          </button>
          {isOwner && (
            <button type="button" className="btn-ghost" onClick={toggleLock} id="btn-toggle-lock">
              {board.is_locked ? '🔓 작성 다시 받기' : '🔒 작성 마감'}
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-[1680px] px-4 sm:px-8" aria-label="롤링페이퍼 벽">
        <BoardCanvas
          ref={canvasRef}
          notes={viewNotes}
          onMove={moveNote}
          onOpen={handleOpen}
          onRetry={retryNote}
          onDiscard={discardNote}
          emptyState={
            !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl bg-white/60 px-8 py-6 text-center text-[#4a321f] shadow-lg backdrop-blur-sm">
                  <p className="font-hand text-3xl font-bold">아직 비어 있어요</p>
                  <p className="mt-1 text-sm">첫 번째 마음을 붙여 보세요!</p>
                </div>
              </div>
            )
          }
        />
        <p className="mt-3 text-center text-xs text-ink-500">
          📌 표시가 있는 내 포스트잇은 끌어서 옮길 수 있어요 · 방향키로도 이동 가능 (Shift = 크게)
        </p>
      </section>

      {canWrite && (
        <motion.button
          type="button"
          id="btn-add-note"
          onClick={() => setComposerOpen(true)}
          className="btn-primary fixed bottom-6 right-6 z-30 rounded-2xl px-6 py-4 text-base shadow-2xl"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
        >
          ✍️ 포스트잇 붙이기
        </motion.button>
      )}

      <NoteComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onSubmit={handleSubmit} />
      <NoteDetailModal
        note={openNote}
        canDelete={!!openNote && (openNote.isMine || isOwner) && openNote.status === 'synced'}
        onClose={() => setOpenNoteId(null)}
        onDelete={handleDelete}
      />
    </main>
  );
}
