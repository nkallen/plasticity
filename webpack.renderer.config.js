const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

rules.push({
    test: /\.css$/,
    use: [
        {
            loader: 'style-loader',
        },
        {
            loader: 'css-loader',
        },
    ],
});

rules.push({
    test: /\.less$/,
    use: [
        {
            loader: 'style-loader',
        },
        {
            loader: 'css-loader',
        },
        {
            loader: 'less-loader',
        },
    ],
});

rules.push({
    test: /\.(png|jpg|svg|jpeg|gif|exr)$/i,
    use: [
        {
            loader: 'file-loader',
            options: {
                name: 'img/[name].[ext]',
                publicPath: '../.'
            }
        },
    ],
});

const libraries = [];
if (process.platform == "darwin") libraries.push({ from: "build/Release/libc3d.dylib", to: "[name][ext]" });
if (process.platform == "win32") libraries.push({ from: "build/Release/*.dll", to: "[name][ext]" });
plugins.push(
    new CopyPlugin({
        patterns: libraries,
    })
)

module.exports = {
    'node': {
        __dirname: false,
    },
    module: {
        rules,
    },
    plugins: plugins,
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: { keep_classnames: true }
        })],
    },
    devServer: {
        liveReload: false,
    },
};
