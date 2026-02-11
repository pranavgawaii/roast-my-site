import { Download, Linkedin, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import { Button } from "../../shared/ui/Button";
import { cleanDomain, excerpt } from "../../shared/lib/utils";
import type { RoastResult } from "../../shared/types";

interface ShareButtonsProps {
  roast: RoastResult;
  centered?: boolean;
}

export function ShareButtons({ roast, centered = false }: ShareButtonsProps) {
  const qualityScore =
    typeof roast.qualityScore === "number"
      ? Math.round(roast.qualityScore)
      : Math.max(0, 100 - Math.round(roast.roastScore));
  const strongestEvidence =
    roast.evidence?.find((item) => item.impact === "high") || roast.evidence?.[0];

  const summary = strongestEvidence
    ? `${strongestEvidence.label}: ${excerpt(strongestEvidence.value, 140)}`
    : excerpt(roast.roast, 140);

  const shareText = `I got my website roasted by AI 🔥
Quality Score: ${qualityScore}/100

${summary}

Try it: roastmy.site`;

  const handleDownload = async () => {
    const node = document.getElementById("shareable-card");
    if (!node) {
      toast.error("Share card not found.");
      return;
    }

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#070b14"
      });
      const link = document.createElement("a");
      link.download = `roast-${cleanDomain(roast.url)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image downloaded.");
    } catch {
      toast.error("Could not generate image.");
    }
  };

  const handleShareX = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
      <Button onClick={handleShareX}>
        <Share2 className="h-4 w-4" />
        Share on X
      </Button>
      <Button variant="secondary" onClick={handleShareLinkedIn}>
        <Linkedin className="h-4 w-4" />
        Share on LinkedIn
      </Button>
      <Button variant="secondary" onClick={handleDownload}>
        <Download className="h-4 w-4" />
        Download Image
      </Button>
    </div>
  );
}
