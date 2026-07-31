import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrayBufferToBase64, screenshotMimeType, replaceScreenshotReferences } from './report-utils.js'

test('arrayBufferToBase64 encodes a small buffer', () => {
  const buffer = new TextEncoder().encode('hello').buffer
  assert.equal(arrayBufferToBase64(buffer), Buffer.from('hello').toString('base64'))
})

test('arrayBufferToBase64 handles buffers larger than one chunk', () => {
  const bytes = new Uint8Array(0x8000 + 10).map((_, i) => i % 256)
  assert.equal(arrayBufferToBase64(bytes.buffer), Buffer.from(bytes).toString('base64'))
})

test('arrayBufferToBase64 handles a buffer exactly one chunk in size', () => {
  const bytes = new Uint8Array(0x8000).map((_, i) => i % 256)
  assert.equal(arrayBufferToBase64(bytes.buffer), Buffer.from(bytes).toString('base64'))
})

test('screenshotMimeType returns image/gif for .gif screenshots', () => {
  assert.equal(screenshotMimeType('failure.gif'), 'image/gif')
  assert.equal(screenshotMimeType('FAILURE.GIF'), 'image/gif')
})

test('screenshotMimeType returns image/png for everything else', () => {
  assert.equal(screenshotMimeType('failure.png'), 'image/png')
  assert.equal(screenshotMimeType('failure.jpg'), 'image/png')
})

test('replaceScreenshotReferences substitutes Unix-style screenshot paths', () => {
  const reportText = '<img src="screenshots/step-1.png">'
  const result = replaceScreenshotReferences(reportText, 'step-1.png', 'data:image/png;base64,AAA')
  assert.equal(result, '<img src="data:image/png;base64,AAA">')
})

test('replaceScreenshotReferences substitutes Windows-style screenshot paths', () => {
  const reportText = '<img src="screenshots\\step-1.png">'
  const result = replaceScreenshotReferences(reportText, 'step-1.png', 'data:image/png;base64,AAA')
  assert.equal(result, '<img src="data:image/png;base64,AAA">')
})

test('replaceScreenshotReferences is case-insensitive and replaces every occurrence', () => {
  const reportText = 'screenshots/Step-1.PNG and screenshots/step-1.png'
  const result = replaceScreenshotReferences(reportText, 'step-1.png', 'DATA_URI')
  assert.equal(result, 'DATA_URI and DATA_URI')
})
