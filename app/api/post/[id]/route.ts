import { POST_STATUS } from "@/constants/post";
import { getAuthenticatedInsforgeAdminClient } from "@/lib/server/insforge-admin";
import { NextRequest, NextResponse } from "next/server";



export async function PATCH(request:NextRequest,
    {params}: {params:Promise<{id:string}>}
){
    try {
        const { id } = await params;
        const { insforge, userId } = await getAuthenticatedInsforgeAdminClient();
        if (!userId || !insforge) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const {
            title,
            description,
            content,
            images,
            video,
            scheduledAt,
            status
        } = await request.json();

        const updateData:any = {};
        if (typeof title === "string") updateData.title = title.trim();
        if (typeof description === "string") updateData.description = description.trim();
        if (content) updateData.content = content;
        if (Array.isArray(images)) updateData.images = images;
        if (video !== undefined) updateData.video = video;
        if (Array.isArray(images) && images.length > 0 && video) return NextResponse.json({ error: "A post can contain photos or one video, not both" }, { status: 400 });
        if (scheduledAt) updateData.scheduled_at = scheduledAt;
        const postStatus = status === POST_STATUS.DRAFT ? POST_STATUS.DRAFT : POST_STATUS.QUEUE;
        updateData.status = postStatus;

        const {data,error} = await insforge.database
        .from("scheduled_posts")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()
        
        if (error) {
            console.error("Error updating post:", error);
            return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
        }
        
        return NextResponse.json({ post:data});
    } catch (error) {
        console.error("Error updating post:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
