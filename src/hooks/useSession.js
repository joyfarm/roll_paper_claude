import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 현재 Supabase 세션을 구독한다.
 * - loading: 세션 확인 중
 * - isMember: 익명이 아닌 정식 회원 (보드 생성 가능)
 */
export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  return {
    session,
    user,
    loading: session === undefined,
    isMember: !!user && !user.is_anonymous,
  };
}
