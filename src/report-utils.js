export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }

  return btoa(binary)
}

export function screenshotMimeType(screenshotName) {
  return screenshotName.toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/png'
}

export function replaceScreenshotReferences(reportText, screenshotName, dataUri) {
  const windowsPath = `screenshots\\\\${screenshotName}`
  const windowsRegExp = new RegExp(windowsPath, 'gi')
  reportText = reportText.replace(windowsRegExp, dataUri)

  const unixPath = `screenshots/${screenshotName}`
  const unixRegExp = new RegExp(unixPath, 'gi')
  reportText = reportText.replace(unixRegExp, dataUri)

  return reportText
}
