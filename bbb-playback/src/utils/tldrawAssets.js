import { setDefaultEditorAssetUrls } from '@bigbluebutton/tldraw';

const fontBase = `${process.env.PUBLIC_URL || ''}/assets/fonts`;

export const localTldrawAssetUrls = {
  fonts: {
    draw: `${fontBase}/Shantell_Sans-Normal-SemiBold.woff2`,
    serif: `${fontBase}/IBMPlexSerif-Medium.woff2`,
    sansSerif: `${fontBase}/IBMPlexSans-Medium.woff2`,
    monospace: `${fontBase}/IBMPlexMono-Medium.woff2`,
  },
};

let assetsConfigured = false;

export const configureLocalTldrawAssets = () => {
  if (assetsConfigured) return;

  setDefaultEditorAssetUrls(localTldrawAssetUrls);
  assetsConfigured = true;
};

export const preloadTldrawAssets = async () => {
  configureLocalTldrawAssets();

  const checks = Object.values(localTldrawAssetUrls.fonts).map(async (url) => {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Failed to preload ${url}`);
    }
  });

  await Promise.all(checks);
};

export default configureLocalTldrawAssets;
