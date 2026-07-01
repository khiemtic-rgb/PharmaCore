import { useEffect, useState, type CSSProperties } from 'react';
import { resolveBrandingLogoUrl } from '@/shared/config/branding-logo';

type BrandingLogoProps = {
  logoUrl: string | null | undefined;
  size?: number;
  style?: CSSProperties;
};

export function BrandingLogo({ logoUrl, size = 40, style }: BrandingLogoProps) {
  const [src, setSrc] = useState(() => resolveBrandingLogoUrl(logoUrl));

  useEffect(() => {
    setSrc(resolveBrandingLogoUrl(logoUrl));
  }, [logoUrl]);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        borderRadius: 10,
        objectFit: 'contain',
        background: 'rgba(255,255,255,0.95)',
        padding: 4,
        flexShrink: 0,
        ...style,
      }}
      onError={() => setSrc('/icon.svg')}
    />
  );
}
