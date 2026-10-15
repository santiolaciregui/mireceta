/** US-012 / T-003, 2026-10-15: Summary polling must preserve attachment details. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeChatMedia } from './chatMedia';
import type { ChatMessage } from '../../../types';

const summary: ChatMessage = { id: 'photo', sender: 'medico', senderName: 'mireceta.online', timestamp: '2026-10-15T12:00:00Z', fileType: 'image' };

test('hydrates matching images without replacing sender masking or summary metadata', () => {
  const result = mergeChatMedia([summary], [{ ...summary, senderName: 'Private Name', fileUrl: 'data:image/jpeg;base64,AA==' }]);
  assert.equal(result[0].fileUrl, 'data:image/jpeg;base64,AA==');
  assert.equal(result[0].senderName, 'mireceta.online');
  assert.equal(summary.fileUrl, undefined);
});

test('keeps cached media across consecutive polls and matches only message IDs', () => {
  const details = [{ ...summary, fileUrl: 'image-url' }];
  const first = mergeChatMedia([summary], details);
  assert.equal(mergeChatMedia([summary], first)[0].fileUrl, 'image-url');
  assert.equal(mergeChatMedia([{ ...summary, id: 'different' }], details)[0].fileUrl, undefined);
});

test('does not resurrect removed messages or replace a newer attachment', () => {
  assert.deepEqual(mergeChatMedia([], [{ ...summary, fileUrl: 'old' }]), []);
  assert.equal(mergeChatMedia([{ ...summary, fileUrl: 'new' }], [{ ...summary, fileUrl: 'old' }])[0].fileUrl, 'new');
});
