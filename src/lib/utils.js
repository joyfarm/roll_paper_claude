import { MAX_X, MAX_Y } from '../constants/board';

/** PostgreSQL char_length 와 동일하게 코드포인트 기준으로 센다 (이모지 = 1자) */
export const countChars = (str = '') => [...str].length;

export const sliceChars = (str, max) => [...str].slice(0, max).join('');

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export const clampPosition = ({ x, y }) => ({
  x: Math.round(clamp(x, 0, MAX_X)),
  y: Math.round(clamp(y, 0, MAX_Y)),
});

/** 경계 밖으로 나간 만큼에 저항(elastic)을 준 값 */
export const elastic = (v, min, max, factor) => {
  if (v < min) return min + (v - min) * factor;
  if (v > max) return max + (v - max) * factor;
  return v;
};

export const randomSlug = (len = 8) => {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(buf, (b) => chars[b % chars.length]).join('');
};

export const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};
