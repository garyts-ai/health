"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="district-error-state district-error-state--route" role="alert">
    <strong>HealthMaxer could not load this page.</strong>
    <p>Your saved data is unchanged. Try the page again or return to Today.</p>
    <div>
      <button type="button" onClick={() => reset()}>Try again</button>
      <a href="#today">Return to Today</a>
    </div>
  </main>;
}
