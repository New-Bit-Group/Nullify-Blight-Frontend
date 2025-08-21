require('dotenv').config();

const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const globAll = require('glob-all');
const CopyPlugin = require('copy-webpack-plugin');
const PagesPlugin = require('@budingxiaocai/pages-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const CompressionPlugin  = require('compression-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const swp = new SpeedMeasurePlugin();
const isDev = process.env.NODE_ENV === 'development';

const baseConfig = {
    entry: {},
    output: {
        filename: 'static/js/[name].[chunkhash:8].js',
        path: path.join(__dirname, 'dist'),
        clean: true,
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /.(ts|tsx)$/,
                include: [path.resolve(__dirname, 'src')],
                use: [
                    'thread-loader',
                    ({ resource }) => ({
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                resource.endsWith('.tsx') && '@babel/preset-react',
                                '@babel/preset-typescript'
                            ].filter(Boolean),
                            plugins: [
                                isDev && require.resolve('react-refresh/babel')
                            ].filter(Boolean)
                        }
                    })
                ]
            },
            {
                test: /.css$/,
                include: [path.resolve(__dirname, 'src')],
                use: [
                    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader'
                ]
            },
            {
                test: /.(png|jpg|jpeg|gif|svg)$/,
                generator: {
                    filename: 'static/images/[name].[contenthash:8][ext]'
                }
            },
            {
                test: /.(woff2?|eot|ttf|otf)$/,
                generator: {
                    filename: 'static/fonts/[name].[contenthash:8][ext]'
                }
            },
            {
                test: /.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
                generator: {
                    filename: 'static/media/[name].[contenthash:8][ext]'
                }
            }
        ]
    },
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src')
        },
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.js', '.tsx', '.ts']
    },
    plugins: [
        new PagesPlugin({
            scanDir:  path.resolve(__dirname, 'src', 'pages'),
            template: path.resolve(__dirname, 'public', 'index.html'),
            inject: true
        }),
        new ForkTsCheckerWebpackPlugin({
            async: isDev
        }),
        new ESLintPlugin({
            extensions: ["ts", "tsx"],
            fix: true,
            failOnError: !isDev
        }),
        new webpack.DefinePlugin({
            'process.env.API_URL': JSON.stringify(process.env.API_URL),
            'process.env.GITHUB_CLIENT_ID': JSON.stringify(process.env.GITHUB_CLIENT_ID),
            'process.env.TURNSTILE_SITE_KEY': JSON.stringify(process.env.TURNSTILE_SITE_KEY)
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'public'),
                    to: path.resolve(__dirname, 'dist'),
                    filter: source => {
                        return !source.includes('index.html')
                    }
                },
            ],
        })
    ],
    cache: {
        type: 'filesystem'
    }
};

const devConfig = merge(baseConfig, {
    devtool: 'eval-cheap-module-source-map',
    devServer: {
        port: 3000,
        compress: false,
        hot: true,
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname, 'public')
        }
    },
    plugins: [
        new ReactRefreshWebpackPlugin()
    ]
});

const prodConfig =  merge(baseConfig, {
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'static/css/[name].[contenthash:8].css'
        }),
        new PurgeCSSPlugin({
            paths: globAll.sync([
                `${path.join(__dirname, 'src')}/**/*.tsx`,
                path.join(__dirname, 'public', 'index.html')
            ]),
        }),
        new CompressionPlugin({
            test: /.(js|css)$/,
            filename: '[path][base].gz',
            algorithm: 'gzip',
            threshold: 10240,
            minRatio: 0.8
        })
    ],
    optimization: {
        minimizer: [
            new CssMinimizerPlugin(),
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    compress: {
                        pure_funcs: ["console.log"]
                    }
                }
            }),
        ],
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: /node_modules/,
                    name: 'vendors',
                    minChunks: 1,
                    chunks: 'initial',
                    minSize: 0,
                    priority: 1
                },
                commons: {
                    name: 'commons',
                    minChunks: 2,
                    chunks: 'initial',
                    minSize: 0
                }
            }
        }
    }
});

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        return devConfig;
    } else if (argv.mode === 'production') {
        if (process.env.RUN_ANALY === '1') {
            return swp.wrap(prodConfig);
        } else {
            return prodConfig;
        }
    } else {
        return baseConfig;
    }
};