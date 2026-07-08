type AppBrandLogoProps = {
  height?: number;
  maxWidth?: number;
  className?: string;
};

export function AppBrandLogo({ height = 44, maxWidth = 180, className }: AppBrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Novixa"
      className={className}
      height={height}
      style={{ maxWidth, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}
