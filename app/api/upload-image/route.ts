import { getInsforgeUploadClient } from "@/lib/insforge-server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024;

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const insforge = getInsforgeUploadClient();
        const formData = await request.formData();
        const uploadedFile = formData.get("file");

        // `instanceof File` is unreliable across the request/runtime boundary.
        // Check the File capabilities instead so multipart uploads work in both
        // local development and Vercel's Node runtime.
        if (!uploadedFile || typeof uploadedFile === "string" || typeof uploadedFile.arrayBuffer !== "function") {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        const file = uploadedFile as File;
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
        if (!kind) {
            return NextResponse.json({ error: "Upload an image or video file" }, { status: 400 });
        }
        if (kind === "video" && file.size > MAX_VIDEO_SIZE_BYTES) return NextResponse.json({ error: "Videos must be 250 MB or smaller" }, { status: 413 });

        const key = `${kind === "video" ? "videos" : "images"}/${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const storageBucket = process.env.INSFORGE_STORAGE_BUCKET || "sociostack";
        const { data, error } = await insforge.storage
            .from(storageBucket)
            .upload(key, file);

        if (error) {
            console.error("Storage image upload failed", {
                bucket: storageBucket,
                key,
                message: error.message,
            });
            return NextResponse.json(
                { error: error.message || `Unable to upload to the ${storageBucket} storage bucket.` },
                { status: 500 },
            );
        }

        return NextResponse.json({
            [kind]: {
                key: data?.key,
                url: data?.url,
                ...(kind === "video" ? { mimeType: file.type } : {}),
            },
        });

    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
