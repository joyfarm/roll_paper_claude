import { memo, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { getSwatch } from '../constants/notePalette';
import {
  CLICK_THRESHOLD,
  DRAG_ELASTIC,
  KEY_STEP,
  KEY_STEP_FAST,
  MAX_X,
  MAX_Y,
  NOTE_SIZE,
  SPRING,
} from '../constants/board';
import { clampPosition, elastic } from '../lib/utils';

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * 포스트잇 한 장.
 * 캔버스가 CSS scale 로 축소돼 있으므로 Framer Motion 기본 drag 대신
 * 포인터 이벤트로 직접 계산한다 (화면 px ÷ scale = 논리 좌표).
 */
function StickyNote({ note, scale, zIndex, onFront, onMove, onOpen, onRetry, onDiscard }) {
  const swatch = getSwatch(note.color);
  const draggable = note.canDrag && note.status !== 'error';

  const x = useMotionValue(note.position.x);
  const y = useMotionValue(note.position.y);
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  // 서버/다른 사용자로부터 위치가 바뀌면 스프링으로 이동 (드래그 중에는 무시)
  useEffect(() => {
    if (drag.current?.moved) return;
    const ax = animate(x, note.position.x, SPRING);
    const ay = animate(y, note.position.y, SPRING);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [note.position.x, note.position.y, x, y]);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    onFront(note.id);
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: x.get(),
      oy: y.get(),
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;

    if (!d.moved) {
      if (!draggable || Math.hypot(dx, dy) < CLICK_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
    }
    x.set(elastic(d.ox + dx / scale, 0, MAX_X, DRAG_ELASTIC));
    y.set(elastic(d.oy + dy / scale, 0, MAX_Y, DRAG_ELASTIC));
  };

  const finishDrag = (cancelled) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    if (!d.moved) {
      if (!cancelled) onOpen(note);
      return;
    }
    setDragging(false);

    const pos = clampPosition({ x: x.get(), y: y.get() });
    animate(x, pos.x, SPRING); // 경계 밖이면 튕겨 돌아옴
    animate(y, pos.y, SPRING);

    if (pos.x !== note.position.x || pos.y !== note.position.y) {
      onMove(note.id, pos, note.position);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(note);
      return;
    }
    const dir = ARROWS[e.key];
    if (!dir || !draggable) return;
    e.preventDefault();
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    const pos = clampPosition({
      x: note.position.x + dir[0] * step,
      y: note.position.y + dir[1] * step,
    });
    onFront(note.id);
    onMove(note.id, pos, note.position);
  };

  const stop = (e) => e.stopPropagation();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      id={`note-${note.id}`}
      aria-label={`${note.authorName}님의 포스트잇: ${note.content}`}
      title={draggable ? '끌어서 옮기기 · 클릭해서 크게 보기' : '작성자만 옮길 수 있어요 · 클릭해서 크게 보기'}
      className={`group absolute left-0 top-0 flex select-none flex-col rounded-[3px] p-5 pt-7 outline-none
        focus-visible:ring-4 focus-visible:ring-white/70
        ${draggable ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'}`}
      style={{
        x,
        y,
        width: NOTE_SIZE,
        height: NOTE_SIZE,
        zIndex: dragging ? 9999 : zIndex,
        backgroundColor: swatch.bg,
        color: swatch.text,
        boxShadow: dragging ? 'var(--shadow-note-lift)' : 'var(--shadow-note)',
        touchAction: draggable ? 'none' : 'auto',
        transition: 'box-shadow 200ms ease',
      }}
      initial={{ opacity: 0, scale: 0.6, rotate: note.rotation - 10 }}
      animate={{
        opacity: note.status === 'pending' ? 0.85 : 1,
        scale: dragging ? 1.06 : 1,
        rotate: dragging ? 0 : note.rotation,
      }}
      exit={{ opacity: 0, scale: 0.8, rotate: note.rotation + 8, transition: { duration: 0.2 } }}
      whileHover={dragging ? undefined : { scale: 1.03 }}
      transition={SPRING}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => finishDrag(false)}
      onPointerCancel={() => finishDrag(true)}
      onKeyDown={handleKeyDown}
    >
      {/* 테이프 */}
      <span className="tape pointer-events-none absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-2deg]" />

      {/* 접힌 모서리 */}
      <span
        className="pointer-events-none absolute bottom-0 right-0 h-6 w-6"
        style={{ background: 'linear-gradient(135deg, transparent 50%, rgb(0 0 0 / 0.08) 50%)' }}
      />

      {/* 내 포스트잇 표시 */}
      {note.isMine && (
        <motion.span
          className="absolute right-2 top-1.5 text-base"
          animate={note.status === 'pending' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
          transition={note.status === 'pending' ? { repeat: Infinity, duration: 1 } : undefined}
          aria-label="내 포스트잇"
        >
          📌
        </motion.span>
      )}

      <p className="font-hand line-clamp-5 flex-1 whitespace-pre-wrap break-words text-[21px] leading-[1.2]">
        {note.content}
      </p>
      <p className="font-hand mt-1 truncate text-right text-[17px] font-bold opacity-80">
        — {note.authorName}
      </p>

      {/* 작성 실패 */}
      {note.status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[3px] bg-white/70 backdrop-blur-[2px]">
          <span className="text-sm font-bold text-red-600">❗ 붙이지 못했어요</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="rounded-lg bg-ink-900 px-3 py-1 text-xs font-semibold text-white hover:bg-ink-700"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                onRetry(note.id);
              }}
            >
              다시 시도
            </button>
            <button
              type="button"
              className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-ink-900 hover:bg-ink-100"
              onPointerDown={stop}
              onClick={(e) => {
                stop(e);
                onDiscard(note.id);
              }}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default memo(StickyNote);
