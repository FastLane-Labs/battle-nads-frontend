import { atom } from 'recoil';
import { BattleNad } from '../types/gameTypes';

export const characterState = atom<BattleNad | null>({
  key: 'characterState',
  default: null,
}); 