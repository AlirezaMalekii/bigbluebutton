import React, { useEffect, useRef } from 'react';
import Styled from './styles';
import SKYROOM_POPULAR_EMOJI from './popular-emoji';

interface SkyroomStickerPanelProps {
  onSelect: (native: string) => void;
  onClose: () => void;
  /** Ref to the trigger button so an outside-click on it doesn't re-close. */
  triggerRef?: React.RefObject<HTMLElement>;
}

/**
 * Curated popular-emoji quick-pick shown above the Skyroom chat composer.
 * Picking a cell calls onSelect(native); the caller inserts it as text.
 */
const SkyroomStickerPanel: React.FC<SkyroomStickerPanelProps> = ({
  onSelect,
  onClose,
  triggerRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  return (
    <Styled.Panel ref={panelRef} data-test="skyroomStickerPanel">
      {SKYROOM_POPULAR_EMOJI.map((emoji) => (
        <Styled.StickerCell
          key={emoji}
          type="button"
          aria-label={emoji}
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </Styled.StickerCell>
      ))}
    </Styled.Panel>
  );
};

export default SkyroomStickerPanel;
