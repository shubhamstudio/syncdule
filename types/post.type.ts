import { ChannelType } from "./channel.type";

export type ImageObject = {
  url: string;
  key: string;
}

export type VideoObject = {
  url: string;
  key: string;
  mimeType?: string;
}


export type PostType = {
    id: string
    title?: string
    description?: string
    content: string
    images?: ImageObject[]
    video?: VideoObject | null
    scheduled_at: string
    status: string
    published_url?: string | null
    user_channel_id?: string | null
    user_channels?: {
        id: string;
        handle?: string | null
        profile_image?: string | null
        profile_url?: string | null
        channel_type_id?: string
        provider_account_id?: string | null
        access_token?: string | null
        refresh_token?: string | null
        token_expires_at?: string | null
        channel_types?: ChannelType
    },
    created_at: string;
    updated_at: string;
}


export type CalendarPostType = {
  id: string
  content: string
  images: ImageObject[]
  scheduledAt: Date
  status: "queue" | "draft" | "published"
  user_channel_id: string
  channel_types: ChannelType
}
