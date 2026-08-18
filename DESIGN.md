# AI Workshop Hub — Idea Playground Design System

> Version 0.1 — Balanced direction  
> Status: working design baseline  
> Primary audience: students, parents, teachers, and school leadership  
> Interface language: English-first; content may support Chinese when required

## 1. Design North Star

AI Workshop Hub should feel like a living creative workbench where student ideas are being made, tested, and shared—not like a commercial SaaS product, a school administration portal, or a children’s learning website.

The visual concept is **Idea Playground / 创意实验场**:

- A warm, bright workshop canvas provides structure and trust.
- Student projects appear as colorful, tactile “idea cards” placed on that canvas.
- Hand-drawn marks communicate curiosity and experimentation.
- Technical grids, monospace labels, and precise controls communicate AI and coding.
- Motion turns static project cards into ideas that feel alive.
- The interface steps back when a visitor launches a project.

The desired balance is:

- **60% creative studio**
- **25% student exhibition**
- **15% AI technology lab**

The website must be visually memorable, but the student work—not decorative chrome—must remain the focal point.

## 2. Core Principles

### 2.1 Student work is the color source

Project covers provide most of the visual richness. Interface colors frame and categorize projects; they do not compete with them.

### 2.2 Playful structure, serious craft

Layouts may use offset panels, doodles, and asymmetry, but typography, spacing, accessibility, and interaction behavior must remain disciplined.

### 2.3 Reveal information progressively

- Grid cards show only cover, title, student, class, and tags.
- Clicking a card expands one concise information card in context.
- `View Project` launches the actual project.
- Do not create a heavy standalone detail page unless future content genuinely requires one.

### 2.4 Motion explains state

Animation should clarify where an element came from, what changed, and where the user can go next. Decorative motion must be slow, sparse, and nonessential.

### 2.5 The Hub frames; the project performs

The Hub uses a distinctive visual system. The project runner uses a neutral shell so each student project can retain its own design identity.

## 3. Experience Modes

The product uses three related modes rather than one visual treatment everywhere.

### Mode A — Gallery Canvas

Used for Home, All Projects, and About.

- Warm off-white background
- Pastel project panels
- Hand-drawn Idea Marks
- Spacious editorial typography
- Medium expressive motion

### Mode B — Focused Project Card

Used after clicking a project card.

- Current page remains visible but quiet
- One project card expands into the focal layer
- Essential metadata only
- Strong `View Project` action
- Fast shared-element transition

### Mode C — Project Runner

Used after clicking `View Project`.

- Minimal Hub utility bar
- Neutral outer frame
- Student project receives nearly all available space
- Optional fullscreen mode removes Hub chrome
- Clear and persistent way back to the Hub

## 4. Information Architecture

### Public navigation

1. Home
2. Projects
3. About
4. Admin entry

### Required public screens

1. **Home**
   - Navigation
   - Hero statement
   - Animated project collage
   - Featured Projects
   - Platform statement
   - Footer
2. **All Projects**
   - Search
   - Category filters
   - Grade filter
   - Technology filter
   - Sort
   - Results count
   - Project grid
   - Pagination or progressive loading
3. **Expanded Project Card**
   - Cover
   - Title
   - Short description
   - Student display name
   - Grade/class
   - Technologies
   - Tags
   - Close
   - View Project
4. **Project Runner**
   - Back to Hub
   - Project title and student name
   - Project information control
   - Fullscreen control
   - Sandboxed project viewport
5. **About**
   - Purpose
   - How projects are created
   - Student-centered principles
   - School context

### Admin mode

Admin screens inherit type, color tokens, buttons, and inputs, but remove most doodles, floating shapes, and expressive transitions. Operational clarity takes priority.

## 5. Brand Personality

The interface should feel:

- Curious
- Inventive
- Optimistic
- Student-centered
- Handcrafted
- Technically capable
- Open and exploratory

It should not feel:

- Corporate or sales-driven
- Juvenile or cartoonish
- Cyberpunk
- Luxury-minimal
- Overly academic
- Like a generic dashboard template

## 6. Visual Identity

### 6.1 Signature motif: The Idea Card

The Idea Card is the core visual object. It combines:

