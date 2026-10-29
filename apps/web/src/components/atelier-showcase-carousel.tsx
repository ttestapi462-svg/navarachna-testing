"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface AtelierSlide {
  id: string;
  title: string;
  description: string;
  image: string;
}

export const ATELIER_CAROUSEL_SLIDES: AtelierSlide[] = [
  {
    id: "bridal-couture",
    title: "Handcrafted Bridal Lehengas",
    description: "Zardozi hand-embroidery and pure raw silk custom tailored for royal wedding celebrations.",
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "pattern-drafting",
    title: "Architectural Pattern Drafting",
    description: "36-point bespoke body measurements engineered for balanced draping and flawless contours.",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "heritage-silk",
    title: "Pure Banarasi & Kanjivaram",
    description: "Centuries-old woven heritage silks styled into elegant, contemporary regal evening silhouettes.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "zari-embroidery",
    title: "Artisan Zari & Threadwork",
    description: "Gold and silver bullion wire hand-spun by seasoned artisans to create heirloom garments.",
    image: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "muslin-toile",
    title: "Couture Muslin Fitting Trials",
    description: "Custom muslin toile test-fitting ensuring effortless comfort and a sculpted second-skin fit.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85",
  },
];

interface AtelierShowcaseCarouselProps {
  className?: string;
  autoPlayDelay?: number;
}

export function AtelierShowcaseCarousel({
  className,
  autoPlayDelay = 4200,
}: AtelierShowcaseCarouselProps) {
  const autoplayPlugin = React.useRef(
    Autoplay({
      delay: autoPlayDelay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  return (
    <div className={cn("relative w-full h-full overflow-hidden select-none bg-slate-950", className)}>
      <Carousel
        opts={{
          loop: true,
          align: "start",
        }}
        plugins={[autoplayPlugin.current]}
        className="w-full h-full relative group/carousel"
      >
        <CarouselContent className="h-full -ml-0" containerClassName="h-full">
          {ATELIER_CAROUSEL_SLIDES.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-0 basis-full h-full relative">
              <div className="relative h-full w-full overflow-hidden">
                {/* Full-Bleed Background Image */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  width={1600}
                  height={1200}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 size-full scale-100 object-cover transition-transform duration-1000 ease-out group-hover/carousel:scale-105"
                />

                {/* Smooth Fade Gradient for Typography Legibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                {/* Clean Content: Headline & Description */}
                <div className="absolute bottom-10 xl:bottom-14 inset-x-0 px-8 xl:px-12 z-10 space-y-2 pointer-events-none max-w-xl">
                  <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white font-heading tracking-tight leading-tight drop-shadow-md">
                    {slide.title}
                  </h2>
                  <p className="text-sm xl:text-base text-white/90 leading-relaxed font-normal drop-shadow-xs">
                    {slide.description}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
