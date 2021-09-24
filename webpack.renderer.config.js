const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TerserPlugin = require("terser-webpack-plugin");

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
