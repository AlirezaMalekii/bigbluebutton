export const SKYROOM_SUSPENDED_CAMERAS_EVENT = 'safemeetSuspendedCamerasChanged';

export type SuspendedCamerasEvent = CustomEvent<{ cameraIds: string[] }>;
