'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>A little tangle in the trail.</h1>
      <p>Your progress is safe. Let’s find our way back.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
      <a href="/">Return home</a>
    </main>
  );
}
