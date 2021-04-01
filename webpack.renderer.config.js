const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

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
    test: /\.(png|jpg|jpeg|gif)$/i,
    use: [
        {
            loader: 'file-loader',
            options: {
                name: 'img/[name].[ext]'
            }
        },
    ],
});

rules.push({
    test: /\.svg$/,
    loader: 'svg-inline-loader'
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
