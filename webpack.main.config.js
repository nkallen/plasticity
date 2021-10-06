const rules = require('./webpack.rules');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    target: 'electron-main',
    'node': {
        __dirname: false,
        __filename: false,
    },
    /**
     * This is the main entry point for your application, it's the first file
     * that runs in the main process.
     */
    entry: './src/index.ts',
    // Put your normal webpack config below here
    module: {
        rules,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "src/dot-plasticity", to: "dot-plasticity" },
            ],
        }),
    ],
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.scss', '.sass']
    },
    devServer: {
        liveReload: false,
    },
};