export const stampLocalShapeOwnership = (shape, userId, presentationId) => {
  if (!shape || !userId) return shape;

  return {
    ...shape,
    meta: {
      ...shape.meta,
      createdBy: userId,
      presentationId,
    },
  };
};

export const canDeleteWhiteboardShape = ({
  shape,
  source,
  userId,
  isPresenter,
  isModerator,
}) => {
  if (source !== 'user') return true;
  if (isPresenter || isModerator) return true;
  return Boolean(userId && shape?.meta?.createdBy === userId);
};

export default {
  stampLocalShapeOwnership,
  canDeleteWhiteboardShape,
};
