import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app";

interface LogoProps {
  name?: string;
  className?: string;
  hideName?: boolean;
}

export default function Logo({ name = APP_NAME, className, hideName = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/syncdule.png"
        alt=""
        width={28}
        height={28}
        className="size-7 rounded-[7px] object-contain"
      />
      {!hideName && (
        <span className="text-sm font-semibold uppercase tracking-[0.16em]">
          {name}
        </span>
      )}
    </div>
  );
}
