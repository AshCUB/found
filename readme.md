# Found Design System

A comprehensive vanilla CSS design system with custom fonts, color palette, and reusable components.

## Color Palette

- **Grey**: `#f2f2f2` - Default background color for all pages
- **Black**: `#000000` - Primary text color
- **Green**: `#5e7333` - Accent color for headings and primary actions
- **Dark Grey**: `#333333` - Secondary UI elements (buttons, etc.)
- **White**: `#ffffff` - Card backgrounds and content areas

## Typography

### Font Families

- **TAY Makawao** (`--font-primary`) - Used for titles and headings
- **PT Mono** (`--font-body`) - Used for paragraph text and body content
- **Roboto Slab** (`--font-buttons`) - Used for buttons and subtitles

### Typography Scale

- `--text-xs`: 12px
- `--text-sm`: 14px
- `--text-base`: 16px
- `--text-lg`: 18px
- `--text-xl`: 24px
- `--text-2xl`: 32px
- `--text-3xl`: 48px
- `--text-4xl`: 64px

## File Structure

```
Found/
├── css/
│   ├── fonts.css           # @font-face declarations
│   ├── variables.css       # CSS custom properties
│   ├── utilities.css       # Utility classes
│   ├── components.css      # Standard UI components
│   ├── app-components.css  # App-specific components
│   └── main.css            # Main entry point
├── fonts/
│   ├── TAYMakawaoRegular.otf
│   ├── pt-mono.regular.ttf
│   └── RobotoSlab-Regular.ttf
├── style.css               # Deprecated (imports main.css)
└── readme.md
```

## Usage

### Quick Start

Include the main CSS file in your HTML:

```html
<link rel="stylesheet" href="css/main.css">
```

Or use the deprecated style.css for backward compatibility:

```html
<link rel="stylesheet" href="style.css">
```

### Color Utilities

```html
<div class="bg-grey">Grey background</div>
<div class="bg-green text-white">Green background with white text</div>
<div class="text-black">Black text</div>
```

### Typography Utilities

```html
<h1 class="font-primary text-4xl text-green">Title in TAY Makawao</h1>
<p class="font-body text-base">Body text in PT Mono</p>
<button class="font-buttons text-lg">Button text in Roboto Slab</button>
```

### Spacing Utilities

```html
<div class="p-md">Medium padding</div>
<div class="m-lg">Large margin</div>
<div class="my-xl">Large vertical margin</div>
<div class="px-sm">Small horizontal padding</div>
```

### Layout Utilities

```html
<div class="flex flex-col items-center justify-center">
  <div>Centered content</div>
</div>

<div class="grid grid-cols-2 gap-md">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

## Components

### Standard UI Components

#### Button

```html
<button class="btn btn-primary btn-md">Primary Button</button>
<button class="btn btn-secondary btn-lg">Secondary Button</button>
<button class="btn btn-outline btn-sm">Outline Button</button>
```

Variants: `btn-primary`, `btn-secondary`, `btn-outline`
Sizes: `btn-sm`, `btn-md`, `btn-lg`

#### Card

```html
<div class="card card-elevated">
  <h2 class="font-primary text-2xl">Card Title</h2>
  <p class="font-body text-base">Card content goes here</p>
</div>
```

Variants: `card`, `card-elevated`, `card-flat`

#### Input

```html
<div class="form-group">
  <label>Email Address</label>
  <input type="email" class="input" placeholder="Enter your email">
</div>
```

#### Badge

```html
<span class="badge badge-primary">New</span>
<span class="badge badge-secondary">Info</span>
<span class="badge badge-outline">Tag</span>
```

#### Avatar

```html
<img src="avatar.jpg" class="avatar avatar-md" alt="User avatar">
```

Sizes: `avatar-sm`, `avatar-md`, `avatar-lg`, `avatar-xl`

#### Modal

```html
<div class="modal">
  <div class="modal-content">
    <div class="modal-header">Modal Title</div>
    <div class="modal-body">Modal content</div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

#### Dropdown

```html
<div class="dropdown">
  <button class="dropdown-trigger">Menu</button>
  <div class="dropdown-menu">
    <div class="dropdown-item">Option 1</div>
    <div class="dropdown-item">Option 2</div>
    <div class="dropdown-item">Option 3</div>
  </div>
</div>
```

#### Progress Bar

```html
<div class="progress">
  <div class="progress-bar" style="width: 75%"></div>
</div>
```

Sizes: `progress`, `progress-sm`, `progress-lg`

#### Table

```html
<table class="table table-striped">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

#### Divider

```html
<hr class="divider">
<div class="divider-vertical"></div>
```

#### Spinner

```html
<div class="spinner"></div>
<div class="spinner spinner-sm"></div>
<div class="spinner spinner-lg"></div>
```

### App-Specific Components

#### Splash Screen

```html
<div class="splash-screen">
  <h1 class="title">FOUND</h1>
  <p class="subtitle">reclaim the moment</p>
  <button class="action-button">start your journey</button>
</div>
```

#### Onboarding Screen

```html
<div class="onboarding-screen">
  <h2 class="header">Welcome</h2>
  <div class="content">
    <p>Your onboarding content goes here</p>
  </div>
  <div class="progress-indicator">
    <div class="progress-dot active"></div>
    <div class="progress-dot"></div>
    <div class="progress-dot"></div>
  </div>
  <div class="navigation">
    <button class="nav-button back">Back</button>
    <button class="nav-button next">Next</button>
  </div>
</div>
```

#### App Header

```html
<header class="app-header">
  <div class="logo">FOUND</div>
  <nav class="nav">
    <a href="#" class="nav-item active">Home</a>
    <a href="#" class="nav-item">About</a>
    <a href="#" class="nav-item">Contact</a>
  </nav>
</header>
```

#### App Footer

```html
<footer class="app-footer">
  <p class="copyright">© 2024 Found. All rights reserved.</p>
  <div class="links">
    <a href="#" class="link">Privacy</a>
    <a href="#" class="link">Terms</a>
    <a href="#" class="link">Support</a>
  </div>
</footer>
```

## CSS Variables

All design tokens are available as CSS custom properties for easy customization:

```css
:root {
  /* Colors */
  --color-grey: #f2f2f2;
  --color-black: #000000;
  --color-green: #5e7333;
  --color-dark-grey: #333333;
  --color-white: #ffffff;

  /* Fonts */
  --font-primary: 'TAY Makawao', sans-serif;
  --font-body: 'PT Mono', monospace;
  --font-buttons: 'Roboto Slab', serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Typography */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 48px;
  --text-4xl: 64px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties (CSS variables) supported
- @font-face with font-display: swap for better loading performance

## Notes

- Grey (#f2f2f2) is the default background color for all pages
- Override background color on specific pages by applying a different bg-* class
- Font files are located in the `fonts/` directory
- All components use the defined color palette and typography system
- Utility classes follow Tailwind-inspired naming conventions for familiarity