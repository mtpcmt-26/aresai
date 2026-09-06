import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Image,
  FlaskConical,
  Palette,
  KeyRound,
  AlertTriangle,
  Sparkles,
  Video,
  HelpCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-2 border-b border-border pb-5 last:border-0 last:pb-0">
    <div className="flex items-center gap-2 text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em]">
        {title}
      </h3>
    </div>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  </section>
);

export const HelpDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl rounded-sm border-border p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.18em]">
            <HelpCircle className="h-5 w-5 text-primary" />
            How to use Ares
          </DialogTitle>
          <DialogDescription>
            A quick guide to chatting, creating, and customizing Ares.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-7rem)] px-6 pb-6">
          <div className="space-y-6 pr-4">
            <Section icon={MessageSquare} title="Start a conversation">
              <p>
                Click <strong>New chat</strong> in the sidebar to begin. Type your question or prompt in the box at the bottom and press Enter (or tap the arrow) to send.
              </p>
              <p>
                Your conversations are saved to your account, so they follow you across devices.
              </p>
            </Section>

            <Section icon={Sparkles} title="Pick a mode">
              <p>
                Use the dropdown at the top of the chat to choose how Ares responds:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Normal</strong> — clear, emotionally aware, grounded answers.</li>
                <li><strong>0-Filter</strong> — brutal honesty with mild profanity. Age-gated to 13+.</li>
                <li><strong>People-Pleaser</strong> — warm, validating, and agreeable.</li>
                <li><strong>Political</strong> — direct, assertive, policy-focused takes.</li>
                <li><strong>Short</strong> — quick, concise replies.</li>
              </ul>
            </Section>

            <Section icon={Image} title="Images, analysis & generation">
              <p>
                Tap the paperclip or image icon in the composer to upload up to 4 photos. Ares can describe, analyze, or answer questions about what it sees.
              </p>
              <p>
                To generate or edit images, switch the toggle next to the composer to <strong>Image Mode</strong> and describe what you want.
              </p>
            </Section>

            <Section icon={Video} title="Video generation">
              <p>
                Ask Ares to make a video — for example, “Generate a video of a cat walking on the moon.” Ares will create a short clip for you when video generation is enabled.
              </p>
            </Section>

            <Section icon={FlaskConical} title="Ares Labs">
              <p>
                Flip the <strong>Ares Labs</strong> switch in the header to open the coding studio. Describe an app or UI, and Ares will build a live, interactive preview you can test on Desktop, Mobile, or Tablet.
              </p>
              <p>
                You can create multiple projects; each one is saved to your account.
              </p>
            </Section>

            <Section icon={Sparkles} title="Quiz Mode">
              <p>
                Ask for a quiz — e.g., “Quiz me on world history” or “Give me 5 hard biology questions.” Ares automatically switches into Quiz Mode with scored answers.
              </p>
            </Section>

            <Section icon={Palette} title="Customize the look">
              <p>
                Open <strong>Settings → Customize</strong> to change fonts, themes, accent colors, and wallpapers. You can also upload your own background image from your device.
              </p>
            </Section>

            <Section icon={KeyRound} title="API keys">
              <p>
                Go to <strong>Account → API keys</strong> to create an Ares API key. Use it to send prompts to Ares from your own apps or scripts.
              </p>
            </Section>

            <Section icon={AlertTriangle} title="Important notes">
              <p>
                Ares can make mistakes. Always fact-check important information, especially about current events, people, and numbers.
              </p>
              <p>
                For time-sensitive questions, Ares searches the live web, but you should still verify critical details from primary sources.
              </p>
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
