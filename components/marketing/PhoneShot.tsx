import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  /** Hauteur d'écran visible : la capture est recadrée par le haut. */
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/** Capture réelle de l'application dans un cadre de téléphone. */
export function PhoneShot({ src, alt, height, sizes = "260px", priority, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-[40px] border-[9px] border-[#161a3d] bg-[#161a3d] shadow-[0_30px_60px_rgba(20,25,90,0.25)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[31px] bg-[#e9ebf7]" style={{ height }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
      </div>
    </div>
  );
}
