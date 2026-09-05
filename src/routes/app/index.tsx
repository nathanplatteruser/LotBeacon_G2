import { createFileRoute } from "@tanstack/react-router";
import { InboxWorkspace } from "@/components/inbox-workspace";

export const Route = createFileRoute("/app/")({
  component: QueuePage,
});

function QueuePage() {
  return <InboxWorkspace queueMode />;
}
