import { atom } from 'recoil';
import { Character } from '../types';

export const characterState = atom<Character | null>({
  key: 'characterState',
  default: null,
}); 