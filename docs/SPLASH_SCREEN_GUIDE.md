# PicOrPixel Splash Screen Guide

## Overview

The PicOrPixel splash screen is the first thing users see when they encounter the game in their Reddit feed. It's designed to be visually compelling, clearly communicate the game's concept, and encourage users to click "Play Now" to start the challenge.

## Design Philosophy

### Visual Theme
The splash screen incorporates PicOrPixel's custom color palette:
- **Deep Red (#97051D)**: Primary brand color, represents AI detection challenge
- **Bright Red (#EF233C)**: Accent color for AI-generated content
- **Teal/Mint Green (#76BA9D)**: Represents real photographs
- **Dark Forest Green (#04361D)**: Background and depth
- **Light Cream (#F0F2D5)**: Text backgrounds and highlights

### Key Design Elements

1. **Gradient Background**: Rich gradient flowing through the game's color palette creates visual depth and interest
2. **AI vs Real Visualization**: Clear visual representation of the core game mechanic
3. **Circuit Pattern (AI)**: Represents digital/AI-generated content with glowing nodes
4. **Camera Icon (Real)**: Represents authentic photography with lens details
5. **Sample Challenge Preview**: Three image frames showing the gameplay concept
6. **Clear Call-to-Action**: Prominent button label and descriptive text

## Implementation

### File Structure

```
assets/
├── splash-background.svg      # Main splash screen background
├── picorpixel-icon.svg        # App icon displayed in splash
└── splash-background-alt.svg  # Alternative futuristic design

src/server/core/
└── post.ts                    # Splash screen configuration
```

### Splash Screen Configuration

The splash screen is configured in `src/server/core/post.ts`:

```typescript
splash: {
  appDisplayName: 'PicOrPixel',
  backgroundUri: 'splash-background.svg',
  buttonLabel: '🎮 Play Now - Test Your Skills',
  description: 'Can you spot the difference between AI-generated images and real photographs? Challenge yourself with today\'s curated visual puzzle! 🔍 Examine images closely, make your choice, and compete with the community. Climb the leaderboards and become a master AI detector! New challenge every day.',
  heading: '🎯 Daily AI Detection Challenge',
  appIconUri: 'picorpixel-icon.svg',
}
```

### Key Configuration Properties

- **appDisplayName**: The game's name displayed prominently
- **backgroundUri**: Path to the SVG background (relative to assets folder)
- **buttonLabel**: Text on the main action button (should be compelling and action-oriented)
- **description**: Detailed description that explains the game and motivates users to play
- **heading**: Short, punchy headline that captures attention
- **appIconUri**: Path to the app icon (256x256px recommended)

## Design Best Practices

### 1. Visual Hierarchy
- **Primary Focus**: Game title and concept
- **Secondary Focus**: Visual representation of gameplay
- **Tertiary Focus**: Call-to-action and details

### 2. Color Psychology
- **Red tones**: Create urgency and excitement
- **Green/Teal tones**: Represent authenticity and trust
- **Dark backgrounds**: Make colorful elements pop
- **Light text backgrounds**: Ensure readability

### 3. Mobile Optimization
- **Large touch targets**: Button should be easily tappable
- **Clear typography**: Text should be readable on small screens
- **Simplified graphics**: Avoid overly complex details that don't scale well
- **High contrast**: Ensure elements are distinguishable

### 4. Compelling Copy
- **Action-oriented**: Use verbs like "Test", "Challenge", "Compete"
- **Benefit-focused**: Highlight what users gain (skills, fun, competition)
- **Urgency**: Mention "Daily" to create FOMO (Fear of Missing Out)
- **Emojis**: Use sparingly for visual interest (🎮, 🔍, 🎯, 🏆)

## SVG Background Details

### Structure
The `splash-background.svg` file contains:

1. **Gradient Definitions**: Custom gradients using game colors
2. **Background Layer**: Full-screen gradient with dot pattern overlay
3. **Floating Elements**: Subtle geometric shapes for visual interest
4. **AI Section**: Circuit pattern with glowing nodes (left side)
5. **Real Section**: Camera icon with lens details (right side)
6. **Title Area**: Game name with color-coded text
7. **Challenge Preview**: Three sample image frames
8. **Call-to-Action**: Bottom hint text encouraging interaction
9. **Decorative Corners**: Subtle corner accents for polish

### SVG Filters Used
- **glow**: Soft glow effect for important elements
- **strongGlow**: Intense glow for focal points
- **shadow**: Drop shadow for depth and separation

### Responsive Considerations
- SVG scales perfectly to any screen size
- Text sizes are proportional to viewBox
- Elements positioned using percentages where possible
- Maintains aspect ratio across devices

## Testing the Splash Screen

### Local Testing
1. Run `npm run dev` to start the development server
2. Open the playtest URL provided in the terminal
3. The splash screen will appear in the Reddit feed
4. Click the "Play Now" button to verify it opens the game

### Visual Testing Checklist
- [ ] Background gradient displays correctly
- [ ] All text is readable and properly positioned
- [ ] Icons and graphics render clearly
- [ ] Button is prominent and inviting
- [ ] Colors match the game's palette
- [ ] Mobile view looks good (test in responsive mode)
- [ ] Tablet view looks good
- [ ] Desktop view looks good

### Copy Testing Checklist
- [ ] Heading is attention-grabbing
- [ ] Description clearly explains the game
- [ ] Button label is action-oriented
- [ ] No spelling or grammar errors
- [ ] Emojis enhance rather than distract
- [ ] Tone matches target audience

## Customization Guide

### Changing Colors
To update the color scheme, modify the gradient definitions in `assets/splash-background.svg`:

```xml
<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#YOUR_COLOR_1;stop-opacity:1" />
  <stop offset="50%" style="stop-color:#YOUR_COLOR_2;stop-opacity:1" />
  <stop offset="100%" style="stop-color:#YOUR_COLOR_3;stop-opacity:1" />
</linearGradient>
```

### Changing Copy
Update the splash configuration in `src/server/core/post.ts`:

```typescript
splash: {
  heading: 'Your New Heading',
  description: 'Your new description...',
  buttonLabel: 'Your Button Text',
}
```

### Using Alternative Design
To use the futuristic alternative design:

```typescript
splash: {
  backgroundUri: 'splash-background-alt.svg',
  // ... other properties
}
```

## Performance Considerations

### SVG Optimization
- Keep file size under 100KB for fast loading
- Use simple paths and shapes where possible
- Minimize the number of filters and effects
- Compress SVG using tools like SVGO if needed

### Loading Strategy
- SVG is loaded from the assets folder
- Cached by Reddit's CDN for fast subsequent loads
- No external dependencies or fonts required
- Renders immediately without additional HTTP requests

## Accessibility

### Screen Reader Support
- Ensure SVG has proper `<title>` and `<desc>` tags
- Use semantic HTML in description text
- Provide alt text for icon images

### Color Contrast
- Maintain WCAG AA contrast ratios (4.5:1 for normal text)
- Test with color blindness simulators
- Ensure text is readable on all backgrounds

### Keyboard Navigation
- Button should be keyboard accessible (handled by Reddit)
- Focus states should be visible
- Tab order should be logical

## Analytics & Optimization

### Metrics to Track
- **Click-through rate**: Percentage of users who click "Play Now"
- **Bounce rate**: Users who view but don't interact
- **Time to interaction**: How long users view before clicking
- **Device breakdown**: Mobile vs desktop engagement

### A/B Testing Ideas
- Different button labels ("Play Now" vs "Start Challenge" vs "Test Your Skills")
- Various color schemes
- Different emoji usage
- Heading variations
- Description length and tone

### Optimization Tips
- Test multiple versions with small user groups
- Analyze which elements draw the most attention
- Iterate based on engagement data
- Keep successful elements, test new variations

## Troubleshooting

### Common Issues

**Splash screen not displaying:**
- Verify `backgroundUri` path is correct
- Check that SVG file exists in assets folder
- Ensure SVG is valid XML (no syntax errors)
- Check browser console for loading errors

**Colors look wrong:**
- Verify hex color codes in SVG
- Check for color profile issues
- Test on multiple devices/browsers
- Ensure opacity values are correct

**Text is unreadable:**
- Increase font sizes
- Improve color contrast
- Add text backgrounds or shadows
- Simplify background patterns

**Button not working:**
- This is handled by Reddit's platform
- Verify post configuration is correct
- Check that game entry point is properly configured
- Test in playtest environment

## Resources

### Devvit Documentation
- [Splash Screen Guide](https://developers.reddit.com/docs/capabilities/server/splash-screen)
- [Custom Posts](https://developers.reddit.com/docs/capabilities/custom-posts)
- [Media Assets](https://developers.reddit.com/docs/capabilities/media)

### Design Tools
- [Figma](https://figma.com) - UI design and prototyping
- [SVG Editor](https://boxy-svg.com) - SVG creation and editing
- [Color Palette Generator](https://coolors.co) - Color scheme creation
- [Contrast Checker](https://webaim.org/resources/contrastchecker/) - Accessibility testing

### Inspiration
- Study successful Reddit game splash screens
- Analyze mobile game app store screenshots
- Review social media ad designs
- Examine landing page best practices

## Version History

### v1.0 (Current)
- Initial splash screen with game color palette
- AI vs Real visual representation
- Compelling copy and call-to-action
- Mobile-optimized design
- SVG-based for perfect scaling

### Future Enhancements
- Animated SVG elements (if supported by Reddit)
- Seasonal theme variations
- Dynamic text based on user stats
- Personalized messaging for returning players
- A/B tested variations

## Conclusion

The splash screen is your game's first impression and primary marketing tool on Reddit. Invest time in making it visually appealing, clearly communicative, and action-oriented. Test different variations, gather feedback, and continuously optimize based on engagement metrics.

Remember: A great splash screen can significantly increase your game's player base and community engagement!
