'use client';

interface HighlightsSectionProps {
  highlights: string[];
}

export default function HighlightsSection({ highlights }: HighlightsSectionProps) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">今日のハイライト</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
        {highlights.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
