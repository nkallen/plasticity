const path = require('path');

module.exports = [
    {
        test: /\.node$/,
        use: [
            { loader: path.resolve('node-loader.js') },
            {
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]'
                }
            },
        ],
    },
    {
        test: /\.dll|\.dylib/,
        use: [
            {
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]'
                }
            },
        ],
    },
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
            loader: 'ts-loader',
            options: {
                transpileOnly: true
            }
        }
    },
    {
        test: /\.m?js$/,
        exclude: /node_modules\/(?!(three)\/).*/,
        use: {
            loader: 'babel-loader',
            options: {
                presets: [
                    ['@babel/preset-env',
                        {
                            "targets": { "esmodules": true }
                        }
                    ]]
            }
        }
    }
];
