import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of the conversation being waited for.
 *
 * A real exchange alternates: a short question from the user, a longer reply
 * from the assistant. Mirroring that rhythm — rather than showing a uniform
 * stack of bars — means the placeholder reads as a conversation from the first
 * frame, and the messages that replace it land on the same silhouette.
 *
 * Enough turns to fill the screen: a transcript that stops halfway down looks
 * like a conversation that failed to load rather than one still arriving.
 * Widths are per-line so no two lines end together, which is what stops the
 * block from looking like a table, and each reply's last line is shortest, the
 * way a paragraph ends mid-column.
 */
const EXCHANGES = [
  { ask: "46%", reply: ["97%", "89%", "94%", "58%"] },
  { ask: "63%", reply: ["92%", "96%", "71%"] },
  { ask: "34%", reply: ["95%", "87%", "93%", "46%"] },
  { ask: "55%", reply: ["90%", "63%"] },
];

/**
 * Height of one line of placeholder text.
 *
 * Assistant replies are 16px type on 26px leading, so each line occupies 26px.
 * The bar itself is shorter than that and the remainder is left as gap, which
 * is what a line of text actually looks like: ink over blank space.
 */
const LINE_CLASS = "h-4 rounded-[5px]";

/** One turn from the user: a short bubble, aligned right. */
function AskSkeleton({ width }: { width: string }) {
  return (
    <div className="flex justify-end">
      {/* Matches UserMessage exactly: a 20px radius tightened to 8px at the
          corner nearest its owner, and the height a single line of body text
          occupies inside that bubble's padding — a 26px line box plus 24px of
          vertical padding. */}
      <Skeleton
        className="h-[50px] rounded-[20px] rounded-br-lg"
        style={{ width }}
      />
    </div>
  );
}

/** One reply from the assistant: plain lines across the canvas, no bubble. */
function ReplySkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-[10px]">
      {/* 16px bar + 10px gap = the 26px line box of a real reply. */}
      {widths.map((width, index) => (
        <Skeleton key={index} className={LINE_CLASS} style={{ width }} />
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
          // eye starts, and the lower turns are further from arriving. Eased
          // rather than stepped evenly, so the last turn is faint instead of
          // half-visible and the column has no hard end.
          <div
            key={index}
            className="flex flex-col gap-7"
            style={{ opacity: 1 - (index / EXCHANGES.length) ** 1.5 * 0.82 }}
          >
            <AskSkeleton width={exchange.ask} />
            <ReplySkeleton widths={exchange.reply} />
          </div>
        ))}
      </div>
    </div>
  );
}
