const theme = require(`./src/startup/default-theme`);

module.exports = {
    content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
    theme: {
        colors: {
            viewport: `var(--viewport, ${theme.colors.viewport})`,
            grid: `var(--grid, ${theme.colors.grid})`,
            dialog: `var(--dialog, ${theme.colors.dialog})`,
            matcap: `var(--matcap, ${theme.colors.matcap})`,
            black: `#000000`,
            white: `#ffffff`,
            transparent: `transparent`,
            neutral: {
                50: `var(--neutral-50, ${theme.colors.neutral[50]})`,
                100: `var(--neutral-100, ${theme.colors.neutral[100]})`,
                200: `var(--neutral-200, ${theme.colors.neutral[200]})`,
                300: `var(--neutral-300, ${theme.colors.neutral[300]})`,
                400: `var(--neutral-400, ${theme.colors.neutral[400]})`,
                500: `var(--neutral-500, ${theme.colors.neutral[500]})`,
                600: `var(--neutral-600, ${theme.colors.neutral[600]})`,
                700: `var(--neutral-700, ${theme.colors.neutral[700]})`,
                800: `var(--neutral-800, ${theme.colors.neutral[800]})`,
                900: `var(--neutral-900, ${theme.colors.neutral[900]})`,
            },
            accent: {
                50: `var(--accent-50,   ${theme.colors.accent[50]})`,
                100: `var(--accent-100, ${theme.colors.accent[100]})`,
                200: `var(--accent-200, ${theme.colors.accent[200]})`,
                300: `var(--accent-300, ${theme.colors.accent[300]})`,
                400: `var(--accent-400, ${theme.colors.accent[400]})`,
                500: `var(--accent-500, ${theme.colors.accent[500]})`,
                600: `var(--accent-600, ${theme.colors.accent[600]})`,
                700: `var(--accent-700, ${theme.colors.accent[700]})`,
                800: `var(--accent-800, ${theme.colors.accent[800]})`,
                900: `var(--accent-900, ${theme.colors.accent[900]})`,
            },
            supporting: {
                50: `var(--supporting-50,   ${theme.colors.supporting[50]})`,
                100: `var(--supporting-100, ${theme.colors.supporting[100]})`,
                200: `var(--supporting-200, ${theme.colors.supporting[200]})`,
                300: `var(--supporting-300, ${theme.colors.supporting[300]})`,
                400: `var(--supporting-400, ${theme.colors.supporting[400]})`,
                500: `var(--supporting-500, ${theme.colors.supporting[500]})`,
                600: `var(--supporting-600, ${theme.colors.supporting[600]})`,
                700: `var(--supporting-700, ${theme.colors.supporting[700]})`,
                800: `var(--supporting-800, ${theme.colors.supporting[800]})`,
                900: `var(--supporting-900, ${theme.colors.supporting[900]})`,
            },
            red: {
                50: `var(--red-50,   ${theme.colors.red[50]})`,
                100: `var(--red-100, ${theme.colors.red[100]})`,
                200: `var(--red-200, ${theme.colors.red[200]})`,
                300: `var(--red-300, ${theme.colors.red[300]})`,
                400: `var(--red-400, ${theme.colors.red[400]})`,
                500: `var(--red-500, ${theme.colors.red[500]})`,
                600: `var(--red-600, ${theme.colors.red[600]})`,
                700: `var(--red-700, ${theme.colors.red[700]})`,
                800: `var(--red-800, ${theme.colors.red[800]})`,
                900: `var(--red-900, ${theme.colors.red[900]})`
            },
            green: {
                50: `var(--green-50,   ${theme.colors.green[50]})`,
                100: `var(--green-100, ${theme.colors.green[100]})`,
                200: `var(--green-200, ${theme.colors.green[200]})`,
                300: `var(--green-300, ${theme.colors.green[300]})`,
                400: `var(--green-400, ${theme.colors.green[400]})`,
                500: `var(--green-500, ${theme.colors.green[500]})`,
                600: `var(--green-600, ${theme.colors.green[600]})`,
                700: `var(--green-700, ${theme.colors.green[700]})`,
                800: `var(--green-800, ${theme.colors.green[800]})`,
                900: `var(--green-900, ${theme.colors.green[900]})`
            },
            blue: {
                50: `var(--blue-50,   ${theme.colors.blue[50]})`,
                100: `var(--blue-100, ${theme.colors.blue[100]})`,
                200: `var(--blue-200, ${theme.colors.blue[200]})`,
                300: `var(--blue-300, ${theme.colors.blue[300]})`,
                400: `var(--blue-400, ${theme.colors.blue[400]})`,
                500: `var(--blue-500, ${theme.colors.blue[500]})`,
                600: `var(--blue-600, ${theme.colors.blue[600]})`,
                700: `var(--blue-700, ${theme.colors.blue[700]})`,
                800: `var(--blue-800, ${theme.colors.blue[800]})`,
                900: `var(--blue-900, ${theme.colors.blue[900]})`
            },
            yellow: {
                50: `var(--yellow-50,   ${theme.colors.yellow[50]})`,
                100: `var(--yellow-100, ${theme.colors.yellow[100]})`,
                200: `var(--yellow-200, ${theme.colors.yellow[200]})`,
                300: `var(--yellow-300, ${theme.colors.yellow[300]})`,
                400: `var(--yellow-400, ${theme.colors.yellow[400]})`,
                500: `var(--yellow-500, ${theme.colors.yellow[500]})`,
                600: `var(--yellow-600, ${theme.colors.yellow[600]})`,
                700: `var(--yellow-700, ${theme.colors.yellow[700]})`,
                800: `var(--yellow-800, ${theme.colors.yellow[800]})`,
                900: `var(--yellow-900, ${theme.colors.yellow[900]})`
            }
        },
        extend: {
            minHeight: (theme) => ({
                ...theme(`spacing`),
            }),
            spacing: {
                'icon': '18px',
            }
        }
    },
    plugins: [],
}
