import { Hero } from '../components/home/Hero';
import { StatsStrip } from '../components/home/StatsStrip';
import { HowItWorks } from '../components/home/HowItWorks';
import { Features } from '../components/home/Features';
import { SamplesCarousel } from '../components/home/SamplesCarousel';
import { CtaBand, MethodologyTeaser, ResponsibleAI } from '../components/home/Sections';

export default function Home() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Features />
      <SamplesCarousel />
      <MethodologyTeaser />
      <ResponsibleAI />
      <CtaBand />
    </>
  );
}
