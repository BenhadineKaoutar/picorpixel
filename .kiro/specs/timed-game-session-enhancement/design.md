# Design Document

## Overview

This design implements a timed, sequential game session experience for the PicOrPixel game. The system transforms the current multi-image display into a focused, one-image-at-a-time challenge with immediate feedback, session timing, and comprehensive scoring. The design emphasizes smooth user experience, clear visual feedback, and engaging gameplay mechanics.

## Architecture

### Component Structure

```
GameSession (Container)
├── SessionTimer (Timer Display)
├── ImageDisplay (Current Challenge Image)
├── ActionButtons (Real/AI Generated)
├── FeedbackDisplay (Correct/Incorrect + Next Button)
└── FinalScoreDisplay (End Game Summary)
```

### State Management

The game session will use a centralized state management approach with the following key states:

- `sessionState`: 'playing' | 'feedback' | 'completed' | 'error'
- `currentImageIndex`: number (0-based index of current image)
- `userGuesses`: Array of guess results with timestamps
- `sessionStartTime`: timestamp for session timing
- `timeLimit`: configurable session duration (default: 5 minutes)
- `score`: running tally of correct guesses

### Data Flow

1. **Session Initialization**: Load challenge images, start timer, set first image
2. **Image Presentation**: Display single image with action buttons
3. **Guess Processing**: Record guess, show feedback, prepare next image
4. **Navigation**: Handle "Next" button to advance through images
5. **Session Completion**: Calculate final score, display results

## Components and Interfaces

### SessionTimer Component

**Purpose**: Display and manage session timing

**Props**:
```typescript
interface SessionTimerProps {
  startTime: number;
  timeLimit: number;
  onTimeExpired: () => void;
  isActive: boolean;
}
```

**Features**:
- Countdown display (MM:SS format)
- Visual warning when time is low (< 1 minute)
- Automatic session end when time expires
- Pause/resume capability for error handling

### ImageDisplay Component

**Purpose**: Present individual challenge images with loading states

**Props**:
```typescript
interface ImageDisplayProps {
  imageUrl: string;
  imageId: string;
  onImageLoaded: () => void;
  onImageError: () => void;
}
```

**Features**:
- Responsive image sizing for mobile/desktop
- Loading spinner with 3-second timeout
- Error handling with skip option
- Smooth transitions between images

### ActionButtons Component

**Purpose**: Handle player classification choices

**Props**:
```typescript
interface ActionButtonsProps {
  onGuess: (guess: 'real' | 'ai') => void;
  disabled: boolean;
}
```

**Features**:
- Large, touch-friendly buttons
- Visual feedback on press
- Disabled state during feedback display
- Accessibility support (keyboard navigation)

### FeedbackDisplay Component

**Purpose**: Show immediate feedback and navigation

**Props**:
```typescript
interface FeedbackDisplayProps {
  isCorrect: boolean;
  correctAnswer: 'real' | 'ai';
  currentScore: number;
  remainingImages: number;
  onNext: () => void;
}
```

**Features**:
- Color-coded feedback (green/red)
- Correct answer revelation
- Progress indicators
- Prominent "Next" button

### FinalScoreDisplay Component

**Purpose**: Comprehensive end-game summary

**Props**:
```typescript
interface FinalScoreDisplayProps {
  totalCorrect: number;
  totalImages: number;
  timeUsed: number;
  accuracy: number;
  performanceRating: string;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}
```

**Features**:
- Score breakdown with percentages
- Time performance metrics
- Performance rating calculation
- Social sharing options
- Navigation to leaderboard or replay

## Data Models

### GameSession Model

```typescript
interface GameSession {
  id: string;
  challengeId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  timeLimit: number;
  images: ChallengeImage[];
  guesses: PlayerGuess[];
  finalScore?: SessionScore;
  status: 'active' | 'completed' | 'expired' | 'abandoned';
}
```

### PlayerGuess Model

