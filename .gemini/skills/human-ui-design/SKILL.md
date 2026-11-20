---
name: human-ui-design
description: Human-centric UI/UX design guidelines and patterns to craft tactile, polished, non-AI-looking interfaces for web applications.
---

# Human-Centric UI Design Skill

This skill provides design heuristics, layout systems, and aesthetic standards to ensure web applications look handcrafted, human, and modern—completely avoiding the sterile "AI-generated template" appearance.

## 1. Escaping the "AI Template" Look
AI-generated interfaces typically suffer from:
- Symmetrical, repetitive cards with identical paddings and zero visual hierarchy.
- Generic outline icons in grey circles without context or personality.
- Sterile monochromatic palettes or default Tailwind colors (e.g., standard blue-500/slate-500 everywhere).
- Lack of micro-details, editorial typographic scale, or real-world metaphors.

### Heuristics for Human-Crafted Feel:
1. **Visual Weight & Asymmetry**: Not every stat or widget needs the same card size. Hero metrics should feel prominent, supporting data should be contextual and compact.
2. **Squircle & Tinted Containers**: Use 40–48px rounded squircles (`rounded-2xl`) with low-opacity category tints (e.g., `background: #color15; border: 1px solid #color30`) rather than harsh solid circles or empty borders.
3. **Real-world Emojis & Imagery**: Expressive, high-quality emojis (🍔, 💵, 📱, ✈️) and realistic icons create instant emotional connection and clarity compared to abstract geometric symbols.
4. **Editorial Typography**:
   - Contrast bold, tight-tracking headlines (`tracking-tight font-bold`) with warm, human secondary copy.
   - Use tabular numbers (`tabular-nums font-mono` or `font-semibold`) for financial amounts and dates so figures align naturally.

## 2. Color & Material System
- **Backgrounds**: Subtle off-white / light slate (`#f8fafc` or warm neutral) over harsh pure white `#ffffff` canvas, so white cards naturally elevate with soft `shadow-xs` / `shadow-sm`.
- **Primary Accents**: Distinctive, confident tones (e.g. Deep Emerald `#059669`, Indigo, or Forest) rather than generic electric blues.
- **Semantic Feedback**: Soft, readable tints for positive/income (emerald-50 / emerald-600) and negative/expense (rose-50 / rose-600).

## 3. Timeline & Financial Feed Rules
- **Chronological Date Grouping**: Group ledger records under human headers (*"Today"*, *"Yesterday"*, *"Wed, 20 Nov"*) with daily subtotals.
- **Contextual Chips**: Realistic payment badges (`💵 Cash`, `📱 UPI`), category tags, and lifestyle pills (`🌿 Need`, `✨ Want`).
- **Tactile Micro-interactions**: Smooth hover transitions, scale nudges on avatars (`group-hover:scale-105`), and clear focus rings.
