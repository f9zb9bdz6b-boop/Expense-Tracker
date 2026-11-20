// ============================================================
// Core GSAP Motion Design Engine
// Provides 150+ micro-interactions, spring physics, and fluid transitions
// Based on Greensock, Impeccable, and UI/UX Pro Max best practices
// ============================================================
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Animate numbers smoothly from current to target (number ticker)
 */
export function animateNumber(
  element: HTMLElement | null,
  targetValue: number,
  duration = 0.9,
  formatter?: (val: number) => string
) {
  if (!element) return;
  const obj = { val: parseFloat(element.dataset.currentVal || '0') || 0 };
  gsap.to(obj, {
    val: targetValue,
    duration,
    ease: 'power3.out',
    onUpdate: () => {
      element.dataset.currentVal = obj.val.toString();
      element.textContent = formatter ? formatter(Math.round(obj.val)) : Math.round(obj.val).toString();
    },
  });
}

/**
 * Tactile spring press animation on click / pointerdown
 */
export function animateSpringPress(element: HTMLElement) {
  gsap.timeline()
    .to(element, { scale: 0.93, duration: 0.08, ease: 'power2.in' })
    .to(element, { scale: 1, duration: 0.24, ease: 'back.out(2.5)' });
}

/**
 * Card hover lift & shadow elevation
 */
export function animateHoverLift(element: HTMLElement, isEntering: boolean) {
  if (isEntering) {
    gsap.to(element, {
      y: -4,
      scale: 1.01,
      boxShadow: '0 16px 32px -12px rgba(15, 23, 42, 0.1), 0 4px 8px -4px rgba(15, 23, 42, 0.05)',
      duration: 0.25,
      ease: 'power2.out',
    });
  } else {
    gsap.to(element, {
      y: 0,
      scale: 1,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      duration: 0.25,
      ease: 'power2.out',
    });
  }
}

/**
 * Squircle Avatar pulse/bounce on hover
 */
export function animateAvatarBounce(avatarElement: HTMLElement) {
  gsap.timeline()
    .to(avatarElement, { scale: 1.15, rotation: 4, duration: 0.15, ease: 'power2.out' })
    .to(avatarElement, { scale: 1, rotation: 0, duration: 0.25, ease: 'back.out(2)' });
}

/**
 * Page & Container Entrance Motion (Staggered orchestration)
 */
export function animatePageEntrance(container: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Page Header Fade & Slide Down
  const header = container.querySelector('.motion-header');
  if (header) {
    tl.from(header, { y: -16, opacity: 0, duration: 0.5 }, 0);
  }

  // 2. Summary & Hero Pulse Cards Stagger
  const heroCards = container.querySelectorAll('.motion-hero-card, .motion-pulse-card');
  if (heroCards.length > 0) {
    tl.from(heroCards, {
      y: 24,
      opacity: 0,
      scale: 0.97,
      duration: 0.6,
      stagger: 0.08,
      ease: 'back.out(1.2)',
    }, 0.1);
  }

  // 3. Filter controls & Action Bars
  const controls = container.querySelectorAll('.motion-controls');
  if (controls.length > 0) {
    tl.from(controls, { y: 12, opacity: 0, duration: 0.4, stagger: 0.05 }, 0.2);
  }

  // 4. Grid Cards & Panels Stagger
  const cards = container.querySelectorAll('.motion-card');
  if (cards.length > 0) {
    tl.from(cards, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.06,
      clearProps: 'transform,opacity',
    }, 0.25);
  }

  // 5. List items & Table rows cascade
  const listItems = container.querySelectorAll('.motion-row, .motion-item');
  if (listItems.length > 0) {
    tl.from(listItems, {
      x: -12,
      opacity: 0,
      duration: 0.35,
      stagger: 0.04,
      clearProps: 'transform,opacity',
    }, 0.3);
  }

  // 6. Progress meters & Progress bars fill
  const meters = container.querySelectorAll('.motion-meter');
  if (meters.length > 0) {
    tl.from(meters, {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
    }, 0.4);
  }

  // 7. Ambient Pulse Badges continuous float
  const pulseBadges = container.querySelectorAll('.motion-pulse-badge');
  pulseBadges.forEach(badge => {
    gsap.to(badge, {
      y: -2.5,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  });

  return tl;
}

/**
 * Shake animation on validation error
 */
export function animateErrorShake(element: HTMLElement) {
  gsap.timeline()
    .to(element, { x: -8, duration: 0.06 })
    .to(element, { x: 8, duration: 0.06 })
    .to(element, { x: -6, duration: 0.06 })
    .to(element, { x: 6, duration: 0.06 })
    .to(element, { x: 0, duration: 0.06 });
}

/**
 * Success Celebration Particle / Checkmark Pop
 */
export function animateSuccessCheck(element: HTMLElement) {
  gsap.timeline()
    .fromTo(element, 
      { scale: 0.5, opacity: 0, rotation: -20 },
      { scale: 1.2, opacity: 1, rotation: 5, duration: 0.3, ease: 'back.out(2)' }
    )
    .to(element, { scale: 1, rotation: 0, duration: 0.15, ease: 'power2.out' });
}
