'use client';

export function Analytics() {
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      {/* Add your analytics script here */}
      {/* Example: Google Analytics, Plausible, etc. */}
    </>
  );
}