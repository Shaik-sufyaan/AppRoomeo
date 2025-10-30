/**
 * Chat Color System for Share & Split Chat Interface
 * Based on the specification in My_improvised_chat.md
 */

export const chatColors = {
  // =====================================================
  // PRIMARY TEAL PALETTE (Lighter Shades)
  // =====================================================
  tealLight: '#8cc5c5',    // Header, background gradient start (lighter)
  tealMedium: '#6ba8a8',   // Mid-gradient, secondary elements (lighter)
  tealDark: '#4a8585',     // Deep gradient, text color, borders (lighter)

  // =====================================================
  // ACCENT COLORS
  // =====================================================
  accentGreen: '#6dd5b1',  // CTA buttons, sent messages, primary actions
  successGreen: '#4db896', // Gradient end, active states

  // =====================================================
  // BACKGROUND
  // =====================================================
  // Gradient: linear-gradient(180deg, #8cc5c5 0%, #6ba8a8 50%, #4a8585 100%)
  backgroundGradientStart: '#8cc5c5',
  backgroundGradientMid: '#6ba8a8',
  backgroundGradientEnd: '#4a8585',

  // =====================================================
  // MESSAGE BUBBLES
  // =====================================================
  receivedBubble: 'rgba(255, 255, 255, 0.95)',
  sentMessageGradientStart: '#6dd5b1',
  sentMessageGradientEnd: '#4db896',

  // =====================================================
  // TEXT COLORS
  // =====================================================
  onLightBackground: '#2d5555',      // Text on white/light backgrounds
  onDarkBackground: '#ffffff',        // Text on dark/colored backgrounds
  secondaryText: '#5a9a9a',           // Secondary text
  tertiaryText: 'rgba(255, 255, 255, 0.6)', // Tertiary text
  mutedText: '#b3d9d9',               // Muted/disabled text

  // =====================================================
  // SHADOWS
  // =====================================================
  shadowSubtle: '0 2px 8px rgba(0, 0, 0, 0.15)',
  shadowMedium: '0 4px 12px rgba(0, 0, 0, 0.2)',
  shadowAccentGlow: '0 4px 12px rgba(109, 213, 177, 0.4)',
  shadowHoverGlow: '0 4px 15px rgba(109, 213, 177, 0.6)',

  // =====================================================
  // BORDERS
  // =====================================================
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.2)',
  borderDark: 'rgba(255, 255, 255, 0.3)',
  splitBorder: 'rgba(93, 154, 154, 0.2)',

  // =====================================================
  // OVERLAY & BACKDROP
  // =====================================================
  overlayDark: 'rgba(0, 0, 0, 0.2)',
  overlayLight: 'rgba(255, 255, 255, 0.15)',
  overlayMedium: 'rgba(255, 255, 255, 0.95)',

  // =====================================================
  // QUICK ACTIONS
  // =====================================================
  quickActionBackground: 'rgba(255, 255, 255, 0.15)',
  quickActionBorder: 'rgba(255, 255, 255, 0.2)',
  quickActionHoverBackground: 'rgba(109, 213, 177, 0.3)',

  // =====================================================
  // INPUT FIELD
  // =====================================================
  inputBackground: 'rgba(255, 255, 255, 0.95)',
  inputBorder: 'rgba(255, 255, 255, 0.3)',
  inputFocusBorder: '#6dd5b1',
  inputFocusGlow: 'rgba(109, 213, 177, 0.2)',

  // =====================================================
  // ONLINE INDICATOR
  // =====================================================
  onlineIndicator: '#6dd5b1',
  onlinePulseFrom: 'rgba(16, 185, 129, 0.7)',
  onlinePulseTo: 'rgba(16, 185, 129, 0)',
};

export const chatSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 32,
};

export const chatBorderRadius = {
  small: 4,     // Message bubble corners - directional
  medium: 12,   // Payment card elements
  large: 16,    // Cards
  xlarge: 18,   // Message bubbles
  xxlarge: 20,  // Input field, badges
  circle: 50,   // Avatars, buttons (use 50 as percentage)
};

export const chatTypography = {
  userName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  userStatus: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 21, // 1.4 * 15
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400' as const,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quickAction: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  paymentInfo: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
};
