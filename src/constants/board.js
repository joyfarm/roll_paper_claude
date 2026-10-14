/** 논리 캔버스 (명세서 2-3) */
export const CANVAS_W = 1600;
export const CANVAS_H = 1000;
export const NOTE_SIZE = 200;
export const MAX_X = CANVAS_W - NOTE_SIZE; // 1400
export const MAX_Y = CANVAS_H - NOTE_SIZE; // 800

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 1;

/** 드래그 */
export const CLICK_THRESHOLD = 5; // px 미만 이동은 클릭으로 처리
export const DRAG_ELASTIC = 0.1; // 경계 밖으로 끌 때 저항
export const KEY_STEP = 10;
export const KEY_STEP_FAST = 50;

/** 글자 수 제한 (명세서 2-2) */
export const NAME_MAX = 20;
export const CONTENT_MAX = 200;
export const CONTENT_WARN = 180;
export const CONTENT_MAX_LINES = 8;
export const DEFAULT_AUTHOR = '익명의 친구';

export const SPRING = { type: 'spring', stiffness: 400, damping: 30 };
