import { calculateThreatLevel, getThreatColors } from '../threatLevel';

describe('calculateThreatLevel', () => {
  it('should handle number inputs correctly', () => {
    // Level 5 vs current 10 = -5 difference = low threat
    expect(calculateThreatLevel(10, 5)).toEqual({
      level: 'low',
      levelDifference: 5
    });
    
    // Level 8 vs current 10 = -2 difference = equal threat
    expect(calculateThreatLevel(10, 8)).toEqual({
      level: 'equal',
      levelDifference: 2
    });
    
    // Level 15 vs current 10 = +5 difference = high threat  
    expect(calculateThreatLevel(10, 15)).toEqual({
      level: 'high',
      levelDifference: 5
    });
    
    // Level 25 vs current 10 = +15 difference = extreme threat
    expect(calculateThreatLevel(10, 25)).toEqual({
      level: 'extreme',
      levelDifference: 15
    });
  });

  it('should handle BigInt inputs correctly', () => {
    expect(calculateThreatLevel(10n, 5n)).toEqual({
      level: 'low',
      levelDifference: 5
    });
    
    expect(calculateThreatLevel(BigInt(10), BigInt(8))).toEqual({
      level: 'equal',
      levelDifference: 2
    });
  });

  it('should handle mixed BigInt and number inputs', () => {
    expect(calculateThreatLevel(10, 5n)).toEqual({
      level: 'low',
      levelDifference: 5
    });
    
    expect(calculateThreatLevel(10n, 8)).toEqual({
      level: 'equal',
      levelDifference: 2
    });
  });
});

describe('getThreatColors', () => {
  it('should return correct colors for each threat level', () => {
    expect(getThreatColors('low')).toEqual({
      text: 'text-green-300',
      border: 'border-green-500',
      bg: 'bg-green-900/30',
      chakraColor: 'green'
    });
    
    expect(getThreatColors('equal')).toEqual({
      text: 'text-gray-300',
      border: 'border-gray-500',
      bg: 'bg-gray-900/30',
      chakraColor: 'gray'
    });
    
    expect(getThreatColors('high')).toEqual({
      text: 'text-orange-300',
      border: 'border-orange-500',
      bg: 'bg-orange-900/30',
      chakraColor: 'orange'
    });
    
    expect(getThreatColors('extreme')).toEqual({
      text: 'text-red-300',
      border: 'border-red-500',
      bg: 'bg-red-900/30',
      chakraColor: 'red'
    });
  });
});