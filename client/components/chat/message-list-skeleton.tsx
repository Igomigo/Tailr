import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of the conversation being waited for.
 *
 * A real exchange alternates: a short question from the user, a longer reply
 * from the assistant. Mirroring that rhythm — rather than showing a uniform
 * stack of bars — means the placeholder reads as a conversation from the first
 * frame, and the messages that replace it land on the same silhouette.
 *
 * Widths are per-line so no two lines end together, which is what stops the
 * block from looking like a table. The last line of each reply is shortest,
 * the way a paragraph ends mid-column.
 */
const EXCHANGES = [
  { ask: "52%", reply: ["96%", "88%", "64%"] },
  { ask: "38%", reply: ["92%", "97%", "71%"] },
];

/** One turn from the user: a short bubble, aligned right. */
function AskSkeleton({ width }: { width: string }) {
  return (
    <div className="flex justify-end">
      {/* Matches UserMessage's bubble: 20px radius, tightened at the corner
          nearest its owner, and the same 44px height a single line occupies. */}
      <Skeleton
        className="h-11 rounded-[20px] rounded-br-lg"
        style={{ width }}
      />
    </div>
  );
}

/** One reply from the assistant: plain lines across the canvas, no bubble. */
function ReplySkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {widths.map((width, index) => (
        <Skeleton key={index} className="h-3.5 rounded-[4px]" style={{ width }} />
      ))}
    </div>
  );
}

/**
 * Stands in for the transcript while a conversation loads.
 *
 * Only shown on a cold load — opening a chat by link or refreshing the page.
 * Clicking through from the sidebar renders the real messages immediately, so
 * there is nothing to stand in for.
 */
export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-hidden>
      {/* Same container as MessageList, so the real messages replace these in
          place instead of shifting when they arrive. */}
      <div className="skeleton-group mx-auto flex w-full max-w-[46rem] flex-col gap-7 px-5 pb-10 pt-8 sm:px-6">
        {EXCHANGES.map((exchange, index) => (
          // Fades down the column: the top of the conversation is where the
          // eye starts, and the lower turns are further from arriving.
          <div
            key={index}
            className="flex flex-col gap-7"
            style={{ opacity: 1 - index * 0.35 }}
          >
            <AskSkeleton width={exchange.ask} />
            <ReplySkeleton widths={exchange.reply} />
          </div>
        ))}
      </div>
    </div>
  );
}
