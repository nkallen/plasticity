const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const path = require('path');

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
    include: [
        path.resolve(__dirname, "src/css"),
    ],
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
    test: /\.less$/,
    include: [
        path.resolve(__dirname, "src/components"),
    ],
    use: [
        {
            loader: 'css-loader',
        },
        {
            loader: 'less-loader',
        },
    ],
});

rules.push({
    test: /\.(png|jpg|svg|jpeg|gif)$/i,
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
        __dirname: true,
    },
    module: {
        rules,
    },
    plugins: plugins,
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css']
    },
};
