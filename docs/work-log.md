# 롤링페이퍼 프로젝트 개발 및 작업 진행 보고서

| 항목 | 내용 |
|---|---|
| **프로젝트명** | 디지털 롤링페이퍼 (Roll Paper) |
| **저장소** | [GitHub: joyfarm/roll_paper_claude](https://github.com/joyfarm/roll_paper_claude) |
| **작성일** | 2026-10-14 |
| **기술 스택** | React 19, Vite, Tailwind CSS v4, Framer Motion, Supabase, Kakao OAuth |

---

## 📌 목차
1. [프로젝트 상태 점검 및 잠재 버그 수정](#1-프로젝트-상태-점검-및-잠재-버그-수정)
2. [비로그인(익명) 즉시 보드 생성 개편 (방법 A)](#2-비로그인익명-즉시-보드-생성-개편-방법-a)
3. [깃허브(GitHub) 공개 저장소 생성 및 원격 푸시](#3-깃허브github-공개-저장소-생성-및-원격-푸시)
4. [Vercel 배포 최적화 설정](#4-vercel-배포-최적화-설정)
5. [카카오 간편 로그인(OAuth) 구현 및 이슈 해결](#5-카카오-간편-로그인oauth-구현-및-이슈-해결)
6. [주요 파일 변경 내역](#6-주요-파일-변경-내역)

---

## 1. 프로젝트 상태 점검 및 잠재 버그 수정

초기 코드베이스 분석을 통해 발견된 5가지 잠재적 버그와 성능/안정성 이슈를 해결했습니다.

| 번호 | 구분 | 수정 파일 | 문제점 및 조치 내용 |
|---|---|---|---|
| **1-1** | Realtime DELETE 누락 방지 | `supabase/migrations/20261014143600_enable_rls_policies.sql` | RLS가 켜진 상태에서 `messages` 삭제 시, 이전 행의 `board_id`와 `author_id`가 WAL에 기록되지 않아 실시간 삭제 이벤트가 다른 클라이언트에 브로드캐스트되지 않는 문제 해결.<br>`ALTER TABLE public.messages REPLICA IDENTITY FULL;` 추가 |
| **1-2** | 익명 세션 레이스 컨디션 해결 | `src/pages/BoardPage.jsx` | 보드 접속 직후 빠르게 포스트잇을 붙일 때, `user` 세션이 초기화되기 전에 작성되어 `author_id`가 `null`로 저장되던 문제 해결.<br>`handleSubmit`에서 세션이 없으면 `ensureSession()`을 비동기 대기하도록 보강하여 📌 내 포스트잇 표시 및 수정/삭제 권한 보장 |
| **1-3** | Null 참조 런타임 오류 방지 | `src/components/BoardCanvas.jsx` | `scrollRef.current`가 아직 마운트되지 않은 시점에 `getViewportCenter()`가 호출될 경우 `getBoundingClientRect`에서 발생할 수 있는 TypeError 방지 안전 가드 추가 |
| **1-4** | Realtime 에코 중복 렌더링 방지 | `src/hooks/useBoardNotes.js` | 서버로부터 동일한 타임스탬프(`updated_at`)를 가진 에코 UPDATE가 수신될 때 불필요한 상태 갱신이 일어나는 문제를 방지하기 위해 `isNewer` 비교식을 `>=`에서 `>`로 개선 |
| **1-5** | 루트 정리 | 루트 경로 | 내용이 비어있던 불필요한 0바이트 빈 파일 `rls.sql` 삭제 |

---

## 2. 비로그인(익명) 즉시 보드 생성 개편 (방법 A)

### 2-1. 문제 배경
- 기존 구조는 보드 생성자(호스트)에게 무조건 이메일 회원가입을 요구함.
- Supabase의 기본 `Confirm email`(이메일 인증) 정책으로 인해 가입 직후 로그인이 완료되지 않고 인증 링크를 요구하여 사용자 진입 장벽이 컸음.

### 2-2. 개선 내용
1. **1초 만에 방 개설 (비로그인 친화적 UX)**:
   - 메인 페이지 접속 시 로그인 폼 대신 **"새 롤링페이퍼 만들기" 입력창이 바로 노출**.
   - 제목만 넣고 `[보드 만들기 →]`를 클릭하면 회원가입 없이 즉시 방 개설 및 URL 이동.
2. **세션 유지 및 소유권 보장**:
   - 브라우저 익명 세션(`ensureSession()`)이 자동 연결되어, 생성자 본인은 보드 관리(작성 마감/해제, 포스트잇 정리) 권한을 계속 유지.
   - 브라우저를 닫았다가 다시 열어도 `내 보드` 목록에서 자신이 만든 롤링페이퍼 확인 가능.
3. **DB RLS 정책 변경**:
   - 익명 사용자도 보드를 등록할 수 있도록 `boards_insert_owner` 정책 수정:
     ```sql
     DROP POLICY IF EXISTS "boards_insert_owner" ON public.boards;
     CREATE POLICY "boards_insert_owner" ON public.boards
       FOR INSERT TO authenticated
       WITH CHECK (owner_id = (SELECT auth.uid()));
     ```
   - 별도 마이그레이션 파일 작성: `supabase/migrations/20261014200500_allow_anonymous_boards.sql`

---

## 3. 깃허브(GitHub) 공개 저장소 생성 및 원격 푸시

- **보안 검증**: `.env.local`(Supabase API 키)이 `.gitignore`에 의해 안전하게 제외되었는지 확인.
- **Git 초기화**: `git init -b main`으로 로컬 저장소 초기화 및 첫 커밋 생성.
- **원격 저장소 생성**: GitHub CLI(`gh`)를 통해 `joyfarm` 계정에 공개 저장소 생성 및 자동 푸시.
  - 저장소 주소: **[https://github.com/joyfarm/roll_paper_claude](https://github.com/joyfarm/roll_paper_claude)**

---

## 4. Vercel 배포 최적화 설정

- **SPA 새로고침 404 방지**:
  - React Router 기반 SPA를 Vercel에 배포할 경우 `/b/:slug` 같은 서브 경로에서 새로고침 시 404 에러가 발생하는 현상 방지.
  - 프로젝트 루트에 `vercel.json` 리라이트 설정 파일 생성 및 깃허브 푸시 완료:
    ```json
    {
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/"
        }
      ]
    }
    ```
- **환경 변수 가이드**:
  - Vercel 배포 시 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록하여 즉시 정상 동작할 수 있도록 가이드 제공.

---

## 5. 카카오 간편 로그인(OAuth) 구현 및 이슈 해결

### 5-1. 프론트엔드 UI & OAuth 연동
- 메인 화면에 카카오 공식 옐로우 컬러(`bg-[#FEE500]`) 및 말풍선 심볼이 적용된 **"카카오로 3초 만에 시작하기"** 버튼 구현.
- 비로그인 게스트 배너에서도 원클릭으로 계정을 연결할 수 있는 미니 카카오 로그인 버튼 배치.
- 로그인 완료 시 사용자의 카카오 프로필 사진(아바타)과 닉네임이 상단 헤더에 자동 노출되도록 구현.

### 5-2. 카카오 동의항목 `카카오계정(이메일)` "권한 없음" 이슈 원인 및 해결
- **원인**:
  - Supabase Auth는 카카오 로그인 시 `account_email`을 기본 스코프로 요청함.
  - 카카오 정책상 일반 앱 상태에서는 개인정보보호법에 의해 이메일 동의항목이 `권한 없음`으로 비활성화되어 `KOE205` 에러가 발생함.
- **해결 방안**:
  - 카카오 디벨로퍼스 **[앱 설정] → [비즈니스]**에서 **`개인 개발자 비즈 앱 전환` (본인 휴대폰 인증)**을 1분 만에 완료.
  - 전환 후 **[카카오 로그인] → [동의항목]**에서 `카카오계정(이메일)`이 활성화되어 `선택 동의` 설정 가능.

---

## 6. 주요 파일 변경 내역

```text
├── .gitignore
├── vercel.json                                                   # Vercel SPA 라우팅 리라이트 설정 (신규)
├── docs/
│   ├── feature-spec.md                                           # 기존 기능 명세서
│   └── work-log.md                                               # 전체 작업 진행 보고서 (본 문서)
├── src/
│   ├── components/
│   │   ├── BoardCanvas.jsx                                       # null 참조 안전 가드 추가
│   │   └── Toast.jsx
│   ├── hooks/
│   │   └── useBoardNotes.js                                      # isNewer 타임스탬프 조건 개선
│   └── pages/
│       ├── BoardPage.jsx                                         # 익명 세션 race condition 방지
│       └── HomePage.jsx                                          # 비로그인 즉시 보드 생성 & 카카오 로그인 UI 추가
└── supabase/
    └── migrations/
        ├── 20261014143500_create_boards_and_messages.sql
        ├── 20261014143600_enable_rls_policies.sql                # REPLICA IDENTITY FULL 및 익명 정책 수정
        └── 20261014200500_allow_anonymous_boards.sql             # 익명 보드 생성 허용 독립 마이그레이션 (신규)
```
