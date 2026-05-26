/** Runtime bounds for Skyroom split webcam docks (sidebar + stage). */
let skyroomWebcamLayout = null;

export const setSkyroomWebcamLayout = (layout) => {
  skyroomWebcamLayout = layout;
};

export const getSkyroomWebcamLayout = () => skyroomWebcamLayout;

export const clearSkyroomWebcamLayout = () => {
  skyroomWebcamLayout = null;
};
