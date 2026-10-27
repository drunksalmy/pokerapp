/**
 * Image assets for the table, made by the owner and prepared from the zip they
 * supplied: the four portraits were cut out of profile-page mockups, the empty
 * slot had its solid white inside made transparent, and everything was trimmed
 * to its visible edges. Card faces are still drawn in code -- only 5 of the 52
 * faces exist as images.
 */

import type { ImageSourcePropType } from 'react-native';

export const AvatarImages: ImageSourcePropType[] = [
  require('@/assets/poker/avatar-1.png'),
  require('@/assets/poker/avatar-2.png'),
  require('@/assets/poker/avatar-3.png'),
  require('@/assets/poker/avatar-4.png')
];

// The owner's portrait table background, cut 28px inside its mockup border so
// no lavender shows in its rounded corners. lib/poker.ts (TABLE_IMAGE) holds
// the measured rim circle the seats are laid on; keep the two in step.
export const TableBackgroundImage: ImageSourcePropType = require('@/assets/poker/table-bg.png');

export const CardBackImage: ImageSourcePropType = require('@/assets/poker/card-back.png');
export const CardSlotImage: ImageSourcePropType = require('@/assets/poker/card-slot.png');

// Blue for bets in front of a player, gold for your own bank, red for the pot.
export const ChipImages = {
  blue: require('@/assets/poker/chip-blue.png') as ImageSourcePropType,
  gold: require('@/assets/poker/chip-gold.png') as ImageSourcePropType,
  red: require('@/assets/poker/chip-red.png') as ImageSourcePropType
};

// Trimmed width/height of each chip image, so they can be sized by height.
export const ChipAspect = { blue: 1.402, gold: 0.93, red: 1.696 };

/**
 * Picture for a seat's portrait number, until real profile pictures arrive
 * with accounts (Phase 5). The server hands out the lowest number nobody at the
 * table is using, so the first four players always have different faces.
 */
export function avatarFor(avatar: number): ImageSourcePropType {
  return AvatarImages[Math.abs(avatar) % AvatarImages.length];
}
