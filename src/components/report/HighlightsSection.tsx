'use client';

interface HighlightsSectionProps {
  highlights: string[];
}

export default function HighlightsSection({ highlights }: HighlightsSectionProps) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-fuchsia-100/70 bg-fuchsia-50/60 p-5 shadow-sm backdrop-blur-sm dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-200">
        今日のハイライト
      </h2>
      <ul className="space-y-2 text-sm text-fuchsia-900 dark:text-fuchsia-100">
        {highlights.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-400 dark:bg-fuchsia-200" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