- A pastel paper-like outer surface
- A clean white or image-based project window
- A dark-ink title block
- One or two taxonomy tags
- A small Idea Mark near a corner
- A strong black action button when expanded

Cards may be subtly offset by `-1deg` to `1deg` in editorial hero compositions. Cards in a dense project grid remain level for easier scanning.

### 6.2 Signature motif: Idea Marks

Idea Marks are simple one-color line drawings:

- Four-line spark
- Curved arrow
- Incomplete circle
- Hand-drawn underline
- Dashed journey path
- Leaf
- Star/asterisk
- Small orbit

Rules:

- Use dark ink or one semantic accent.
- Use no more than three Idea Marks in one viewport.
- Never place a doodle over essential text.
- Doodles may animate once when entering the viewport.
- Do not use emoji or clip-art as substitutes.

### 6.3 Signature motif: Build Grid

The Build Grid adds the technical layer:

- 24px dot grid in large hero areas
- 8px baseline rhythm
- Monospace metadata
- Small registration marks at selected card corners
- Thin dashed separators for technical metadata

The grid must fade out toward page edges and never reduce text legibility.

## 7. Color System

### 7.1 Foundation

| Token | Value | Use |
|---|---:|---|
| `--canvas` | `#FBFAF7` | Primary page background |
| `--canvas-pure` | `#FFFFFF` | Inputs, inset project windows |
| `--ink` | `#111111` | Primary text and strong borders |
| `--ink-soft` | `#3F3F3A` | Body copy |
| `--muted` | `#77766F` | Secondary metadata |
| `--line` | `#DAD8D0` | Quiet dividers |
| `--line-strong` | `#111111` | Interactive outlines |

### 7.2 Workshop colors

| Token | Value | Meaning |
|---|---:|---|
| `--lime` | `#DDF27A` | Simulation, sustainability, active discovery |
| `--violet` | `#C8B6FF` | Creative AI, visual generation |
| `--coral` | `#FF8A72` | Games, interaction, energy |
| `--mint` | `#BFE8CF` | Environment, science, wellbeing |
| `--blue` | `#A9DDF5` | Data, analysis, research |
| `--yellow` | `#F8E7A2` | Storytelling, language, ideas |
| `--pink` | `#F2C9DC` | Music, expression, social projects |

### 7.3 Category mapping

- Simulation → Lime
- Creative AI → Violet
- Games → Coral
- Data → Blue
- Storytelling → Yellow
- Sustainability/Science → Mint
- Music/Expression → Pink

Do not use color as the only category cue. Always pair it with a text label.

### 7.4 Color distribution

For a typical desktop viewport:

- 65–75% Canvas / white
- 15–25% project imagery
- 10–15% pastel surfaces
- Less than 5% pure black fills

Avoid displaying all workshop colors in every section. Use two or three dominant colors per viewport.

### 7.5 Contrast

- Body text on all pastel surfaces uses `--ink`.
- White text is reserved for `--ink` buttons and dark project content.
- Text and interactive controls must meet WCAG AA contrast.
- Never place small white text directly on yellow, lime, mint, or pale imagery.

## 8. Typography

### 8.1 Font stack

```css
--font-display: "Space Grotesk", "Noto Sans SC", system-ui, sans-serif;
--font-body: "Inter", "Noto Sans SC", system-ui, sans-serif;
--font-mono: "IBM Plex Mono", "Noto Sans Mono CJK SC", ui-monospace, monospace;
```

Use `font-display` for large titles and project names. Use `font-body` for readable prose and controls. Use `font-mono` for labels, tags, filters, class information, technical metadata, and the project runner utility bar.

### 8.2 Desktop type scale

| Role | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| Hero display | `clamp(64px, 7.2vw, 112px)` | 600 | 0.92 | `-0.045em` |
| Page title | `64px` | 600 | 1.00 | `-0.035em` |
| Section title | `40px` | 600 | 1.08 | `-0.025em` |
| Expanded card title | `52px` | 600 | 1.00 | `-0.03em` |
| Card title | `24px` | 650 | 1.15 | `-0.015em` |
| Body large | `20px` | 400 | 1.50 | `-0.005em` |
| Body | `16px` | 400 | 1.55 | `0` |
| UI label | `14px` | 550 | 1.30 | `0` |
| Mono metadata | `13px` | 500 | 1.35 | `0.03em` |
| Tag | `11px` | 600 | 1.20 | `0.06em` |

