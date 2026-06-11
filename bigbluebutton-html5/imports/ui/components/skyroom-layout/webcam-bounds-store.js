/** Runtime bounds for Skyroom webcam docks (sidebar, stage, center). */
let skyroomWebcamLayout = null;

export const setSkyroomWebcamLayout = (layout) => {
  skyroomWebcamLayout = layout;
};

export const getSkyroomWebcamLayout = () => skyroomWebcamLayout;

export const clearSkyroomWebcamLayout = () => {
  skyroomWebcamLayout = null;
};

export const isSkyroomWebcamLayoutActive = () => Boolean(
  skyroomWebcamLayout?.hasSidebar
  || skyroomWebcamLayout?.stage
  || skyroomWebcamLayout?.center
  || skyroomWebcamLayout?.sidebarDropEnabled
  || skyroomWebcamLayout?.stageStrip,
);
