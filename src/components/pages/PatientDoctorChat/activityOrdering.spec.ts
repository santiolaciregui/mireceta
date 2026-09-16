/**
 * File: activityOrdering.spec.ts
 * Task: US-006 / T-004
 * Date: 2026-09-16
 * Decisions: Cover the regression where a newer request without messages was placed below older chats.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareActivityTimestampsDesc,
  getActivityTime,
  getLatestActivityTimestamp,
} from '../../../utils/activityOrdering';

describe('conversation activity ordering', () => {
  it('selects a newer request timestamp over an older message timestamp', () => {
    const activity = getLatestActivityTimestamp(
      '2026-09-11T18:21:00.000Z',
      '2026-09-16T16:04:00.000Z'
    );

    assert.equal(activity, '2026-09-16T16:04:00.000Z');
  });

  it('sorts a recent item without messages before an older item with messages', () => {
    const timestamps = [
      '2026-09-11T18:21:00.000Z',
      '2026-09-16T16:04:00.000Z',
    ];

    timestamps.sort(compareActivityTimestampsDesc);

    assert.deepEqual(timestamps, [
      '2026-09-16T16:04:00.000Z',
      '2026-09-11T18:21:00.000Z',
    ]);
  });

  it('treats missing and invalid dates as no activity', () => {
    assert.equal(getActivityTime(undefined), 0);
    assert.equal(getActivityTime('not-a-date'), 0);
    assert.equal(getLatestActivityTimestamp('', 'not-a-date', null), '');
    assert.equal(compareActivityTimestampsDesc('not-a-date', undefined), 0);
  });
});
