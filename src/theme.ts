import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Define your color mode config
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// Define your custom colors
const colors = {
  brand: {
    50: '#f0e4ff',
    100: '#cbb2ff',
    200: '#a480ff',
    300: '#7a4dff',
    400: '#521aff',
    500: '#3900e6',
    600: '#2900b3',
    700: '#1d0080',
    800: '#10004d',
    900: '#05001a',
  },
  background: '#0f0f1a',
};

// Define button styles
const components = {
  Button: {
    variants: {
      primary: {
        bg: 'brand.400',
        color: 'white',
        _hover: {
          bg: 'brand.500',
          boxShadow: 'lg',
        },
      },
    },
  },
};

// Extend the theme
const theme = extendTheme({ config, colors, components });

export default theme; 