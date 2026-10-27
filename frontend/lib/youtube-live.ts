export type LiveBroadcast = {
  id?: string;
  snippet?: { title?: string; channelId?: string };
  status?: { lifeCycleStatus?: string; privacyStatus?: string };
  contentDetails?: { enableEmbed?: boolean };
};

export function findEligibleBroadcast(
  items: LiveBroadcast[] | undefined,
  expectedChannelId: string,
): LiveBroadcast | undefined {
  return items?.find((item) =>
    item.id &&
    item.snippet?.channelId === expectedChannelId &&
    item.status?.lifeCycleStatus === 'live' &&
    item.status?.privacyStatus === 'public' &&
    item.contentDetails?.enableEmbed === true,
  );
}
