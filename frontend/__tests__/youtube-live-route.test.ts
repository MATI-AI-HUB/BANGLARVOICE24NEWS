import { describe, expect, it } from 'vitest';
import { findEligibleBroadcast } from '../lib/youtube-live';

const activePublicBroadcast = {
  id: 'broadcast-1',
  snippet: { title: 'Live news', channelId: 'channel-1' },
  status: { lifeCycleStatus: 'live', privacyStatus: 'public' },
  contentDetails: { enableEmbed: true },
};

describe('YouTube live broadcast selection', () => {
  it('accepts only active, public, embeddable broadcasts for the expected channel', () => {
    expect(findEligibleBroadcast([activePublicBroadcast], 'channel-1')).toEqual(activePublicBroadcast);
    expect(findEligibleBroadcast([activePublicBroadcast], 'other-channel')).toBeUndefined();
  });

  it('rejects private, non-live, and non-embeddable broadcasts', () => {
    expect(findEligibleBroadcast([
      { ...activePublicBroadcast, status: { ...activePublicBroadcast.status, privacyStatus: 'private' } },
    ], 'channel-1')).toBeUndefined();
    expect(findEligibleBroadcast([
      { ...activePublicBroadcast, status: { ...activePublicBroadcast.status, lifeCycleStatus: 'complete' } },
    ], 'channel-1')).toBeUndefined();
    expect(findEligibleBroadcast([
      { ...activePublicBroadcast, contentDetails: { enableEmbed: false } },
    ], 'channel-1')).toBeUndefined();
  });
});
