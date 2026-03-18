import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionData } from "./getSessionData";
import SuccessDisplay from "./SuccessDisplay";
import SuccessSkeleton from "./SuccessSkeleton";

async function SuccessContent({ sessionId }: { sessionId: string }) {
  const data = await getSessionData(sessionId);
  if (!data) redirect("/donate");

  return (
    <SuccessDisplay
      donorName={data.donorName}
      bibleCount={data.bibleCount}
      sessionId={sessionId}
    />
  );
}

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) redirect("/donate");

  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessContent sessionId={sessionId} />
    </Suspense>
  );
}