### 8.3 Typography rules

- Hero text may break across two or three lines.
- Do not center long paragraphs.
- Keep body lines between 55 and 75 characters.
- Use sentence case for buttons and navigation.
- Tags use uppercase.
- Avoid bold body paragraphs.
- Do not use more than three typefaces.

## 9. Spacing and Geometry

### 9.1 Base spacing scale

```text
2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

### 9.2 Page grid

- Desktop max width: `1440px`
- Reading max width: `1200px`
- Desktop outer gutter: `40–64px`
- Tablet gutter: `24–32px`
- Mobile gutter: `16–20px`
- Desktop columns: 12
- Tablet columns: 8
- Mobile columns: 4
- Standard column gap: `24px`

### 9.3 Corner radius

| Token | Value | Use |
|---|---:|---|
| `--radius-xs` | `6px` | Tags, small controls |
| `--radius-sm` | `10px` | Inputs, buttons |
| `--radius-md` | `16px` | Project image windows |
| `--radius-lg` | `24px` | Standard project cards |
| `--radius-xl` | `32px` | Expanded cards and hero panels |
| `--radius-pill` | `999px` | Primary pills and filter chips |

Pastel background shapes may use irregular SVG masks, but interactive content containers should use stable CSS radii for reliable focus rings and responsive behavior.

### 9.4 Borders and shadows

- Standard interactive border: `1.5px solid var(--ink)`
- Quiet card border: `1px solid rgba(17,17,17,.12)`
- Default cards are flat.
- Hovered cards may use an offset “paper lift” shadow:

```css
box-shadow: 5px 6px 0 rgba(17, 17, 17, 0.12);
```

- Do not use blurred SaaS-style shadows on every card.

## 10. Background System

The background has four optional layers. Never enable all four at full strength.

### Layer 1 — Warm Paper

Base color `--canvas`. Add extremely subtle monochromatic noise at 1–1.5% opacity. Noise must be a tiny local asset or CSS-generated texture, not a large image.

### Layer 2 — Dot Field

```css
background-image: radial-gradient(rgba(17,17,17,.15) 1px, transparent 1px);
background-size: 24px 24px;
```

Apply through a mask that fades the dots near content and viewport edges. Typical opacity: `0.12–0.22`.

### Layer 3 — Workshop Shapes

Large pastel shapes sit behind hero project previews. Shapes may be slightly irregular, but must not resemble random gradient blobs.

- Maximum three shapes in the hero
- Each shape uses one solid pastel with optional 4% tonal variation
- Shapes move no more than 12px over a complete animation cycle
- Cycle duration: 16–24 seconds

### Layer 4 — Registration Marks

Small crop marks, dashed axes, coordinates, or dot clusters may appear near section edges. Use sparingly and hide them below tablet width.

### Background restrictions

- No full-page aurora gradients
- No continuous particle system
- No video background behind body copy
- No cursor-following trail across the whole page
- No high-contrast animated grid

## 11. Layout Shell

### 11.1 Global navigation

Desktop height: `72px`; mobile height: `60px`.

Structure:

- Left: AI WORKSHOP HUB wordmark
- Right: Projects, About, Admin
- Active public navigation item uses a black pill
- Admin always appears visually separated

Behavior:

- Initially transparent over the canvas
- Becomes a slightly opaque paper surface after scrolling 24px
- Uses `backdrop-filter` only as a small progressive enhancement; provide an opaque fallback
- Sticky on public pages
- Never overlaps project runner content

### 11.2 Footer

The footer is a quiet closing canvas, not a corporate mega-footer.

- Platform name
- One-sentence purpose
- Projects / About
- School identification if approved
- Copyright and privacy
- One playful Idea Mark

## 12. Home Page

### 12.1 Hero

Desktop composition:

- Left 5 columns: headline, supporting copy, primary action
- Right 7 columns: animated collage of 3–4 student project previews
- Height target: `min(820px, calc(100vh - 72px))`
- Do not force full viewport height on small laptop screens

Recommended copy:

- Headline: **Ideas become interactive.**
- Support: **Explore AI projects designed and built by students.**
- Action: **Explore Projects**

The hero collage includes varied pastel surfaces and real project screenshots. It must never show generic AI robot imagery.

### 12.2 Featured Projects

- Desktop: one large featured card plus two standard cards, or three equal cards when covers have similar quality
- Tablet: two columns
- Mobile: horizontal snap carousel or one-column stack
- Limit to 3–5 featured projects
- Section action: `View all projects`

### 12.3 Platform statement

Use a single strong sentence and one small process visualization:

```text
Idea → Build → Test → Share
```

Avoid long marketing claims, statistics without context, sponsor logos, or conversion-focused calls to action.

## 13. All Projects Page

### 13.1 Header

- Title: `All Projects`
- Supporting copy: `Explore what students are building with AI.`
- Avoid a second hero collage on this page

### 13.2 Filter architecture

Filter order:

1. Search projects
2. Category chips
3. Grade
4. Tools/technology
5. Sort

Desktop layout:

- Search receives the most width
- Category chips remain visible
- Dropdowns align to the right
- Results count appears on its own line or at grid start

Mobile layout:

- Full-width search
- Horizontally scrollable category chips
- `Filters` button opens a bottom sheet for grade and technology
- Active filters appear as removable chips
- Keep sort accessible without opening the full filter sheet

### 13.3 Filtering motion

- Cards that no longer match fade and scale to `0.98` over 160ms
- Remaining cards reposition over 280–360ms
- New cards fade upward 8px over 240ms
- Result count updates after the layout settles
- Preserve scroll position whenever possible

### 13.4 Empty state

Use a simple dashed path and the message:

```text
No projects match these filters yet.
Try removing a filter or searching for something else.
```

Provide `Clear filters`.

## 14. Project Card System

### 14.1 Grid card anatomy

1. Cover image or captured project preview
2. Project title
3. Student display name and grade/class
4. One primary tag; optional second tag
5. Subtle `View Project` affordance

Do not show the full project description on a standard grid card.

### 14.2 Card proportions

- Desktop: aspect ratio between `4:3` and `3:2`
- Card content may use a 55/45 image-to-metadata split
- Minimum desktop width: `340px`
- Minimum mobile width: full content width

### 14.3 Hover

On pointer-capable devices:

- Translate card upward `6px`
- Rotate by at most `0.35deg`
- Scale cover to `1.025`
- Draw one nearby Idea Mark
- Reveal or emphasize the arrow beside `View Project`
- Duration: 240ms

Never tilt cards based continuously on cursor position; it reduces readability and causes unnecessary work.

### 14.4 Focus

Keyboard focus uses a 3px ink outline plus a 3px canvas offset. Focus must never depend only on card elevation.

## 15. Expanded Project Card

The expanded card replaces a full project detail page.

### 15.1 Required content only

- Project name
- Short description: maximum 180 characters
- Student display name
- Grade/class
- Technologies
- Tags
- Project cover
- View Project
- Close

Do not include by default:

- Learning reflection
- Multi-step workflow
- Publication history
- Long tool explanations
- Teacher commentary
- Metrics or social engagement

### 15.2 Desktop layout

- Width: `min(1120px, calc(100vw - 80px))`
- Max height: `calc(100vh - 96px)`
- Two-column composition
- Cover: 52–58%
- Information: 42–48%
- Close control at top-right
- Primary action at bottom of metadata column

### 15.3 Mobile layout

- Use a bottom sheet or full-screen dialog
- Cover first, metadata second
- Sticky bottom action area
- Drag handle is optional; explicit close button is required

### 15.4 Background treatment

The original page stays visible with:

- `rgba(251,250,247,.78)` paper veil
- Maximum `2px` background blur
- Background saturation reduced to 70%
- No black modal scrim

### 15.5 Transition

Use a shared-element transition when supported:

1. Card image and pastel surface remain visually continuous
2. Card moves to viewport center
3. Width expands
4. Metadata crossfades after the geometry settles
5. Focus moves to the close button or dialog heading

Fallback: 220ms scale-and-fade dialog transition.

## 16. Project Runner

### 16.1 Shell

Top utility bar:

- Back to AI Workshop Hub
- Project title · Student name
- Project Info
- Fullscreen

The shell uses `--canvas` with a thin lower border. It should not inherit category colors except for a tiny active indicator.

### 16.2 Viewport

- Project fills all remaining vertical space
- Default inset: 12–16px desktop, 0 mobile
- Neutral frame radius: 16px desktop
- Loading state uses the project’s category color and a simple progress line
- Errors are shown in plain language with an admin-only diagnostic detail option

### 16.3 Entry transition

Recommended sequence:

1. Expanded card action depresses for 100ms
2. Cover grows toward the viewport over 420ms
3. Hub utility bar fades in during the last 180ms
4. Project loads behind a paper-colored placeholder
5. Placeholder lifts when the project is ready

Do not delay functional project loading solely to complete an animation.

### 16.4 Fullscreen

- Fullscreen removes Hub chrome
- A temporary `Press Esc to exit fullscreen` hint appears once
- Returning from fullscreen restores scroll and focus
- Escape closes fullscreen before closing project information

## 17. Buttons and Controls

### Primary button

- Ink background
- White text
- 44–48px height
- 18–24px horizontal padding
- `10px` or pill radius depending on context
- Hover: translate `-2px`; hard shadow appears
- Active: translate back to `0`

### Secondary button

- Canvas/transparent background
- 1.5px ink border
- Ink text
- Same height as adjacent primary button

### Filter chip

- Default: canvas background, 1.5px ink border
- Selected: ink background, white text
- Selected chip receives no additional decorative color
- Use category color as a small dot if needed

### Inputs

- Canvas-pure background
- 1.5px border
- 48px minimum height
- Search icon aligned left
- Visible label where ambiguity exists
- Focus ring: 3px `--blue` plus 1px ink border

## 18. Tags and Metadata

- Uppercase monospace
- 11–12px
- 1px ink border or softly tinted background
- Maximum two visible tags on grid cards
- Expanded cards may show up to four
- Do not truncate the primary category
- Technology lists use text, not technology logos

Student identity should use the approved public display format. Never expose email addresses or private student identifiers.

## 19. Motion System

### 19.1 Motion personality

Motion should feel like paper pieces being placed on a workbench: light, springy, intentional, and quickly settled.

### 19.2 Duration tokens

```css
--motion-instant: 100ms;
--motion-fast: 160ms;
--motion-standard: 240ms;
--motion-layout: 320ms;
--motion-expressive: 420ms;
--motion-hero: 700ms;
--motion-ambient: 18000ms;
```

### 19.3 Easing tokens

```css
--ease-out: cubic-bezier(.22, 1, .36, 1);
--ease-standard: cubic-bezier(.2, .8, .2, 1);
--ease-spring: cubic-bezier(.16, 1.25, .3, 1);
--ease-in-out: cubic-bezier(.65, 0, .35, 1);
```

Use spring easing only for short translations and scale. Do not use it for opacity, long-distance page movement, or text rendering.

### 19.4 Page entrance

Home entrance sequence:

1. Navigation fades in over 240ms
2. Hero headline rises 12px over 420ms
3. Supporting copy and CTA follow at 80ms intervals
4. Collage cards enter with 60ms stagger and slight rotation correction
5. Idea Mark draws after primary content is readable

Maximum complete sequence: 900ms. Content must remain visible when JavaScript is unavailable.

### 19.5 Scroll reveal

- Trigger once per section
- Translate no more than 16px
- Use 240–420ms durations
- Maximum card stagger: 60ms
- Do not animate every paragraph independently
- Do not hide content while waiting for intersection observers

### 19.6 Ambient motion

- Limited to hero background shapes and selected doodles
- 16–24 second cycles
- Translate 6–12px
- Rotate no more than 1.5deg
- Pause when document is hidden
- Pause when hero is offscreen

### 19.7 Reduced motion

When `prefers-reduced-motion: reduce`:

- Disable ambient drift
- Disable card rotation and parallax
- Replace shared-element motion with a 100ms opacity transition
- Disable animated drawing of Idea Marks
- Preserve clear hover, active, and focus states without movement

## 20. Special Effects

### 20.1 Paper lift

Used on hover, active dialogs, and primary CTAs only. It uses a hard low-opacity shadow, not a soft floating shadow.

### 20.2 Hand-drawn stroke reveal

SVG paths may animate via `stroke-dashoffset`. Duration: 420–700ms. Run once and stop.

### 20.3 Image window parallax

Hero project previews may move 4–8px relative to their pastel surfaces during pointer movement. Only enable on fine-pointer devices and cap updates through `requestAnimationFrame`.

### 20.4 Soft spotlight

An active project card may receive a low-opacity radial color wash behind it. The wash must use the project category color below 12% opacity.

### 20.5 View transition

Use the View Transitions API as progressive enhancement for:

- Project card → expanded card
- Expanded card → project runner
- Filtered grid rearrangement

All states must work without the API.

### Effects that are prohibited

- Animated rainbow borders
- Neon glow around body text
- Cursor particle trails
- Scroll-jacking
- Continuous 3D tilt
- Autoplay sound
- Flashing backgrounds
- Large glass panels
- Decorative loading delays

## 21. Responsive Behavior

### Breakpoints

```text
Mobile: < 640px
Large mobile: 640–767px
Tablet: 768–1023px
Desktop: 1024–1439px
Wide: >= 1440px
```

### Mobile rules

- Hero becomes one column
- Headline remains first; collage follows
- Hide background registration marks
- Reduce Idea Marks to one per viewport
- Cards stack vertically
- Expanded project card becomes a bottom sheet/full-screen dialog
- Filter dropdowns move into a bottom sheet
- Runner uses edge-to-edge project content
- Minimum tap target: 44px

### Tablet rules

- Hero may use a 5/7 or stacked layout depending on available height
- Project grid uses two columns
- Category chips may scroll horizontally
- Expanded project card remains two-column only above 900px

### Large-screen rules

- Do not stretch reading content beyond 1440px
- Increase negative space rather than card count
- Ambient shapes may occupy outer gutters
- Grid remains three columns unless an intentional featured layout is used

## 22. Image and Cover Guidance

Project covers should:

- Show the actual project or a faithful captured preview
- Use a consistent export ratio per grid context
- Remain understandable without tiny UI text
- Avoid generic AI illustrations when a real project screenshot exists
- Use manually uploaded covers when automatic capture fails

Image treatment:

- `object-fit: cover`
- 2–3% hover zoom maximum
- Do not apply universal color filters
- Use an optional subtle canvas-colored overlay only to improve text contrast
- Provide meaningful alt text

## 23. Accessibility

- Meet WCAG 2.2 AA for public interfaces
- Keyboard users can open, close, and launch projects
- Expanded card traps focus and restores it to the originating card
- Escape closes the topmost temporary layer
- Visible focus rings must never be removed
- Tags and color categories include text labels
- All animation respects reduced-motion preferences
- Provide captions/transcripts for project media where applicable
- Avoid text embedded permanently inside cover images
- Announce filter result changes through a polite live region
- Fullscreen changes are announced to assistive technology

## 24. Performance Budget

Visual richness must not make the gallery feel slow.

- Hero cover images: optimized AVIF/WebP with responsive sizes
- Largest Contentful Paint target: under 2.5s on a typical school connection
- Cumulative Layout Shift target: under 0.1
- Avoid more than three simultaneous ambient animations
- Animate transform and opacity, not layout properties
- Pause offscreen animation
- Lazy-load below-fold project covers
- Provide static poster frames for video previews
- Do not ship a large animation library for effects achievable in CSS

## 25. Layering and Z-index

```text
0   Page canvas
10  Decorative background
20  Standard content
30  Sticky navigation
40  Dropdowns and tooltips
50  Expanded-card veil
60  Expanded project card
70  Toasts and transient notices
80  Mobile filter sheet
90  Critical confirmation dialog
100 Fullscreen hint
```

Decorative layers must use `pointer-events: none`.

## 26. Design Tokens Starter

```css
:root {
  --canvas: #fbfaf7;
  --canvas-pure: #fff;
  --ink: #111;
  --ink-soft: #3f3f3a;
  --muted: #77766f;
  --line: #dad8d0;

  --lime: #ddf27a;
  --violet: #c8b6ff;
  --coral: #ff8a72;
  --mint: #bfe8cf;
  --blue: #a9ddf5;
  --yellow: #f8e7a2;
  --pink: #f2c9dc;

  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-pill: 999px;

  --motion-instant: 100ms;
  --motion-fast: 160ms;
  --motion-standard: 240ms;
  --motion-layout: 320ms;
  --motion-expressive: 420ms;
  --motion-hero: 700ms;
  --motion-ambient: 18000ms;

  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-standard: cubic-bezier(.2, .8, .2, 1);
  --ease-spring: cubic-bezier(.16, 1.25, .3, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
}
```

## 27. Intensity Controls

The system can become more playful or formal without changing its architecture.

### Current baseline: Balanced

- 2–3 Idea Marks per desktop viewport
- Medium hero collage motion
- One pastel surface per project card
- Technical grid visible only in hero and filters
- Shared-element project transitions enabled

### More playful

- Add one extra Idea Mark per major section
- Increase hero card offset up to 2deg
- Use slightly larger pastel background shapes
- Allow a short spring response on filter chips
- Never increase ambient motion speed

### More formal

- Reduce doodles by 50%
- Keep cards level
- Use more white and soft-stone surfaces
- Replace hard hover shadow with a thin border change
- Retain shared-element transitions for clarity

## 28. Do and Don’t

### Do

- Let real student projects dominate
- Use pastel surfaces as organization, not decoration alone
- Keep metadata short and scannable
- Use mono text to signal technical information
- Make project launch and return paths obvious
- Animate state changes with purpose
- Preserve the same visual grammar across Home and All Projects
- Simplify the shell when a project is running

### Don’t

- Copy Figma brand marks, fonts, or exact layouts
- Turn the site into a generic card dashboard
- Put every available field on the project card
- Use robots, brains, or circuit patterns as generic AI decoration
- Apply gradients and glass effects indiscriminately
- Let animation delay interaction
- Make every project card a different component structure
- Hide essential navigation inside experimental gestures

## 29. Content Rules

- Use direct, plain English
- Project descriptions: maximum 180 characters in expanded cards
- Project title: target maximum 42 characters
- Student display name: approved English name or approved public display name
- Class format: `Grade 10 · Class A`
- Technology format: `HTML · CSS · JavaScript`
- Tags: nouns, uppercase, maximum four in expanded cards
- Avoid commercial language such as “customers,” “conversion,” “pricing,” or “industry-leading”

## 30. Validation Checklist

Before approving a page:

### Visual identity

- [ ] The page feels like Idea Playground, not a generic SaaS template
- [ ] Student project imagery is the strongest visual content
- [ ] No more than three workshop colors dominate the viewport
- [ ] Idea Marks are sparse and intentional
- [ ] Technical grid details do not interfere with reading

### Information hierarchy

- [ ] The main action is obvious within three seconds
- [ ] Standard cards remain concise
- [ ] Expanded cards show only essential project information
- [ ] Project runner provides a clear way back

### Motion

- [ ] Motion explains a state change or adds quiet atmosphere
- [ ] No interaction waits for decorative animation
- [ ] Reduced-motion behavior is implemented
- [ ] Offscreen ambient animation pauses

### Interaction

- [ ] Keyboard focus is visible
- [ ] Dialog focus is trapped and restored
- [ ] Filter results are announced
- [ ] Mobile tap targets meet 44px minimum

### Performance

- [ ] Covers are responsive and optimized
- [ ] Below-fold media is lazy-loaded
- [ ] Layout does not shift during image loading
- [ ] Transform/opacity are used for animation

## 31. Handoff Prompt for Future Implementation

Use the following summary when asking a design or coding agent to extend the site:

```text
Build within the AI Workshop Hub “Idea Playground” design system.
Use a warm paper canvas, strong black editorial typography, pastel project surfaces,
sparse hand-drawn Idea Marks, and restrained technical grid details. Student project
imagery must remain the focus. Standard project cards stay concise; clicking a card
opens one shared-element expanded card containing only description, student, class,
technologies, tags, and View Project. Motion should feel like light paper pieces being
placed on a workbench: fast, springy, and settled. Respect reduced motion, keyboard
navigation, WCAG AA contrast, and the performance budget in DESIGN.md.
```

## 32. Final Identity Statement

AI Workshop Hub is a **living student project gallery**. Its canvas is bright and open, its cards are playful and tactile, its details are technically precise, and its motion makes ideas feel newly alive. The system should leave visitors thinking:

> “Students made these—and I want to explore what each one can do.”
