export interface PhotoExif {
  camera?: string
  lens?: string
  aperture?: string
  shutter?: string
  iso?: number
  focalLength?: string
}

export interface Photo {
  id: string
  filename: string
  src: string
  title?: string
  description?: string
  dateTaken: string
  year: number
  month: number
  exif: PhotoExif
  width?: number
  height?: number
}
