---
name: gsap-motion
description: Best practices, patterns, and hook guidelines for implementing fluid, high-performance UI motion design, micro-interactions, and page transitions using GSAP and @gsap/react.
---

# GSAP Motion Design Skill

This skill guides the design and implementation of fluid, 60fps animations, micro-interactions, and transitions in React and web applications using **GSAP** and **@gsap/react**.

---

## 1. Core Principles of Good UI Motion
1. **Purpose-Driven**: Motion should orient the user, clarify spatial hierarchy, or provide tactile feedback—never just decoration that slows down the user.
2. **Speed & Snappiness**: UI micro-interactions should finish in **150ms – 300ms**. Page transitions and complex entrances in **400ms – 600ms**. Never make users wait.
3. **Natural Easing**: Avoid linear or harsh easings.
   - Entrances: `power3.out`, `expo.out`, or `back.out(1.4)` for playful spring.
   - Exits: `power2.in` or `power3.in`.
   - Continuous / Physics: `power2.inOut` or custom cubic beziers.
4. **Hardware Acceleration**: Always animate composited properties:
   - `x`, `y`, `xPercent`, `yPercent` (transforms, NOT `left`/`top`)
   - `scale`, `scaleX`, `scaleY`
   - `rotation`
   - `opacity`
5. **Accessibility**: Always respect `prefers-reduced-motion`:
   ```ts
   const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (prefersReduced) return;
   ```

---

## 2. React Integration with `@gsap/react`
Always use `useGSAP` from `@gsap/react`. It automatically handles cleanup, context scoping, and prevents memory leaks on component unmount.

### Recommended Setup:
```tsx
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Register plugins if needed
gsap.registerPlugin(useGSAP);

export function AnimatedCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Target elements scoped within containerRef
    gsap.from('.stagger-item', {
      opacity: 0,
      y: 16,
      duration: 0.45,
      stagger: 0.08,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      <div className="stagger-item">Item 1</div>
      <div className="stagger-item">Item 2</div>
    </div>
  );
}
```

### Event Handlers with `contextSafe`:
When triggering animations from click, hover, or interactive events inside `useGSAP`:
```tsx
const { contextSafe } = useGSAP({ scope: containerRef });

const handleHover = contextSafe((e: React.MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1.03,
    duration: 0.2,
    ease: 'power2.out',
  });
});

const handleHoverEnd = contextSafe((e: React.MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1,
    duration: 0.2,
    ease: 'power2.out',
  });
});
```

---

## 3. High-Value Financial UI Animation Recipes

### A. Number Ticker / Animated Balance Counter
Smoothly interpolate numbers when balance changes:
```tsx
export function useAnimatedNumber(targetValue: number, onUpdate: (val: number) => void) {
  const valRef = useRef({ value: 0 });

  useGSAP(() => {
    gsap.to(valRef.current, {
      value: targetValue,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        onUpdate(Math.round(valRef.current.value));
      },
    });
  }, [targetValue]);
}
```

### B. Staggered Feed / Transaction Timeline Entrance
When switching tabs or loading new transactions:
```tsx
useGSAP(() => {
  gsap.from('.tx-card', {
    opacity: 0,
    y: 12,
    duration: 0.35,
    stagger: 0.04,
    ease: 'power2.out',
    clearProps: 'all', // Clears inline styles after animation finishes
  });
}, { dependencies: [activeTab, transactions.length], scope: feedRef });
```

### C. Tactile Button Tap (Haptic Feel)
```tsx
const tapAnimation = contextSafe((buttonElement: HTMLElement) => {
  gsap.timeline()
    .to(buttonElement, { scale: 0.95, duration: 0.08, ease: 'power2.in' })
    .to(buttonElement, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
});
```

### D. Modal & Dialog Pop-In
```tsx
useGSAP(() => {
  if (isOpen) {
    gsap.fromTo('.dialog-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo('.dialog-panel', 
      { opacity: 0, scale: 0.94, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' }
    );
  }
}, [isOpen]);
```

---

## 4. Checklist for Production Motion Design
- [ ] No layout shifts: Animated properties are strictly `transform` or `opacity`.
- [ ] `clearProps: 'all'` applied on entrance animations so CSS layout remains responsive.
- [ ] Durations are snappy (≤ 400ms for interactions, ≤ 600ms for scenes).
- [ ] Memory safe: All timelines scoped with `useGSAP({ scope: ... })`.
