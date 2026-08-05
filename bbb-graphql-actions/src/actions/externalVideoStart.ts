import { RedisMessage } from '../types';
import { throwErrorIfInvalidInput, throwErrorIfNotPresenter } from '../imports/validation';
import { ValidationError } from '../types/ValidationError';
import { extractAparatHash, resolveAparatPlaybackUrl } from '../imports/aparatResolve';

export default async function buildRedisMessage(
  sessionVariables: Record<string, unknown>,
  input: Record<string, unknown>,
): Promise<RedisMessage> {
  throwErrorIfNotPresenter(sessionVariables);
  throwErrorIfInvalidInput(input, [
    { name: 'externalVideoUrl', type: 'string', required: true },
  ]);

  const eventName = 'StartExternalVideoPubMsg';

  const routing = {
    meetingId: sessionVariables['x-hasura-meetingid'] as String,
    userId: sessionVariables['x-hasura-userid'] as String,
  };

  const header = {
    name: eventName,
    meetingId: routing.meetingId,
    userId: routing.userId,
  };

  let externalVideoUrl = String(input.externalVideoUrl || '');
  // Keep the property present for Akka's strict creator-property deserializer.
  let externalVideoSourceUrl = '';

  // Aparat iframe cannot be synced — resolve to CDN MP4 for BBB external-video sync.
  const aparatHash = extractAparatHash(externalVideoUrl);
  if (aparatHash) {
    try {
      externalVideoSourceUrl = `https://www.aparat.com/v/${encodeURIComponent(aparatHash)}`;
      externalVideoUrl = await resolveAparatPlaybackUrl(externalVideoUrl);
      console.info(`[externalVideoStart] Resolved Aparat embed to MP4 (${externalVideoUrl.length} chars)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[externalVideoStart] Aparat resolve failed: ${message}`);
      throw new ValidationError(
        'Could not resolve Aparat video for synchronized playback. Check the embed code and try again.',
        400,
      );
    }
  }

  const body = {
    externalVideoUrl,
    externalVideoSourceUrl,
  };

  return { eventName, routing, header, body };
}
