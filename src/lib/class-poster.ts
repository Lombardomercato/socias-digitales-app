import 'server-only'
import { createHash } from 'node:crypto'

export const MAX_MINIATURA_BYTES = 20_000
export function revisionMiniatura(videoKey: string) {
  return createHash('sha256').update(videoKey).digest('hex').slice(0, 24)
}
export function claveMiniatura(id: string, videoKey: string) {
  return `miniaturas/${id}/${revisionMiniatura(videoKey)}.jpg`
}
export function esJpegMiniatura(bytes: Uint8Array) {
  return bytes.length >= 16 && bytes.length <= MAX_MINIATURA_BYTES && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
}
