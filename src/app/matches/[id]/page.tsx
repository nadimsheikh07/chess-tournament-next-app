import { Suspense } from "react";
import MatchRoom from "@/components/matches/MatchRoom";

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <output
          aria-label="Loading match"
          style={{ display: "grid", minHeight: "60vh", placeItems: "center" }}
        >
          Loading match…
        </output>
      }
    >
      {params.then(({ id }) => (
        <MatchRoom matchId={id} />
      ))}
    </Suspense>
  );
}
