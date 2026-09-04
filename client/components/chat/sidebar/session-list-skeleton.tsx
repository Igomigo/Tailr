import { Skeleton } from "@/components/ui/skeleton";

/**
 * Widths as a fraction of the row, so the placeholders read as conversation
 * titles of differing lengths rather than a chart. Irregular on purpose: a
 * column of identical bars looks like a component that failed to load.
 */
const ROW_WIDTHS = ["72%", "54%", "83%", "61%", "76%", "48%"];

/**
 * Stands in for the conversation list while it loads.
 *
 * Matches SessionItem's row height and padding so the real titles land exactly
 * where the placeholders were. The "Recent" heading is rendered for real: it is
 * a fixed label that does not depend on the response, and holding it back would
 * shift the list down when it appears.
 */
export function SessionListSkeleton() {
  return (
    <>
      <p className="px-3 pb-1.5 pt-4 text-micro uppercase tracking-[0.12em] text-ink-faint">
        Recent
      </p>
      <ul className="flex flex-col gap-0.5">
        {ROW_WIDTHS.map((width, index) => (
          <li key={index} className="py-2 pl-3 pr-9">
            {/* Fades further down the list, so the eye rests at the top where
                the first real title will appear. */}
            <Skeleton
              className="h-3.5 rounded-[4px]"
              style={{ width, opacity: 1 - index * 0.13 }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
