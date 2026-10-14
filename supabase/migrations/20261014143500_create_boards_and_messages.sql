-- =============================================================
-- 디지털 롤링페이퍼: 테이블 / 인덱스 / 트리거
--   auth.users 1 ─ N boards 1 ─ N messages
-- =============================================================

-- -------------------------------------------------------------
-- 공통: updated_at 자동 갱신 함수
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- boards: 롤링페이퍼 방
-- -------------------------------------------------------------
create table public.boards (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  title       text        not null check (char_length(title) between 1 and 100),
  description text                 check (description is null or char_length(description) <= 500),
  slug        text        not null unique
                                   check (slug ~ '^[a-z0-9-]{4,40}$'),
  theme       text        not null default 'default',
  is_public   boolean     not null default true,
  is_locked   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.boards           is '롤링페이퍼 보드(방)';
comment on column public.boards.owner_id  is '보드를 만든 사용자 (auth.users.id)';
comment on column public.boards.slug      is '공유 링크용 짧은 주소 (/b/{slug})';
comment on column public.boards.is_public is 'true면 링크를 가진 누구나 열람 가능';
comment on column public.boards.is_locked is 'true면 새 메시지 작성 마감';

create index idx_boards_owner_id on public.boards (owner_id);

create trigger trg_boards_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- messages: 포스트잇
-- -------------------------------------------------------------
create table public.messages (
  id          uuid        primary key default gen_random_uuid(),
  board_id    uuid        not null references public.boards (id) on delete cascade,
  author_id   uuid                 references auth.users (id) on delete set null,
  author_name text        not null check (char_length(author_name) between 1 and 30),
  content     text        not null check (char_length(content) between 1 and 500),
  color       text        not null default '#FFF59D'
                                   check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position_x  real        not null default 0,
  position_y  real        not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.messages             is '보드에 남긴 메시지(포스트잇)';
comment on column public.messages.board_id    is '소속 보드 (boards.id)';
comment on column public.messages.author_id   is '작성자 (익명 로그인 포함, 비로그인 시 NULL)';
comment on column public.messages.author_name is '화면에 표시되는 작성자 이름';

-- 보드별 메시지를 시간순으로 조회하는 쿼리 최적화
create index idx_messages_board_id_created_at on public.messages (board_id, created_at);
create index idx_messages_author_id           on public.messages (author_id);

create trigger trg_messages_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- Realtime: 새 포스트잇을 실시간으로 받기
-- -------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
