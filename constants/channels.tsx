import { InstagramIcon, FacebookIcon, YoutubeIcon, LinkedinIcon } from '@hugeicons/core-free-icons'

export enum ChannelTypeEnum {
  INSTAGRAM = "INSTAGRAM",
  FACEBOOK = "FACEBOOK",
  LINKEDIN = "LINKEDIN",
  YOUTUBE = "YOUTUBE"
}

export const SUPPORTED_CHANNEL_TYPES = Object.values(ChannelTypeEnum)

export const CHANNEL_TYPE_ICONS: Record<ChannelTypeEnum, any> = {
  [ChannelTypeEnum.LINKEDIN]: LinkedinIcon,
  [ChannelTypeEnum.INSTAGRAM]: InstagramIcon,
  [ChannelTypeEnum.FACEBOOK]: FacebookIcon,
  [ChannelTypeEnum.YOUTUBE]: YoutubeIcon,
}

export const CHANNEL_TYPE_URLS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.LINKEDIN]: "https://linkedin.com",
  [ChannelTypeEnum.INSTAGRAM]: "https://instagram.com",
  [ChannelTypeEnum.FACEBOOK]: "https://facebook.com",
  [ChannelTypeEnum.YOUTUBE]: "https://youtube.com",
}


export function getChannelUrl(type: ChannelTypeEnum | undefined) {
  if (!type) return ""
  return CHANNEL_TYPE_URLS[type]
}


export function getChannelIcon(type: ChannelTypeEnum | undefined) {
  if (!type) return null
  return CHANNEL_TYPE_ICONS[type]
}
