import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getSwatch } from '../constants/notePalette';
import { timeAgo } from '../lib/utils';

export default function NoteDetailModal({ note, canDelete, onClose, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [note?.id]);

  const swatch = note ? getSwatch(note.color) : null;

  return (
    <Modal open={!!note} onClose={onClose} labelledBy="detail-author" className="max-w-md !bg-transparent !border-0 !shadow-none !backdrop-blur-none">
      {note && (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative flex aspect-square w-full max-w-sm flex-col rounded-[4px] p-8 pt-10"
            style={{ backgroundColor: swatch.bg, color: swatch.text, boxShadow: 'var(--shadow-note-lift)', rotate: `${note.rotation / 2}deg` }}
          >
            <span className="tape absolute -top-4 left-1/2 h-8 w-28 -translate-x-1/2 rotate-[-2deg]" />
            <p className="font-hand flex-1 overflow-y-auto whitespace-pre-wrap break-words text-[28px] leading-[1.25]">
              {note.content}
            </p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs opacity-60">{timeAgo(note.createdAt)}</span>
              <span id="detail-author" className="font-hand text-2xl font-bold">
                — {note.authorName}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {canDelete &&
              (confirming ? (
                <button type="button" id="detail-delete-confirm" className="btn bg-red-500/90 text-white hover:bg-red-500" onClick={() => onDelete(note.id)}>
                  정말 삭제할게요
                </button>
              ) : (
                <button type="button" id="detail-delete" className="btn-ghost" onClick={() => setConfirming(true)}>
                  🗑️ 삭제
                </button>
              ))}
            <button type="button" id="detail-close" className="btn-ghost" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
