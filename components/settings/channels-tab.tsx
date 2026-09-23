
"use client"
import { Suspense, useEffect } from 'react'
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChannelType } from '@/types/channel.type';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { getChannelIcon } from '@/constants/channels';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';

function ChannelTabContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const queryClient = useQueryClient()
    const connected = searchParams.get("connected")
    const error = searchParams.get("error")
    const channelType = searchParams.get("channelType")

    const { data: channelsData, isPending, isError } = useQuery({
        queryKey: ["channels"],
        queryFn: async () => {
            const res = await fetch("/api/channel");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load channel integrations")
            return data
        },
        staleTime: 30_000,
    })
    const channels = (channelsData?.channels || []) as ChannelType[]

    useEffect(() => {
        if (!connected && !error) return
        queryClient.invalidateQueries({ queryKey: ["channels"] })
        if (connected) {
            toast.success(`Successfully connected to ${channelType}`)
        }
        if (error) {
            toast.error(`Failed to connect to ${channelType ?? "channel"}. Please try again.`)
        }
        // Consume callback parameters after one notification. Keeping them in
        // the URL re-ran this effect and repeatedly refetched slow channel data.
        router.replace(pathname, { scroll: false })
    }, [channelType, connected, error, pathname, queryClient, router])

    const connectMutation = useMutation({
        mutationFn: async ({ channelTypeId, redirectTo }: { channelTypeId: string; redirectTo: string }) => {
            const res = await fetch("/api/channel/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelTypeId, redirectTo }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to start connection")
            return data
        },
        onSuccess: ({ url }) => {
            window.location.href = url
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to start connection")
        },
    })

    const disconnectMutation = useMutation({
        mutationFn: async (userChannelId: string) => {
            const res = await fetch("/api/channel/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userChannelId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to start connection")
            return data
        },
        onSuccess: () => {
            toast.success("Channel disconnected successfully")
            queryClient.invalidateQueries({ queryKey: ["channels"] })
        },
        onError: (error: Error) => {
            console.error("Disconnect error:", error)
            toast.error("Failed to disconnect channel")
        },
    })

    const handleConnect = (channelTypeId: string) => {
        if (!channelTypeId) return
        if (connectMutation.isPending) return
        connectMutation.mutate({ channelTypeId, redirectTo: pathname })
    }
    const handleDisconnect = (userChannelId: string) => {
        if (!userChannelId) return
        if (disconnectMutation.isPending) return
        disconnectMutation.mutate(userChannelId)
    }
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Social handles</CardTitle>
                <CardDescription>
                    Connect a social account here before scheduling posts to it.
                </CardDescription>
                  </div>
                  {!isPending && (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {channelsData?.connectedCount ?? 0} of {channelsData?.totalChannels ?? 0} connected
                    </span>
                  )}
                </div>
            </CardHeader>

            <CardContent>
                <div className='space-y-3'>
                    {isPending ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className='flex items-center justify-between rounded-xl border p-4'>
                                <div className='flex items-center gap-3'>
                                    <Skeleton className='size-6 rounded-sm bg-secondary' />
                                    <Skeleton className='h-5 w-24 bg-secondary' />
                                </div>
                                <Skeleton className='h-8 w-20 bg-secondary' />
                            </div>
                        ))
                    ) : isError ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        We could not load your social handles. Refresh the page and try again.
                      </div>
                    ) : channels.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                        No social handles are available yet. Add the seeded providers in the database first.
                      </div>
                    ) : (
                        channels?.map((channel) => {
                            const icon = getChannelIcon(channel.type)
                            return (
                                <div key={channel.id}
                                    className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.015] p-4 transition-colors hover:border-primary/40'
                                >
                                    <div className='flex items-center gap-3'>
                                        <span className='relative'>
                                            {icon ? (
                                                <HugeiconsIcon icon={icon}
                                                    color='currentColor'
                                                    className=" text-white! size-6! p-1 rounded-sm"
                                                    style={{ background: channel.color }}
                                                />
                                            ) : null}

                                            <div className={cn(`absolute -right-1 bottom-0 p-0.5 bg-white dark:bg-background rounded-xs
                                           `,
                                                {
                                                    "bg-transparent p-0 rounded-full -bottom-1 -right-0.5": channel.connected
                                                }
                                            )}>
                                                {channel.connected ? (
                                                    <div className='size-2.5 bg-primary rounded-full' />
                                                ) : (
                                                    <HugeiconsIcon icon={PlusSignIcon} className="size-2!" />
                                                )}
                                            </div>
                                        </span>

                                        <div>
                                          <span className='font-medium'>{channel.name}</span>
                                          {channel.connected && channel.handle && (
                                            <p className='text-xs text-muted-foreground'>Connected as {channel.handle}</p>
                                          )}
                                        </div>
                                    </div>

          <Button className="h-9 w-[172px] justify-center max-[420px]:w-[146px]" variant={channel.connected ? "destructive" : "default"} size="sm"
                                        disabled={connectMutation.isPending || disconnectMutation.isPending}
                                        onClick={() => channel.connected ? handleDisconnect(channel.user_channel_id!) : handleConnect(channel.id!)}
                                        aria-label={`${channel.connected ? "Disconnect" : "Connect"} ${channel.name}`}
                                    >
                                        {(connectMutation.isPending && connectMutation.variables?.channelTypeId === channel.id ||
                                          disconnectMutation.isPending && disconnectMutation.variables === channel.user_channel_id) && (
                                            <Spinner className='size-4' />
                                        )}
                                        {channel.connected ? "Disconnect" : `Connect ${channel.name}`}
                                    </Button>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}






const ChannelsTab = () => {
    return (
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading handles...</div>}>
            <ChannelTabContent />
        </Suspense>
    )
}

export default ChannelsTab;
