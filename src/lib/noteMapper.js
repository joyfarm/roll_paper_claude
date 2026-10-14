const hashRotation = (id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.round(((Math.abs(h) % 61) / 10 - 3) * 10) / 10; // -3.0 ~ 3.0
};

/** DB 행(snake_case) → 프런트 객체(camelCase). 권한 필드는 decorateNote 에서 계산 */
export const toNote = (row, status = 'synced') => ({
  id: row.id,
  boardId: row.board_id,
  authorId: row.author_id,
  authorName: row.author_name,
  content: row.content,
  color: row.color,
  position: { x: row.position_x, y: row.position_y },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  rotation: hashRotation(row.id),
  status,
});

/** 현재 사용자 기준 UI 전용 필드 추가 */
export const decorateNote = (note, currentUserId, boardOwnerId) => {
  const isMine = !!currentUserId && note.authorId === currentUserId;
  return {
    ...note,
    isMine,
    canDrag: isMine || (!!currentUserId && currentUserId === boardOwnerId),
  };
};
