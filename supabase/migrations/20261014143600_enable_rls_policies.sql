-- =============================================================
-- 디지털 롤링페이퍼: Row Level Security 정책
--   * auth.uid()는 (select auth.uid())로 감싸 행마다 재평가되지 않도록 최적화
--   * Supabase 익명 로그인 사용자도 role = authenticated 이므로
--     보드 생성은 is_anonymous 가 아닌 "정식 회원"에게만 허용
-- =============================================================

alter table public.boards   enable row level security;
alter table public.messages enable row level security;

-- -------------------------------------------------------------
-- boards
-- -------------------------------------------------------------

-- 조회: 공개 보드는 누구나, 비공개 보드는 주인만
create policy "boards_select_public_or_owner"
  on public.boards for select
  to anon, authenticated
  using (
    is_public
    or owner_id = (select auth.uid())
  );

-- 생성: 본인 소유로만 (익명 로그인 사용자 포함)
create policy "boards_insert_owner"
  on public.boards for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
  );

-- 수정: 주인만 (owner_id 변경 불가)
create policy "boards_update_owner"
  on public.boards for update
  to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 삭제: 주인만
create policy "boards_delete_owner"
  on public.boards for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- -------------------------------------------------------------
-- messages
-- -------------------------------------------------------------

-- 조회: 공개 보드의 메시지는 누구나, 비공개 보드는 보드 주인만
create policy "messages_select_visible_board"
  on public.messages for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = messages.board_id
        and (b.is_public or b.owner_id = (select auth.uid()))
    )
  );

-- 작성: 공개 + 마감 전 보드에만.
--       author_id 는 비우거나(비로그인) 본인 uid 로만 지정 가능 (사칭 방지)
create policy "messages_insert_open_board"
  on public.messages for insert
  to anon, authenticated
  with check (
    (author_id is null or author_id = (select auth.uid()))
    and exists (
      select 1 from public.boards b
      where b.id = messages.board_id
        and b.is_public
        and not b.is_locked
    )
  );

-- 수정: 작성자 본인(내용/색/위치) 또는 보드 주인(위치 정리 등)
create policy "messages_update_author_or_owner"
  on public.messages for update
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.boards b
      where b.id = messages.board_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.boards b
      where b.id = messages.board_id
        and b.owner_id = (select auth.uid())
    )
  );

-- 삭제: 작성자 본인 또는 보드 주인
create policy "messages_delete_author_or_owner"
  on public.messages for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.boards b
      where b.id = messages.board_id
        and b.owner_id = (select auth.uid())
    )
  );

-- -------------------------------------------------------------
-- Realtime DELETE 이벤트 RLS 지원을 위한 REPLICA IDENTITY 설정
-- RLS가 켜진 테이블에서 DELETE 이벤트 발생 시 이전 행의 board_id / author_id를
-- WAL에 남겨야 Realtime 구독자에게 안전하게 전달할 수 있습니다.
-- -------------------------------------------------------------
alter table public.messages replica identity full;

