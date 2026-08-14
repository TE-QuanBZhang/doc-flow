/**
 * Next.js `<Image>` compatibility shim for the Vite build.
 * Ported pages use plain <img> semantics; the `priority` prop is ignored.
 */
export default function Image({
  src,
  alt,
  width,
  height,
  className,
  style,
  priority,
  ...props
}: Record<string, unknown>) {
  return (
    <img
      src={src as string}
      alt={alt as string}
      width={width as number | undefined}
      height={height as number | undefined}
      className={className as string | undefined}
      style={style as React.CSSProperties | undefined}
      {...props}
    />
  );
}
