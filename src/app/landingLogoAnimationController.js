import { gsap } from "gsap";

let landingLogoContext = null;

export function initLandingLogoAnimation() {
  const root = document.querySelector("[data-landing-logo-animation]");
  if (landingLogoContext) {
    landingLogoContext.revert();
    landingLogoContext = null;
  }
  if (!root) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const route = root.querySelector(".manifesto-route-line");
  const spark = root.querySelector(".manifesto-route-spark");
  const logo = root.querySelector(".manifesto-big-logo");
  const pins = root.querySelectorAll(".manifesto-location-pin");
  const orbits = root.querySelectorAll(".manifesto-logo-orbit");

  if (!route || !spark || !logo) return;

  landingLogoContext = gsap.context(() => {
    const routeLength = route.getTotalLength?.() || 520;

    gsap.set(route, {
      strokeDasharray: routeLength,
      strokeDashoffset: reduceMotion ? 0 : routeLength,
    });

    gsap.set([spark, ...pins, ...orbits], { autoAlpha: reduceMotion ? 1 : 0 });

    if (reduceMotion) {
      gsap.set(logo, { clearProps: "transform,opacity,visibility" });
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
    });

    tl.from(logo, {
      autoAlpha: 0,
      y: 18,
      scale: 0.88,
      rotation: -2,
      duration: 0.7,
    })
      .to(route, {
        strokeDashoffset: 0,
        duration: 1.35,
        ease: "power2.inOut",
      }, "-=0.35")
      .to(spark, {
        autoAlpha: 1,
        duration: 0.18,
      }, "<")
      .to(spark, {
        keyframes: [
          { x: 58, y: -38, duration: 0.42, ease: "sine.inOut" },
          { x: 120, y: -39, duration: 0.4, ease: "sine.inOut" },
          { x: 196, y: -92, duration: 0.52, ease: "sine.inOut" },
          { x: 244, y: -80, duration: 0.36, ease: "sine.inOut" },
        ],
      }, "<")
      .to(pins, {
        autoAlpha: 1,
        y: -5,
        scale: 1,
        stagger: 0.16,
        duration: 0.38,
        ease: "back.out(1.7)",
      }, "-=0.8")
      .to(logo, {
        y: -4,
        scale: 1.03,
        duration: 0.35,
        ease: "back.out(1.5)",
      }, "-=0.45")
      .to(logo, {
        y: 0,
        scale: 1,
        rotation: 0,
        duration: 0.42,
        ease: "power2.out",
      })
      .to(orbits, {
        autoAlpha: 1,
        scale: 1,
        stagger: 0.16,
        duration: 0.45,
      }, "-=0.45");

    gsap.to(".manifesto-logo-motion-shell", {
      y: -4,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.to(orbits, {
      rotation: 360,
      transformOrigin: "50% 50%",
      duration: 14,
      repeat: -1,
      ease: "none",
      stagger: 1.8,
    });

    gsap.to(pins, {
      y: "+=3",
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.22,
    });
  }, root);
}
