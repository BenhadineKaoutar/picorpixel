import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  const challengeDate = new Date().toISOString().split('T')[0];

  return await reddit.submitCustomPost({
    splash: {
      // Compelling Splash Screen Configuration
      appDisplayName: 'PicOrPixel',
      backgroundUri: 'splash-background.svg',
      buttonLabel: '🎮 Play Now - Test Your Skills',
      description: 'Can you spot the difference between AI-generated images and real photographs? Challenge yourself with today\'s curated visual puzzle! 🔍 Examine images closely, make your choice, and compete with the community. Climb the leaderboards and become a master AI detector! New challenge every day.',
      heading: '🎯 Daily AI Detection Challenge',
      appIconUri: 'picorpixel-icon.svg',
    },
    postData: {
      gameState: 'initial',
      score: 0,
      challengeDate,
    },
    subredditName: subredditName,
    title: `🎮 PicOrPixel - Daily AI Detection Challenge • ${challengeDate}`,
  });
};
