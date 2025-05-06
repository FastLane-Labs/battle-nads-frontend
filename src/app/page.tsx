// This is a server component (no 'use client' directive)
import { Metadata } from 'next/types';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
  title: 'BattleNads | Web3 RPG Game on Monad',
  description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
  keywords: ['web3', 'RPG', 'blockchain game', 'Monad', 'BattleNads', 'play-to-earn', 'crypto gaming', 'fastlane', 'shmonad', 'shmon'],
  openGraph: {
    title: 'BattleNads | Web3 RPG Game on Monad',
    description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
    url: 'https://battlenads.com', 
    siteName: 'BattleNads',
    images: [
      {
        url: '/og/battlenads-og-image.png', 
        width: 1200,
        height: 630,
        alt: 'BattleNads Game Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BattleNads | Web3 RPG on Monad',
    description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
    images: ['/og/battlenads-og-image.png'],
    creator: '@0xFastLaneLabs',
  },
  authors: [{ name: 'FastLane Labs' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1A202C',
};

export default function HomePage() {
  return <ClientPage />;
} 