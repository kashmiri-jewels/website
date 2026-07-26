import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const sourceIconPath = path.join(publicDir, 'assets/brand/kashmiri-jewels-icon.png')

type IcoImage = {
  size: number
  data: Buffer
}

function createIco(images: IcoImage[]) {
  const headerSize = 6
  const directorySize = images.length * 16
  let imageOffset = headerSize + directorySize
  const fileSize =
    imageOffset + images.reduce((total, image) => total + image.data.length, 0)
  const buffer = Buffer.alloc(fileSize)

  buffer.writeUInt16LE(0, 0)
  buffer.writeUInt16LE(1, 2)
  buffer.writeUInt16LE(images.length, 4)

  images.forEach((image, index) => {
    const entryOffset = headerSize + index * 16
    buffer.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset)
    buffer.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset + 1)
    buffer.writeUInt8(0, entryOffset + 2)
    buffer.writeUInt8(0, entryOffset + 3)
    buffer.writeUInt16LE(1, entryOffset + 4)
    buffer.writeUInt16LE(32, entryOffset + 6)
    buffer.writeUInt32LE(image.data.length, entryOffset + 8)
    buffer.writeUInt32LE(imageOffset, entryOffset + 12)
    image.data.copy(buffer, imageOffset)
    imageOffset += image.data.length
  })

  return buffer
}

async function renderPng(
  sourceIcon: Buffer,
  size: number,
  options: { background?: string } = {},
) {
  const image = sharp(sourceIcon).resize(size, size)

  if (options.background) {
    image.flatten({ background: options.background })
  }

  return image.png().toBuffer()
}

const sourceIcon = await readFile(sourceIconPath)

const pngTargets = [
  { file: 'icon-32.png', size: 32 },
  { file: 'icon-192.png', size: 192, background: '#1C2E4A' },
  { file: 'icon-512.png', size: 512, background: '#1C2E4A' },
  { file: 'apple-touch-icon.png', size: 180, background: '#1C2E4A' },
]

await Promise.all(
  pngTargets.map(async ({ file, size, background }) => {
    const image = await renderPng(sourceIcon, size, { background })
    await writeFile(path.join(publicDir, file), image)
  }),
)

const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    data: await renderPng(sourceIcon, size),
  })),
)

await writeFile(path.join(publicDir, 'favicon.ico'), createIco(icoImages))
