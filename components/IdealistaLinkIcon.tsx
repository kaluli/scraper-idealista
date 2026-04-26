import type { CSSProperties } from 'react'

type IdealistaLinkIconProps = {
  href: string
  className?: string
  /** Clases del texto del enlace (históricamente se usaba para la imagen). */
  imgClassName?: string
  title?: string
  style?: CSSProperties
}

export function IdealistaLinkIcon({
  href,
  className,
  imgClassName,
  title = 'Ver en Idealista',
  style,
}: IdealistaLinkIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      aria-label={title}
      style={style}
    >
      <span className={imgClassName}>Ver</span>
    </a>
  )
}
