import { getAuthenticatedInsforgeAdminClient } from "@/lib/server/insforge-admin";
import { NextRequest, NextResponse } from "next/server";
import { SUPPORTED_CHANNEL_TYPES } from "@/constants/channels";

export async function GET(request: NextRequest) {

    try {
        const {insforge, userId} = await getAuthenticatedInsforgeAdminClient()
        if(!userId || !insforge) return new NextResponse('Unauthorized', { status: 401 })

        const filter = request.nextUrl.searchParams.get('filter')

        // The schedule toolbar only needs connected accounts. Fetching the lookup table
        // and every user-channel record first made its initial render do twice the work.
        if (filter === "connected") {
            const { data: connectedUserChannels, error } = await insforge.database
                .from("user_channels")
                .select(
                    "id, handle, profile_image, profile_url, is_connected, channel_types(id, type, name, color, character_limit)",
                )
                .eq("user_id", userId)
                .eq("is_connected", true);

            if (error) {
                return new NextResponse("Internal Server Error", { status: 500 });
            }

            const channels = (connectedUserChannels ?? []).flatMap((userChannel) => {
                const channelType = Array.isArray(userChannel.channel_types)
                    ? userChannel.channel_types[0]
                    : userChannel.channel_types;

                if (!channelType) {
                    return [];
                }

                return [{
                    id: channelType.id,
                    type: channelType.type,
                    name: channelType.name,
                    color: channelType.color,
                    character_limit: channelType.character_limit,
                    user_channel_id: userChannel.id,
                    handle: userChannel.handle,
                    profile_image: userChannel.profile_image,
                    profile_url: userChannel.profile_url,
                    connected: true,
                }];
            });

            return NextResponse.json({
                channels,
                totalChannels: SUPPORTED_CHANNEL_TYPES.length,
                connectedCount: channels.length,
            });
        }

        const [typesRes, userChannelsRes] = await Promise.all([
            insforge.database.from("channel_types")
            .select("id, type, name, color, character_limit")
            .in("type", SUPPORTED_CHANNEL_TYPES)
            .order("created_at", { ascending: true }),
            insforge.database.from("user_channels")
            .select("id, channel_type_id, handle, profile_image, profile_url, is_connected")
            .eq("user_id", userId)
        ]);

        if (typesRes.error || userChannelsRes.error) {
            return new NextResponse('Internal Server Error', { status: 500 })
        }

        const userChannelMap = new Map(
            userChannelsRes.data.map(channel => 
                [
                    channel.channel_type_id, 
                    channel
                ]
            )
        )

        let channels = (typesRes.data || []).map(channel_type => {
            const userChannel = userChannelMap.get(channel_type.id)
            return {
              id: channel_type.id,
              type: channel_type.type,
              name: channel_type.name,
              color: channel_type.color,
              character_limit: channel_type.character_limit,
              user_channel_id: userChannel?.id ?? null,
              handle: userChannel?.handle ?? null,
              profile_image: userChannel?.profile_image ?? null,
              profile_url: userChannel?.profile_url ?? null,
              connected: userChannel?.is_connected ?? false
            }
        })

        const totalChannels = typesRes.data?.length || 0;
        const connectedCount = channels.filter(channel => channel.connected).length;

        if(filter === 'unconnected') {
            channels = channels.filter(channel => !channel.connected);
        }

        return NextResponse.json({
            channels,
            totalChannels,
            connectedCount
        })
        
    } catch (error) {
        console.error('Error fetching channels:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
