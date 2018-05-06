/* eslint-disable */
const path = require('path');
const webpack = require('webpack');

const vendorLibs = [
    'react',
    'react-dom',
    'mobx',
    'mobx-react'
];

const host = process.env.NODE_ENV === 'production'
    ? 'https://kilogram-team2.now.sh' : 'http://localhost:8080';

const staticUrl = process.env.NODE_ENV === 'production'
    ? 'https://kilogram-team2.surge.sh' : 'http://localhost:8080';

console.info(host);

module.exports = {
    mode: process.env.NODE_ENV,
    entry: {
        index: path.join(__dirname, '/src/index.js'),
        vendor: vendorLibs
    },
    output: {
        filename: '[name].bundle.js',
        path: path.join(__dirname, 'dist')
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    chunks: 'initial',
                    name: 'vendor',
                    test: 'vendor',
                    enforce: true
                }
            }
        }
    },
    module: {
        rules: [
            {
                test: /worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: { inline: true }
                }
            },
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader'
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['react'],
                    plugins: ['transform-decorators-legacy',
                        'transform-class-properties']
                }
            },
            {
                test: /\.css$/,
                loader: 'style-loader'
            },
            {
                test: /\.css$/,
                loader: 'css-loader',
                query: {
                    modules: true
                }
            },
            {
                test: /\.svg$/,
                loader: 'svg-inline-loader'
            },
            {
                test: /\.(pdf|jpg|png|gif|svg|ico)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            name: '/assets/[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'fonts/',
                        publicPath: `${staticUrl}/fonts`
                    }}]
            }, {
                test: /\.mp3$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'sounds/'
                    }
                }]
            }
        ]
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.HOST': JSON.stringify(host),
            'process.env.STATIC': JSON.stringify(staticUrl)
        })
    ],

    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 9000
    },

    node: {
        fs: 'empty'
    }
};