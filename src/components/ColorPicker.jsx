import { motion } from 'framer-motion';
import { NOTE_PALETTE } from '../constants/notePalette';

export default function ColorPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="포스트잇 색상" className="flex items-center gap-3">
      {NOTE_PALETTE.map((c) => {
        const selected = c.bg === value;
        return (
          <motion.button
            key={c.key}
            id={`color-${c.key}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.bg)}
            className={`h-7 w-7 rounded-full border border-black/10 transition-shadow ${
              selected ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-900' : ''
            }`}
            style={{ backgroundColor: c.bg }}
            animate={{ scale: selected ? 1.15 : 1 }}
            whileHover={{ scale: selected ? 1.15 : 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          />
        );
      })}
    </div>
  );
}
