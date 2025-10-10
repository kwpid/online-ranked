# Design Guidelines: Gaming Social Platform

## Design Approach
**Reference-Based: Rocket League-Inspired Gaming UI**
- Drawing from Rocket League's modern gaming interface design language
- Dark, sleek, minimalistic aesthetic optimized for gaming environments
- Bottom-left navigation pattern following competitive gaming conventions
- Focus on clean layouts with strategic use of glows and depth

## Core Design Elements

### A. Color Palette
**Dark Mode Primary (Gaming Optimized)**
- Background Base: 220 15% 8% (deep charcoal)
- Surface: 220 15% 12% (elevated dark panels)
- Surface Hover: 220 15% 18% (interactive surfaces)
- Border: 220 12% 25% (subtle divisions)

**Accent Colors**
- Primary Blue: 210 90% 55% (energetic gaming blue)
- Success Green: 142 70% 45% (online status, confirmations)
- Warning Orange: 25 85% 55% (notifications, alerts)
- Danger Red: 0 75% 50% (kick, remove actions)
- Neutral Gray: 220 10% 60% (secondary text)

**Text Hierarchy**
- Primary Text: 0 0% 95% (main content)
- Secondary Text: 220 10% 65% (supporting info)
- Disabled: 220 10% 40% (inactive states)

### B. Typography
**Font Stack**
- Primary: 'Inter', -apple-system, system-ui, sans-serif
- Display/Headers: 'Rajdhani', 'Inter', sans-serif (gaming aesthetic, uppercase for buttons)

**Type Scale**
- Display (Usernames/Headers): text-2xl to text-4xl, font-bold, uppercase tracking-wide
- Body (Display names): text-base to text-lg, font-medium
- Small (Status/Activity): text-sm, font-normal
- Tiny (Meta info): text-xs, font-normal

### C. Layout System
**Spacing Primitives: 2, 4, 6, 8, 12, 16, 20, 24 units**
- Tight spacing: gap-2, p-2 (compact UI elements)
- Standard spacing: gap-4, p-4 (most components)
- Generous spacing: gap-8, p-8 (section separation)

**Grid Structure**
- Main container: Full viewport with strategic anchor points
- Bottom-left nav: Fixed position, gap-3 vertical stack
- Center stage: Flex center for player cards with gap-6
- Right sidebar: Fixed width 400px popup with backdrop

### D. Component Library

**Navigation Buttons (Bottom-Left)**
- Style: Uppercase, font-bold, px-8 py-3, rounded-lg
- Background: Semi-transparent with backdrop-blur-sm
- Border: 2px solid with opacity-30
- Disabled state: Reduced opacity-40 with cursor-not-allowed
- Enabled hover: Border glow effect, slight scale transform

**Player Cards (Center)**
- Container: Rounded-2xl with border-2
- Local player: Larger scale (1.2x), enhanced glow
- Party members: Standard size with subtle borders
- PFP: Circular with border-4, size-20 to size-32
- Display name: Below PFP, text-lg font-semibold

**Popups/Modals**
- Backdrop: backdrop-blur-sm with bg-black/50
- Content: Rounded-xl, border, shadow-2xl
- Header: Border-b with pb-4 mb-4
- Actions: Flex justify-end gap-3

**Friends Sidebar (Right)**
- Width: w-96, slide-in animation from right
- Tabs: Horizontal scroll if needed, border-b active indicator
- Friend items: Hover bg-surface, cursor-pointer, flex items-center gap-3
- Dropdowns: Absolute positioned, shadow-xl, rounded-lg

**Profile/Settings Popups**
- Centered modal with max-w-2xl
- Form inputs: Rounded-lg, border-2, focus ring with primary color
- Avatar upload: Circular preview with overlay on hover
- Save buttons: Primary color, full width or justify-end

**Notifications Badge**
- Absolute positioned on friends icon
- Rounded-full, size-5, bg-warning with text-xs
- Animate pulse for new notifications

### E. Interaction & Animation
**Minimal, Performance-Focused**
- Button hovers: Subtle scale (1.02) and border glow in 150ms
- Sidebar slide: translate-x with 300ms ease-out
- Player card entry: Fade-in with scale from 0.95
- Dropdown menus: Opacity and translateY 200ms
- Loading states: Subtle pulse animation

**No Excessive Effects**
- Avoid parallax, complex scroll animations
- Use strategic glow/shadow for depth only
- Keep transitions snappy (< 300ms)

## Component Specifications

### Main Menu Layout
- Full viewport height with strategic anchoring
- Bottom-left: Stacked buttons with gap-3, 20px from edges
- Center: Flex-centered player card grid with gap-6
- Top-right: Friend icon with notification badge
- Background: Subtle radial gradient from center

### Friends System UI
- 6-tab navigation with border-b-2 active state
- Scrollable content area with gap-2 friend items
- Online indicator: size-2 rounded-full, absolute on PFP
- Activity text: Truncate with max-w-[180px]
- Search/Add: Sticky top with border-b

### Party System
- Party leader: Crown icon next to PFP
- Member actions: Dropdown on click with blur backdrop
- Invite notification: Toast-style, top-right, auto-dismiss 5s
- Join/Leave: Smooth re-arrangement with 300ms transition

### Profile Customization
- Current avatar: size-32 rounded-full
- Display name input: Focus ring, real-time preview
- Change limit indicator: Text-sm with countdown if < 7 days
- Title/Banner: Disabled state with "Coming Soon" overlay

### Settings Panel
- Username change: Warning text about once-per-week limit
- Friend settings: Toggle switches for privacy options
- Party settings: Dropdown selects for invitation permissions
- Save button: Disabled until changes detected

## Images
**No hero images required** - this is a gaming application focused on functionality and real-time UI. All visual elements are UI-based with user profile pictures providing the only imagery content.