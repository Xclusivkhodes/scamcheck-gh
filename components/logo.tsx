export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 4.5 8 10.2v12.4c0 9.2 6.4 16.8 16 20.9 9.6-4.1 16-11.7 16-20.9V10.2L24 4.5Z"
        fill="currentColor"
      />
      <path
        d="M24 13.2 15.8 16v7.2c0 5.2 3.4 9.4 8.2 11.7 4.8-2.3 8.2-6.5 8.2-11.7V16L24 13.2Z"
        fill="var(--sc-gold)"
      />
      <circle cx="24" cy="22.5" r="2.4" fill="var(--sc-ink)" />
    </svg>
  );
}
