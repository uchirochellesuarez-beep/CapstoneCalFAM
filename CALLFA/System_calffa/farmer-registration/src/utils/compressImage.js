/**
 * Shrink phone camera photos before upload so Hostinger saves complete in a few seconds.
 */
export function compressImageFile(file, { maxEdge = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      const longest = Math.max(width, height)
      if (longest <= maxEdge && file.size <= 450 * 1024) {
        resolve(file)
        return
      }
      const scale = Math.min(1, maxEdge / longest)
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const base = String(file.name || 'photo').replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}
