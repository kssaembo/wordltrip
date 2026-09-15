// Decode locally, resize, and re-encode: the original bytes never reach Storage.
export async function compressImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('JPG, PNG, WebP 사진을 선택해 주세요.')
  if (file.size > 30 * 1024 * 1024) throw new Error('30MB 이하 사진을 선택해 주세요.')
  const image = await createImageBitmap(file)
  try {
    let scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('이 브라우저에서는 사진을 처리할 수 없습니다.')
    for (let step = 0; step < 8; step++) {
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('사진 압축에 실패했습니다.'))),
          'image/webp',
          Math.max(0.55, 0.8 - step * 0.04),
        ),
      )
      if (blob.type !== 'image/webp')
        throw new Error('WebP 압축을 지원하는 Chrome에서 시도해 주세요.')
      if (blob.size <= 1024 * 1024) return blob
      scale *= 0.85
    }
    throw new Error('1MB 이하로 줄일 수 없는 사진입니다. 다른 사진을 선택해 주세요.')
  } finally {
    image.close()
  }
}
