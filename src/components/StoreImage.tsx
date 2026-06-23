import type { ImgHTMLAttributes } from 'react';

type StoreImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string;
  mobileSrc?: string;
  desktopSrc?: string;
  desktopMedia?: string;
};

export function StoreImage({
  src,
  mobileSrc,
  desktopSrc,
  desktopMedia = '(min-width: 768px)',
  alt,
  loading,
  decoding,
  fetchPriority,
  draggable,
  ...props
}: StoreImageProps) {
  const resolvedSrc = src || mobileSrc || desktopSrc || '';
  const resolvedLoading = fetchPriority === 'high' ? 'eager' : (loading ?? 'lazy');
  const resolvedDecoding = decoding ?? 'async';
  const resolvedDraggable = draggable ?? false;

  if (desktopSrc || mobileSrc) {
    return (
      <picture>
        {desktopSrc ? <source media={desktopMedia} srcSet={desktopSrc} sizes={props.sizes} /> : null}
        <img
          {...props}
          src={resolvedSrc}
          alt={alt}
          loading={resolvedLoading}
          decoding={resolvedDecoding}
          fetchPriority={fetchPriority}
          draggable={resolvedDraggable}
        />
      </picture>
    );
  }

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      loading={resolvedLoading}
      decoding={resolvedDecoding}
      fetchPriority={fetchPriority}
      draggable={resolvedDraggable}
    />
  );
}
