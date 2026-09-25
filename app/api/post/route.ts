import { POST_STATUS } from "@/constants/post";
import { getAuthenticatedInsforgeAdminClient } from "@/lib/server/insforge-admin";
import { NextRequest, NextResponse } from "next/server";
import { hasAiAccess } from "@/lib/billing";
import type { InsForgeClient } from "@insforge/sdk";
import { inngest } from "@/inngest/client";


export async function GET(request: NextRequest) {
    try {
        const {insforge, userId} = await getAuthenticatedInsforgeAdminClient()
        if (!userId || !insforge) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get("status")
        const channelIds = searchParams.getAll("channelIds")
        .flatMap((channel) => channel.split(",")).filter(Boolean)
        const groupByDate = searchParams.get("group_by_date") === "true";

        let postQuery = insforge.database
            .from("scheduled_posts")
            .select(
                "id, content, images, video, scheduled_at, status, published_at, published_url, user_channel_id, created_at, updated_at, user_channels(id, handle, profile_image, profile_url, channel_type_id, channel_types(id, type, name, color, character_limit))"
            )
            .eq("user_id", userId)
            .order("scheduled_at", { ascending: false })

        if (status) postQuery = postQuery.eq("status", status)
        if (channelIds.length > 0) postQuery = postQuery.in("user_channel_id", channelIds)
        
        const {data:posts, error} = await postQuery;
        if(error) throw error;

        //console.log("posts:", JSON.stringify(posts, null, 2))


        if(!groupByDate) return NextResponse.json({ posts: posts ?? []})

        // {date: {label:"", posts:[]}}
        const groupMap = new Map<string,{label:string; posts: typeof posts}>();

        (posts ?? []).forEach((post) => {
            const date = new Date(post.scheduled_at);

            const key = [
                date.getFullYear(),
              
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

           if(!groupMap.has(key)) {
            groupMap.set(key, { label: formatDayLabel(date), posts: [] });
           }
           groupMap.get(key)!.posts.push(post);
        });

        console.log("groupMap size:", groupMap.size)

        const groupPosts = Array.from(groupMap.entries()).map(([key, value]) => ({
            key,
            ...value
        }));
        
        return NextResponse.json({ groupPosts })
        
    } catch (error) {
        console.error("Error getting posts:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}


export async function POST(request: NextRequest) {
    try {
        const { userId, insforge } = await getAuthenticatedInsforgeAdminClient()
        if (!userId || !insforge) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const {
            posts,
            scheduledAt,
            status
        } = await request.json()

        if (status !== undefined && status !== POST_STATUS.DRAFT) {
            return NextResponse.json({ error: "Only draft status is allowed" }, { status: 400 })
        }

        if(!Array.isArray(posts) || posts.length === 0) {
            return NextResponse.json({ error: "Posts array is required and cannot be empty" }, { status: 400 })
        }

        const normalizedPosts = posts.filter((post) => !!post).map((post) => ({
            channelTypeId: post.channelTypeId,
            title: typeof post.title === "string" ? post.title.trim() : "",
            description: typeof post.description === "string" ? post.description.trim() : "",
            content: post.content,
            images: post.images || [],
            video: post.video || null,
        }))
        if(normalizedPosts.length === 0) {
            return NextResponse.json({ error: "No valid posts provided" }, { status: 400 })
        }

        const isPaidPlan = await hasAiAccess()
        if(!isPaidPlan){
            const canCreatePost = await checkCreatePostLimit(insforge, userId)
            if (!canCreatePost) {
                return NextResponse.json({ error: "You have reached your post limit, upgrade" }, { status: 403 })
            }
        }
        
        const isDraft = status === POST_STATUS.DRAFT;
        const invalidPost = normalizedPosts.find((post) => {
            const hasPublishableContent = Boolean(post.content?.trim() || post.images.length > 0 || post.video);
            const hasDraftContent = Boolean(hasPublishableContent || post.title || post.description);
            return (!isDraft && !hasPublishableContent) || (isDraft && !hasDraftContent) || (post.images.length > 0 && post.video);
        });
        if (invalidPost) {
            return NextResponse.json({ error: "Each post needs text, media, a title, or a description and can contain either photos or one video." }, { status: 400 })
        }

        const channelTypeIds = [...new Set(normalizedPosts.map((post) => post.channelTypeId))];
        
        const {data: userChannels, error: userChannelsError} = await insforge.database
            .from("user_channels")
            .select("id, channel_type_id, channel_types(type)")
            .eq("user_id", userId)
            .eq("is_active", true)
            .eq("is_connected", true)
            .in("channel_type_id", channelTypeIds)

            if(userChannelsError) {
                return NextResponse.json({ error: "Failed to fetch user channels" }, { status: 500 })
            }

            if(!userChannels || userChannels.length === 0) {
                return NextResponse.json({ error: "No active channels found" }, { status: 404 })
            }
            
            const connectedChannels = new Map(
                userChannels.map((user_channel) => [
                    user_channel.channel_type_id,
                    user_channel.id
                ])
            )

            const missigChannel = channelTypeIds.find(
                (channelTypeId) => !connectedChannels.has(channelTypeId)
            )

            if(missigChannel) {
                return NextResponse.json({ error: "No active channel found for channel type" }, { status: 404 })
            }

            const youtubePhotoPost = !isDraft && normalizedPosts.find((post) => {
                const channel = userChannels.find((item) => item.channel_type_id === post.channelTypeId) as { channel_types?: { type?: string } } | undefined;
                return channel?.channel_types?.type === "YOUTUBE" && post.images.length > 0;
            });
            if (youtubePhotoPost) return NextResponse.json({ error: "YouTube requires video content. Remove YouTube from this photo post." }, { status: 400 });

            const youtubeMetadataPost = !isDraft && normalizedPosts.find((post) => {
                const channel = userChannels.find((item) => item.channel_type_id === post.channelTypeId) as { channel_types?: { type?: string } } | undefined;
                return channel?.channel_types?.type === "YOUTUBE" && (!post.title || !post.description || !post.video);
            });
            if (youtubeMetadataPost) return NextResponse.json({ error: "YouTube posts require a title, description, and video." }, { status: 400 });

            if(!scheduledAt) {
                return NextResponse.json({ error: "Scheduled at is required" }, { status: 400 })
            }

            const postStatus = status === POST_STATUS.DRAFT ? POST_STATUS.DRAFT : POST_STATUS.QUEUE;

            const payload = normalizedPosts.map((post) => ({
                user_id: userId,
                user_channel_id: connectedChannels.get(post.channelTypeId),
                title: post.title,
                description: post.description,
                content: post.content,
                images: post.images,
                video: post.video,
                scheduled_at: scheduledAt,
                status: postStatus
            }))

            // console.log(payload,"payload")

            const {data, error} = await insforge.database
            .from("scheduled_posts")
            .insert(payload)
            .select()

            if(error) {
                console.log(error,"error")
                return NextResponse.json({ error: "Failed to create posts" }, { status: 500 })
            }

            if (postStatus === POST_STATUS.QUEUE) {
                try {
                    await inngest.send((data ?? []).map((post) => ({
                        name: "post/publish.requested",
                        data: { postId: post.id },
                    })));
                } catch (dispatchError) {
                    // The post is durable in the queue and the cron fallback
                    // will retry it. Do not lose a scheduled post because the
                    // background service is briefly unavailable.
                    console.error("Unable to dispatch scheduled posts", dispatchError);
                }
            }

            return NextResponse.json({ posts: data }, { status: 201 })

    } catch (error) {
        console.error("Error creating post:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

async function checkCreatePostLimit(
  insforge: InsForgeClient,
  userId: string,
) {
  const { count, error } = await insforge.database
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) < 4;
}


function formatDayLabel(date:Date){
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if(date.toDateString() === today.toDateString()) {
        return "Today";
    }
    if(date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
    }
    return date.toLocaleDateString();
}
