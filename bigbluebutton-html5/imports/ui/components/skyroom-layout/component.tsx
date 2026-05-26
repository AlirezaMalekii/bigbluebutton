import React from 'react';
import useSkyroomColumnLayout from './hook';

/**
 * Mounts Skyroom single-column layout behaviour (no visible UI).
 * Sets data-skyroom-column on #layout and keeps users + chat stacked in one column.
 */
const SkyroomColumnController: React.FC = () => {
  useSkyroomColumnLayout();
  return null;
};

export default SkyroomColumnController;
