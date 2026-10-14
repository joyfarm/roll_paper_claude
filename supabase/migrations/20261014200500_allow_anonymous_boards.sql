-- =============================================================
-- 익명 사용자(비로그인 게스트)도 롤링페이퍼 보드(방) 생성 허용
-- Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- =============================================================

drop policy if exists "boards_insert_owner" on public.boards;

create policy "boards_insert_owner"
  on public.boards for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
  );
