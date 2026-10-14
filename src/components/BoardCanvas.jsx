import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import StickyNote from './StickyNote';
import { CANVAS_H, CANVAS_W, MAX_SCALE, MIN_SCALE } from '../constants/board';
import { clamp } from '../lib/utils';

/**
 * 1600×1000 논리 캔버스. 컨테이너 폭에 맞춰 scale 하고,
 * scale 이 최소값(0.5)에 닿으면 스크롤로 전환한다.
 */
export default function BoardCanvas({ ref, notes, emptyState, onMove, onOpen, onRetry, onDiscard }) {
  const scrollRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [zMap, setZMap] = useState({});
  const zCounter = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      setScale(clamp(entry.contentRect.width / CANVAS_W, MIN_SCALE, MAX_SCALE));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 새 포스트잇을 놓을 위치: 지금 보고 있는 영역의 중앙 (논리 좌표)
  useImperativeHandle(
    ref,
    () => ({
      getViewportCenter() {
        const el = scrollRef.current;
        if (!el) return { x: CANVAS_W / 2, y: CANVAS_H / 2 };
        const rect = el.getBoundingClientRect();
        const visibleTop = Math.max(0, -rect.top);
        const visibleH = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
        return {
          x: (el.scrollLeft + el.clientWidth / 2) / scale,
          y: (el.scrollTop + visibleTop + Math.max(visibleH, 0) / 2) / scale,
        };
      },
    }),
    [scale]
  );

  const bringToFront = useCallback((id) => {
    zCounter.current += 1;
    const z = zCounter.current;
    setZMap((prev) => (prev[id] === z ? prev : { ...prev, [id]: z }));
  }, []);

  return (
    <div ref={scrollRef} className="w-full overflow-auto rounded-3xl" id="board-scroll">
      <div className="relative mx-auto" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div
          id="board-canvas"
          className="wall absolute left-0 top-0 overflow-hidden rounded-3xl"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <AnimatePresence>
            {notes.map((note, i) => (
              <StickyNote
                key={note.id}
                note={note}
                scale={scale}
                zIndex={zMap[note.id] ? 1000 + zMap[note.id] : i + 1}
                onFront={bringToFront}
                onMove={onMove}
                onOpen={onOpen}
                onRetry={onRetry}
                onDiscard={onDiscard}
              />
            ))}
          </AnimatePresence>

          {notes.length === 0 && emptyState}
        </div>
      </div>
    </div>
  );
}
