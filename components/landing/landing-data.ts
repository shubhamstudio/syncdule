import { BrainCircuit, CalendarDays, LayoutDashboard, Layers2, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { ChannelTypeEnum } from "@/constants/channels";
import { APP_NAME } from "@/constants/app";

export const landingNavigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Channels", href: "#channels" },
  { label: "FAQ", href: "#faq" },
];
export const landingFeatures: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: CalendarDays, title: "Visual calendar", description: "See the full publishing plan, move posts when the plan changes, and keep every channel in view." },
  { icon: Sparkles, title: "AI-powered drafts", description: "Generate a thoughtful first version, then make it unmistakably yours before it is scheduled." },
  { icon: Layers2, title: "Multi-channel posts", description: "Start from one core idea and tailor its format, tone, and length for each connected channel." },
  { icon: BrainCircuit, title: "Idea bank", description: "Capture promising thoughts early, group them deliberately, and turn the right ones into posts." },
  { icon: LayoutDashboard, title: "Focused workspace", description: "Planning, writing, review, and publishing live together instead of across scattered tabs." },
  { icon: Zap, title: "Scheduled publishing", description: `Review the queue once, then let ${APP_NAME} publish at the moment you chose.` },
];
export const landingChannels = [
  { type: ChannelTypeEnum.LINKEDIN, token: "linkedin", name: "LinkedIn" },
  { type: ChannelTypeEnum.INSTAGRAM, token: "instagram", name: "Instagram" },
  { type: ChannelTypeEnum.FACEBOOK, token: "facebook", name: "Facebook" },
  { type: ChannelTypeEnum.YOUTUBE, token: "youtube", name: "YouTube" },
] as const;
export const landingWorkflow = [
  ["01", "Capture the spark", "Drop a rough thought into the idea bank before it disappears."],
  ["02", "Shape it with AI", "Turn the seed into a channel-ready draft while your voice stays yours."],
  ["03", "Publish in rhythm", `Choose the moment, review the plan, and let ${APP_NAME} handle the queue.`],
] as const;
export const landingFaqs = [
  ["Which social platforms can I connect?", `${APP_NAME} currently supports LinkedIn, Instagram, Facebook, and YouTube.`],
  ["Can I customize content per channel?", "Yes. Start with one core idea, then tailor the copy and media for every selected channel."],
  ["Is SYNCDULE free to try?", "Yes. You can create an account and explore the workflow before choosing a paid plan."],
] as const;
