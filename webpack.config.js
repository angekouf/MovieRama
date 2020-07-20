const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: [
        './src/js/app.js',
        './src/sass/app.scss'
    ],

    // Path and filename of your result bundle.
    // Webpack will bundle all JavaScript into this file
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/bundle.js',
        publicPath: "/dist"
    },

    // Default mode for Webpack is production.
    // Depending on mode Webpack will apply different things
    // on final bundle. For now we don't need production's JavaScript 
    // minifying and other thing so let's set mode to development
    mode: 'production',

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [
                            "@babel/plugin-proposal-private-methods",
                            "@babel/plugin-proposal-private-property-in-object",
                            "@babel/plugin-proposal-class-properties",
                            "@babel/plugin-transform-runtime",
                        ]
                    }
                }
            },
            {
                test: /\.(sa|sc|c)ss$/,

                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    "postcss-loader",
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: false
                        }
                    }
                ]
            }
        ]
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: "css/styles.css"
        }),
        new CopyPlugin({
            patterns: [
                { from: 'src/img', to: "img" },
                { from: 'src/index.html', to: "index.html" }
            ],
            options: {
                concurrency: 100
            }
        })
    ]
};