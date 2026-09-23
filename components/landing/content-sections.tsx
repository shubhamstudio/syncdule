import { MessageCircleQuestion, Sparkles, Zap } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { getChannelIcon } from "@/constants/channels";
import { LandingActions } from "./landing-actions";
import { landingChannels, landingFaqs, landingFeatures, landingWorkflow } from "./landing-data";

export function WorkflowSection() { return <section id="how-it-works" className="landing-section landing-workflow"><div className="landing-container"><div className="landing-section-heading"><p className="landing-kicker">From thought to publish</p><h2>A calmer way to stay <em>consistent.</em></h2></div><div className="landing-workflow-grid">{landingWorkflow.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>; }
export function FeaturesSection() { return <section id="features" className="landing-section"><div className="landing-container"><div className="landing-section-heading centered"><p className="landing-kicker">Everything you need</p><h2>Built for a better <em>rhythm.</em></h2><p>From capturing a raw idea to hitting publish across four platforms—every step lives inside one workspace.</p></div><div className="landing-feature-grid">{landingFeatures.map(({ icon: Icon, title, description }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>; }
export function ChannelsSection() { return <section id="channels" className="landing-section landing-channels"><div className="landing-container"><div className="landing-section-heading centered"><p className="landing-kicker">Supported channels</p><h2>One voice, <em>everywhere.</em></h2><p>Connect your accounts and make each post feel native to the place it is published.</p></div><div className="landing-channel-cards">{landingChannels.map((channel) => { const icon = getChannelIcon(channel.type); return <article key={channel.type}><span className={channel.token}>{icon && <HugeiconsIcon icon={icon} aria-hidden="true" />}</span><h3>{channel.name}</h3><p>Connect &amp; schedule</p></article>; })}</div></div></section>; }
export function FaqSection() { return <section id="faq" className="landing-section"><div className="landing-container landing-faq-layout"><div className="landing-section-heading"><span className="landing-faq-icon"><MessageCircleQuestion aria-hidden="true" /></span><h2>Questions, <em>answered.</em></h2><p>Everything you need to know before you make your workflow more intentional.</p></div><div className="landing-faq-list">{landingFaqs.map(([question, answer], index) => <details key={question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}</div></div></section>; }
type ClosingSectionProps = {
  isSignedIn: boolean | undefined;
};

export function ClosingSection({ isSignedIn }: ClosingSectionProps) {
  return (
    <section id="pricing" className="landing-section landing-closing-section">
      <div className="landing-container">
        <div className="landing-closing">
          <p className="landing-kicker">
            <Zap aria-hidden="true" />
            Free to start
          </p>
          <h2>Ready to get organized?</h2>
          <p>Join creators who use SYNCDULE to plan smarter and publish consistently—without the chaos.</p>
          <LandingActions isSignedIn={isSignedIn} />
        </div>
      </div>
    </section>
  );
}
