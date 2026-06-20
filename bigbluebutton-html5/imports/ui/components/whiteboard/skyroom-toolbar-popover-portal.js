const SKYROOM_WB_POPOVER_PORTAL_ID = 'skyroom-wb-popover-portal';

export const getSkyroomWbPopoverPortal = () => {
  if (typeof document === 'undefined') return null;

  let portal = document.getElementById(SKYROOM_WB_POPOVER_PORTAL_ID);
  if (!portal) {
    portal = document.createElement('div');
    portal.id = SKYROOM_WB_POPOVER_PORTAL_ID;
    portal.setAttribute('data-skyroom-wb-popover-portal', 'true');
    portal.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:1105',
      'overflow:visible',
    ].join(';');
    document.body.appendChild(portal);
  }
  return portal;
};

export const cleanupSkyroomWbPopoverPortal = () => {
  const portal = document.getElementById(SKYROOM_WB_POPOVER_PORTAL_ID);
  if (portal && portal.childElementCount === 0) {
    portal.remove();
  }
};
