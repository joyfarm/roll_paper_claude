import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toNote } from '../lib/noteMapper';

const isNewer = (a, b) => new Date(a).getTime() > new Date(b).getTime();

/**
 * 보드 하나의 포스트잇 상태를 관리한다 (명세서 3장).
 * 조회 · 작성 · 이동 · 삭제 · Realtime 구독을 모두 담당.
 */
export function useBoardNotes(boardId, { onError } = {}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const moveSeq = useRef({}); // 포스트잇별 이동 요청 순번 (마지막 요청만 반영)
  const failedRows = useRef({}); // 작성 실패한 행 (재시도용)
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const report = (msg) => onErrorRef.current?.(msg);

  /* ---------------------------------------------------------------- */
  /* 3-1. 조회                                                         */
  /* ---------------------------------------------------------------- */
  const load = useCallback(async () => {
    if (!boardId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (error) {
      report('포스트잇을 불러오지 못했어요');
      setLoading(false);
      return;
    }

    setNotes((prev) => {
      const server = data.map((r) => toNote(r));
      const ids = new Set(server.map((n) => n.id));
      // 아직 서버에 없는 로컬 포스트잇(저장 중/실패)은 유지
      const localOnly = prev.filter((n) => n.status !== 'synced' && !ids.has(n.id));
      return [...server, ...localOnly];
    });
    setLoading(false);
  }, [boardId]);

  /* ---------------------------------------------------------------- */
  /* 3-4. Realtime                                                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!boardId) return undefined;
    setLoading(true);
    load();

    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `board_id=eq.${boardId}` },
        ({ new: row }) => {
          setNotes((prev) =>
            prev.some((n) => n.id === row.id)
              ? prev.map((n) => (n.id === row.id ? toNote(row) : n)) // 내가 만든 것 → 확정
              : [...prev, toNote(row)]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `board_id=eq.${boardId}` },
        ({ new: row }) => {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === row.id && n.status !== 'pending' && isNewer(row.updated_at, n.updatedAt)
                ? toNote(row)
                : n
            )
          );
        }
      )
      // DELETE 이벤트는 필터를 지원하지 않으므로 전체 구독 후 id 로 매칭
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, ({ old }) => {
        if (old?.id) setNotes((prev) => prev.filter((n) => n.id !== old.id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setOnline((wasOnline) => {
            if (!wasOnline) load(); // 재연결 시 재동기화
            return true;
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setOnline(false);
        }
      });

    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      load();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      supabase.removeChannel(channel);
    };
  }, [boardId, load]);

  /* ---------------------------------------------------------------- */
  /* 3-2. 작성                                                         */
  /* ---------------------------------------------------------------- */
  const insertRow = useCallback(async (row) => {
    const { data, error } = await supabase.from('messages').insert(row).select().single();

    // 23505 = 이미 저장됨 (응답만 유실된 재시도) → 성공으로 간주
    if (error && error.code !== '23505') {
      failedRows.current[row.id] = row;
      setNotes((prev) => prev.map((n) => (n.id === row.id ? { ...n, status: 'error' } : n)));
      report(
        error.code === '42501' ? '작성이 마감된 보드예요' : '포스트잇을 붙이지 못했어요'
      );
      return false;
    }

    delete failedRows.current[row.id];
    setNotes((prev) =>
      prev.map((n) => (n.id === row.id ? (data ? toNote(data) : { ...n, status: 'synced' }) : n))
    );
    return true;
  }, []);

  const addNote = useCallback(
    ({ authorId, authorName, content, color, position }) => {
      // id 를 클라이언트에서 만들면 Realtime INSERT 와 낙관적 객체를 같은 id 로 합칠 수 있다
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const row = {
        id,
        board_id: boardId,
        author_id: authorId ?? null,
        author_name: authorName,
        content,
        color,
        position_x: position.x,
        position_y: position.y,
      };
      setNotes((prev) => [...prev, toNote({ ...row, created_at: now, updated_at: now }, 'pending')]);
      return insertRow(row);
    },
    [boardId, insertRow]
  );

  const retryNote = useCallback(
    (id) => {
      const row = failedRows.current[id];
      if (!row) return;
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'pending' } : n)));
      insertRow(row);
    },
    [insertRow]
  );

  const discardNote = useCallback((id) => {
    delete failedRows.current[id];
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /* ---------------------------------------------------------------- */
  /* 3-3. 이동                                                         */
  /* ---------------------------------------------------------------- */
  const moveNote = useCallback(async (id, position, prevPosition) => {
    const seq = (moveSeq.current[id] ?? 0) + 1;
    moveSeq.current[id] = seq;

    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, position, status: 'pending' } : n)));

    const { data, error } = await supabase
      .from('messages')
      .update({ position_x: position.x, position_y: position.y })
      .eq('id', id)
      .select()
      .single(); // RLS 로 거부되면 0행 → 에러로 잡힘

    if (moveSeq.current[id] !== seq) return; // 더 최신 이동 요청이 있음

    if (error) {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, position: prevPosition, status: 'synced' } : n))
      );
      report('위치를 저장하지 못했어요');
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? toNote(data) : n)));
  }, []);

  /* ---------------------------------------------------------------- */
  /* 삭제                                                              */
  /* ---------------------------------------------------------------- */
  const deleteNote = useCallback(async (id) => {
    const removed = notesRef.current.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));

    const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      if (removed) {
        setNotes((prev) => (prev.some((n) => n.id === id) ? prev : [...prev, removed]));
      }
      report('포스트잇을 삭제하지 못했어요');
      return false;
    }
    return true;
  }, []);

  return { notes, loading, online, addNote, retryNote, discardNote, moveNote, deleteNote, reload: load };
}
