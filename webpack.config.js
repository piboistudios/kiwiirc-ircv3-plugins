const path = require('path');

const { VueLoaderPlugin } = require('vue-loader');
module.exports = {


    mode: 'development',
    entry: {
        'multiline-webpacked': './src/multiline.js',
        'message-replies-webpacked': './src/message-replies.js',
        'sasl-startup-webpacked': './src/sasl-startup.js',
        'emoji-webpacked': './src/emoji.js',
        'message-redaction-webpacked': './src/message-redaction.js',
        'echo-labeled-response-webpacked': './src/echo-labeled-response.js',
        'conference-lite-webpacked': './src/conference-lite.js',
        'url-handler-webpacked': './src/url-handler.js',
        // 'module/b/index': 'module/b/index.js',
    },
    output: {
        path: path.resolve(__dirname, '..', 'public', 'javascripts', 'dist'),
        filename: '[name].js'
    },
    externalsType: 'window',
    externals: {
        vue: ['kiwi', 'Vue'],
    },
    resolve: {
        symlinks: false,
        fallback: {
            stream: require.resolve('stream-browserify'),
        },
        alias: {
            vue: path.resolve('../kiwiirc/node_modules/vue/dist/vue.esm-bundler.js'),
        },
        // dedupe: ['vue'],
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            // this will apply to both plain `.js` files
            // AND `<script>` blocks in `.vue` files
            {
                test: /\.js$/,
                loader: 'babel-loader'
            },
            // this will apply to both plain `.css` files
            // AND `<style>` blocks in `.vue` files
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        // make sure to include the plugin for the magic
        new VueLoaderPlugin()
    ]
};