import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import Modal from './Modal';
import ColorPicker from './ColorPicker';
import { DEFAULT_COLOR, getSwatch } from '../constants/notePalette';
import {
  CONTENT_MAX,
  CONTENT_MAX_LINES,
  CONTENT_WARN,
  DEFAULT_AUTHOR,
  NAME_MAX,
} from '../constants/board';
import { countChars, sliceChars } from '../lib/utils';

const NAME_KEY = 'rollpaper:lastName';

export default function NoteComposerModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const shake = useAnimationControls();

  useEffect(() => {
    if (open) {
      setName(localStorage.getItem(NAME_KEY) ?? '');
      setContent('');
    }
  }, [open]);

  const contentLen = countChars(content.trim());
  const canSubmit = contentLen >= 1 && contentLen <= CONTENT_MAX;
  const swatch = getSwatch(color);

  const bump = () => shake.start({ x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.35 } });

  const handleContent = (e) => {
    const next = e.target.value;
    if (next.split('\n').length > CONTENT_MAX_LINES) return bump();
    if (countChars(next) > CONTENT_MAX) {
      setContent(sliceChars(next, CONTENT_MAX));
      return bump();
    }
    setContent(next);
  };

  const handleName = (e) => {
    const next = e.target.value;
    setName(countChars(next) > NAME_MAX ? sliceChars(next, NAME_MAX) : next);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return bump();
    const authorName = name.trim() || DEFAULT_AUTHOR;
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    onSubmit({ authorName, content: content.trim(), color });
  };

  const counterColor =
    contentLen >= CONTENT_MAX ? 'text-red-400' : contentLen >= CONTENT_WARN ? 'text-amber-300' : 'text-ink-500';

  return (
    <Modal open={open} onClose={onClose} labelledBy="composer-title" className="max-w-3xl">
      <form onSubmit={submit} className="grid gap-6 p-6 sm:grid-cols-[1fr_220px] sm:p-8">
        <div className="flex flex-col gap-5">
          <div>
            <h2 id="composer-title" className="font-display text-2xl text-white">
              마음 한 장 붙이기
            </h2>
            <p className="mt-1 text-sm text-ink-300">이름과 메시지를 적고 색을 골라 주세요.</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-xs font-medium text-ink-300">
              보내는 사람
              <span className="text-ink-500">
                {countChars(name)} / {NAME_MAX}
              </span>
            </span>
            <input
              id="composer-name"
              className="field"
              value={name}
              onChange={handleName}
              placeholder={DEFAULT_AUTHOR}
              autoComplete="nickname"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-300">메시지</span>
            <motion.div animate={shake} className="relative">
              <textarea
                id="composer-content"
                className="field min-h-36 resize-none pb-8 leading-relaxed"
                value={content}
                onChange={handleContent}
                placeholder="하고 싶은 말을 적어 주세요 ✍️"
                autoFocus
              />
              <span className={`absolute bottom-3 right-4 text-xs font-semibold tabular-nums ${counterColor}`}>
                {contentLen} / {CONTENT_MAX}
              </span>
            </motion.div>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-300">색상 · {swatch.name}</span>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} id="composer-cancel">
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit} id="composer-submit">
              붙이기 📌
            </button>
          </div>
        </div>

        {/* 실시간 미리보기 */}
        <div className="hidden flex-col items-center justify-center gap-3 sm:flex">
          <span className="text-xs text-ink-500">미리보기</span>
          <motion.div
            layout
            className="relative flex h-[200px] w-[200px] flex-col rounded-[3px] p-5 pt-7"
            style={{ backgroundColor: swatch.bg, color: swatch.text, boxShadow: 'var(--shadow-note)' }}
            animate={{ rotate: -2, backgroundColor: swatch.bg }}
          >
            <span className="tape absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-2deg]" />
            <p className="font-hand line-clamp-5 flex-1 whitespace-pre-wrap break-words text-[21px] leading-[1.2]">
              {content || <span className="opacity-40">여기에 메시지가 보여요</span>}
            </p>
            <p className="font-hand truncate text-right text-[17px] font-bold opacity-80">
              — {name.trim() || DEFAULT_AUTHOR}
            </p>
          </motion.div>
        </div>
      </form>
    </Modal>
  );
}
