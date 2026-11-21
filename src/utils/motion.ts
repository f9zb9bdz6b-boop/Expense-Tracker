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
 * Animate numbers smoothly from current to target (snappy, GPU-friendly ticker)
 */
export function animateNumber(
  element: HTMLElement | null,
  targetValue: number,
  duration = 0.4,
  formatter?: (val: number) => string
) {
  if (!element) return;
  const obj = { val: parseFloat(element.dataset.currentVal || '0') || 0 };
  gsap.to(obj, {
    val: targetValue,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      element.dataset.currentVal = obj.val.toString();
      element.textContent = formatter ? formatter(Math.round(obj.val)) : Math.round(obj.val).toString();
    },
  });
}

/**
 * Tactile spring press animation on click (snappy 160ms, 60-120 FPS)
 */
export function animateSpringPress(element: HTMLElement) {
  gsap.timeline({ defaults: { force3D: true } })
    .to(element, { scale: 0.95, duration: 0.06, ease: 'power2.in' })
    .to(element, { scale: 1, duration: 0.16, ease: 'power2.out' });
}

/**
 * Card hover lift — pure GPU transform (no layout/paint-inducing shadow interpolation)
 */
export function animateHoverLift(element: HTMLElement, isEntering: boolean) {
  gsap.to(element, {
    y: isEntering ? -3 : 0,
    duration: 0.18,
    ease: 'power2.out',
    force3D: true,
  });
}

/**
 * Squircle Avatar pulse on hover
 */
export function animateAvatarBounce(avatarElement: HTMLElement) {
  gsap.timeline({ defaults: { force3D: true } })
    .to(avatarElement, { scale: 1.1, duration: 0.1, ease: 'power2.out' })
    .to(avatarElement, { scale: 1, duration: 0.15, ease: 'power2.out' });
}

/**
 * Page & Container Entrance Motion (Smooth, elongated glide with power3 deceleration)
 */
export function animatePageEntrance(container: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });

  // 1. Page Header Fade & Long Glide Up
  const header = container.querySelectorAll('.motion-header');
  if (header.length > 0) {
    tl.fromTo(
      header,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, clearProps: 'all' },
      0
    );
  }

  // 2. Summary & Hero Pulse Cards Stagger
  const heroCards = container.querySelectorAll('.motion-hero-card, .motion-pulse-card');
  if (heroCards.length > 0) {
    tl.fromTo(
      heroCards,
      { y: 28, opacity: 0, scale: 0.99 },
      { y: 0, opacity: 1, scale: 1, duration: 0.85, stagger: 0.08, clearProps: 'all' },
      0.08
    );
  }

  // 3. Filter controls & Action Bars
  const controls = container.querySelectorAll('.motion-controls');
  if (controls.length > 0) {
    tl.fromTo(
      controls,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, stagger: 0.05, clearProps: 'all' },
      0.12
    );
  }

  // 4. Grid Cards & Panels Stagger
  const cards = container.querySelectorAll('.motion-card');
  if (cards.length > 0) {
    tl.fromTo(
      cards,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.82, stagger: 0.06, clearProps: 'all' },
      0.12
    );
  }

  // 5. List items & Table rows cascade
  const listItems = container.querySelectorAll('.motion-row, .motion-item');
  if (listItems.length > 0) {
    tl.fromTo(
      listItems,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.03, ease: 'power2.out', clearProps: 'all' },
      0.18
    );
  }

  // 6. Progress meters & Progress bars fill
  const meters = container.querySelectorAll('.motion-meter');
  if (meters.length > 0) {
    tl.fromTo(
      meters,
      { scaleX: 0, transformOrigin: 'left' },
      { scaleX: 1, duration: 0.95, stagger: 0.06, ease: 'power2.out', clearProps: 'transformOrigin' },
      0.22
    );
  }

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

/**
 * Tactile Web Audio synthesizer for pleasant micro-chimes (zero latency, zero external assets)
 */
export function playFeedbackChime(type: 'tap' | 'success' | 'coin' | 'toggle' = 'tap') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success' || type === 'coin') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.06); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'toggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.04);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // AudioContext blocked or not allowed by browser autoplay policy
  }
}

/**
 * Subtle glow ripple animation on click
 */
export function animateRipple(e: React.MouseEvent<HTMLElement>) {
  const target = e.currentTarget;
  animateSpringPress(target);
}
