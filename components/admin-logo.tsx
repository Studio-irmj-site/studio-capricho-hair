export function AdminLogo({ compact = false }: { compact?: boolean }) {
  return (
    // Use the original client-site asset, without cropping the lettering.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`admin-brand-logo${compact ? " admin-brand-logo-compact" : ""}`}
      src="/studio-capricho-client-logo.jpeg"
      alt="Studio Capricho Hair"
      width={compact ? 56 : 260}
      height={compact ? 56 : 260}
    />
  );
}