```typescript
interface PlayerGuess {
  imageId: string;
  guess: 'real' | 'ai';
  correctAnswer: 'real' | 'ai';
  isCorrect: boolean;
  timestamp: number;
  responseTime: number; // milliseconds from image display to guess
}
```

### SessionScore Model

```typescript
interface SessionScore {
  totalCorrect: number;
  totalImages: number;
  accuracy: number; // percentage
  timeUsed: number; // seconds
  averageResponseTime: number; // milliseconds
  performanceRating: 'excellent' | 'good' | 'fair' | 'needs-practice';
  rank?: number; // compared to daily players
}
```

## Error Handling

### Image Loading Failures

- **Timeout Handling**: 3-second loading timeout with skip option
- **Network Errors**: Retry mechanism with fallback to skip
- **Graceful Degradation**: Continue session with remaining images

### Session Interruptions

- **Network Disconnection**: Pause timer, show reconnection UI
- **Browser Refresh**: Attempt session recovery from localStorage
- **Unexpected Errors**: Save progress, offer session restart

### Data Persistence Failures

- **Save Retry Logic**: Exponential backoff for failed save attempts
- **Local Backup**: Store session data locally until successful sync
- **User Notification**: Clear messaging about save status

## Testing Strategy

### Unit Testing

- **Component Isolation**: Test each component with mock props
- **State Management**: Verify state transitions and data flow
- **Timer Logic**: Test countdown, expiration, and pause/resume
- **Score Calculation**: Validate accuracy and performance metrics

### Integration Testing

- **Session Flow**: Complete gameplay from start to finish
- **Error Scenarios**: Network failures, timeouts, invalid data
- **Cross-Browser**: Mobile Safari, Chrome, Firefox compatibility
- **Performance**: Image loading times, transition smoothness

### User Experience Testing

- **Mobile Responsiveness**: Touch interactions, screen sizes
- **Accessibility**: Screen reader support, keyboard navigation
- **Performance**: Loading times, smooth animations
- **Edge Cases**: Very fast/slow players, connection issues

## Performance Considerations

### Image Optimization

- **Preloading**: Load next image while current is displayed
- **Compression**: Optimize images for web delivery
- **Caching**: Browser caching for repeated sessions
- **Progressive Loading**: Show low-res placeholder while loading

### State Management Efficiency

- **Minimal Re-renders**: Optimize React component updates
- **Memory Management**: Clean up timers and event listeners
- **Data Structures**: Efficient storage for session data
- **Network Requests**: Batch API calls where possible

### Mobile Performance

- **Touch Responsiveness**: Minimize touch delay
- **Battery Optimization**: Efficient timer implementation
- **Memory Usage**: Optimize for lower-end devices
- **Network Efficiency**: Minimize data usage

## Security Considerations

### Session Integrity

- **Server Validation**: Verify all guesses server-side
- **Timing Validation**: Prevent time manipulation
- **Score Verification**: Server-side score calculation
- **Session Tokens**: Secure session identification

### Data Protection

- **Input Sanitization**: Clean all user inputs
- **Rate Limiting**: Prevent session spam
- **Privacy**: Minimal data collection
- **Secure Storage**: Encrypted sensitive data

## Deployment Strategy

### Phased Rollout

1. **Phase 1**: Core session flow (image → guess → feedback → next)
2. **Phase 2**: Timer implementation and time-based features
3. **Phase 3**: Final score display and performance metrics
4. **Phase 4**: Advanced features (leaderboard integration, social sharing)

### Feature Flags

- **Timer Enable/Disable**: Control timer feature rollout
- **Score Display Options**: A/B test different score presentations
- **Performance Metrics**: Toggle advanced analytics
- **Error Handling**: Control error recovery mechanisms

### Monitoring

- **Session Completion Rates**: Track user engagement
- **Error Frequencies**: Monitor technical issues
- **Performance Metrics**: Loading times, response times
- **User Feedback**: In-app feedback collection
