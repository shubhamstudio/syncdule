import ChannelsTab from "@/components/settings/channels-tab";
import { PageHeader } from "@/components/workspace-ui";

export default function HandlesPage() {
  return <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
    <PageHeader eyebrow="Social connections" title="Handles" description="Connect the social accounts you publish from, then use them across your content calendar." />
    <div className="mt-6"><ChannelsTab /></div>
  </div>;
}
