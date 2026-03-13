import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { LogoCloud } from "@/components/landing/logo-cloud";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { ProductDemo } from "@/components/landing/product-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTAFooter } from "@/components/landing/cta-footer";
import { SectionDivider } from "@/components/landing/section-divider";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <LogoCloud />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <Features />
      <SectionDivider />
      <ProductDemo />
      <SectionDivider />
      <Testimonials />
      <SectionDivider />
      <Pricing />
      <FAQ />
      <CTAFooter />
    </div>
  );
}
