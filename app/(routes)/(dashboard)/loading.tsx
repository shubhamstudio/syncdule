import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6"><div className="flex flex-col gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-full max-w-lg" /></div><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div><Skeleton className="min-h-80 flex-1 rounded-xl" /></div>;
}
