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
    test: /\.(png|jpg|svg|jpeg|gif)$/i,
    use: [
        {
            loader: 'file-loader',
            options: {
                name: 'img/[name].[ext]'
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
