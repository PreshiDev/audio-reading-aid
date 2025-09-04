import { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Detect platform + browser
function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return "ios-safari";

  if (/android/.test(ua)) {
    if (ua.includes("chrome")) return "android-chrome";
    if (ua.includes("firefox")) return "android-firefox";
    if (ua.includes("samsungbrowser")) return "android-samsung";
    if (ua.includes("edg")) return "android-edge";
    return "android-other";
  }

  if (/win|mac|linux/.test(ua)) {
    if (ua.includes("edg")) return "desktop-edge";
    if (ua.includes("chrome")) return "desktop-chrome";
    if (ua.includes("safari")) return "desktop-safari";
    if (ua.includes("firefox")) return "desktop-firefox";
    if (ua.includes("opr") || ua.includes("opera")) return "desktop-opera";
    if (ua.includes("brave")) return "desktop-brave";
    return "desktop-other";
  }

  return "unknown";
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleInstallClick}
        className="bg-primary hover:bg-primary-dark text-white"
        size="sm"
        data-testid="button-install"
      >
        <Download size={16} className="mr-2" />
        Install App
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install this App</DialogTitle>
            <DialogDescription>
              Follow the steps below to add this app to your home screen.
            </DialogDescription>
          </DialogHeader>

          {/* iOS Safari */}
          {platform === "ios-safari" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Smartphone size={18} /> Open in Safari.
              </p>
              <p className="flex items-center gap-2">
                <Share2 size={18} /> Tap the <b>Share</b> button.
              </p>
              <p className="flex items-center gap-2">
                <PlusSquare size={18} /> Select <b>Add to Home Screen</b>.
              </p>
            </div>
          )}

          {/* Android Chrome */}
          {platform === "android-chrome" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Smartphone size={18} /> Open in Chrome.
              </p>
              <p className="flex items-center gap-2">
                <MoreVertical size={18} /> Tap <b>⋮ Menu</b>.
              </p>
              <p className="flex items-center gap-2">
                <PlusSquare size={18} /> Choose <b>Add to Home Screen</b>.
              </p>
            </div>
          )}

          {/* Android Firefox */}
          {platform === "android-firefox" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Smartphone size={18} /> Open in Firefox.
              </p>
              <p className="flex items-center gap-2">
                <MoreVertical size={18} /> Tap <b>⋮ Menu</b>.
              </p>
              <p className="flex items-center gap-2">
                <Download size={18} /> Select <b>Install</b>.
              </p>
            </div>
          )}

          {/* Android Samsung */}
          {platform === "android-samsung" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Smartphone size={18} /> Open in Samsung Internet.
              </p>
              <p className="flex items-center gap-2">
                <MoreVertical size={18} /> Tap the <b>≡ Menu</b>.
              </p>
              <p className="flex items-center gap-2">
                <PlusSquare size={18} /> Choose <b>Add Page to</b> → <b>Home screen</b>.
              </p>
            </div>
          )}

          {/* Desktop Chrome/Edge/Opera/Brave */}
          {(platform === "desktop-chrome" ||
            platform === "desktop-edge" ||
            platform === "desktop-opera" ||
            platform === "desktop-brave") && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Monitor size={18} /> Open in {platform.split("-")[1]}.
              </p>
              <p className="flex items-center gap-2">
                <Download size={18} /> Look for the <b>Install</b> icon in the address bar.
              </p>
              <p className="flex items-center gap-2">
                <PlusSquare size={18} /> Click <b>Install</b>.
              </p>
            </div>
          )}

          {/* Desktop Safari */}
          {platform === "desktop-safari" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <Share2 size={18} /> Use the <b>Share</b> menu.
              </p>
              <p className="flex items-center gap-2">
                <PlusSquare size={18} /> Select <b>Add to Dock</b>.
              </p>
            </div>
          )}

          {/* Desktop Firefox */}
          {platform === "desktop-firefox" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <MoreVertical size={18} /> Open the <b>≡ Menu</b>.
              </p>
              <p className="flex items-center gap-2">
                <Download size={18} /> Click <b>Install</b>.
              </p>
            </div>
          )}

          {/* Fallback */}
          {platform === "unknown" && (
            <div>
              <p>
                Open your browser menu and look for{" "}
                <b>"Add to Home Screen"</b> or <b>"Install App"</b>.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
