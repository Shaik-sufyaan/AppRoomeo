# MyCrib - Roommate Finder App

A mobile application built with Expo/React Native for finding roommates, featuring chat, matching, marketplace, and expense tracking.

## Tech Stack

- **Frontend**: Expo Router + React Native
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Authentication**: Supabase Auth + Google OAuth
- **State Management**: React Query + Context API
- **UI**: Lucide React Native Icons

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Expo CLI**: `npm install -g expo-cli`
- **Supabase CLI** (optional for local development): `npm install -g supabase`

### For Mobile Development:
- **Android**: Android Studio with Android SDK
- **iOS**: Xcode (macOS only)
- **Expo Go** app on your mobile device (for quick testing)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Shaik-sufyaan/AppRoomeo.git
cd AppRoomeo
```

### 2. Install Dependencies

```bash
npm install
```

**Important**: If you encounter an error about `react-native-worklets-core`, run:

```bash
npm install react-native-worklets-core
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace with your actual Supabase project credentials from [supabase.com](https://supabase.com).

## Running the Project

### Start the Development Server

```bash
npm start
```

This will start the Expo development server.

### Run on Android

```bash
npm run android
```

**Requirements**: Android Studio installed with an emulator or physical device connected.

### Run on iOS (macOS only)

```bash
npm run ios
```

**Requirements**: Xcode installed with iOS Simulator.

### Run on Web

```bash
npm run web
```

### Using Expo Go App

1. Install **Expo Go** on your mobile device
2. Run `npm start`
3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## Supabase Setup

### Option 1: Use Existing Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env`
3. Run migrations (when available):
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

### Option 2: Local Development

```bash
# Initialize Supabase locally
supabase init

# Start local Supabase instance
supabase start

# Your local Supabase will be available at:
# API URL: http://localhost:54321
# Studio UI: http://localhost:54323
```

Update `.env` with local credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
```

## Project Structure

```
AppRoomeo/
├── app/                    # Expo Router pages
├── components/             # Reusable React components
├── contexts/              # React Context providers
├── types/                 # TypeScript type definitions
├── lib/                   # Utilities and API functions
├── supabase/              # Database migrations (when created)
├── assets/                # Images, fonts, etc.
└── package.json
```

## Common Issues & Fixes

### Issue: `Cannot find module 'react-native-worklets-core'`

**Solution**:
```bash
npm install react-native-worklets-core
```

### Issue: Metro bundler cache errors

**Solution**:
```bash
npx expo start --clear
```

### Issue: Peer dependency warnings

**Solution**:
The project uses specific overrides in `package.json`. If you encounter dependency conflicts, use:
```bash
npm install --legacy-peer-deps
```

### Issue: Android build fails

**Solution**:
```bash
cd android
./gradlew clean
cd ..
npx expo start --clear
```

### Issue: iOS build fails (macOS)

**Solution**:
```bash
cd ios
pod install
cd ..
npx expo start --clear
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device (macOS only)
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Features

- **User Profiles**: Create detailed profiles with preferences and lifestyle info
- **Matching System**: Swipe and browse potential roommates
- **Real-time Chat**: Message potential roommates instantly
- **Marketplace**: List and browse furniture and items
- **Expense Tracking**: Split and track shared expenses
- **Authentication**: Secure login with Supabase Auth

## Development Workflow

1. Make changes to the code
2. The app will hot-reload automatically
3. Test on your preferred platform
4. Commit and push changes:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

## Building for Production

### Android APK

```bash
eas build --platform android --profile preview
```

### iOS App

```bash
eas build --platform ios --profile preview
```

**Note**: You'll need to set up [Expo Application Services (EAS)](https://expo.dev/eas) for production builds.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using Expo and Supabase**
