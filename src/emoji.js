/* global kiwi:true */

import 'emoji-mart-vue-fast/css/emoji-mart.css';
import EmojiData from 'emoji-mart-vue-fast/data/all.json';
import * as config from './config.js';
import * as EmojiProvider from '../plugin-emojis/src/libs/EmojiProvider.js';
const { EmojiIndex, Picker } = kiwi.require('components/utils/VueEmojiMartFast');

kiwi.plugin('emojis', (kiwi) => {
    config.setDefaults(kiwi);

    const emojiIndex = new EmojiIndex(EmojiData, {
        include: config.setting('categoryInclude'),
        exclude: config.setting('categoryExclude'),
        custom: config.setting('customEmojis'),
        recent: config.setting('frequentlyUsedList'),
        recentLength: config.setting('frequentlyUsedLength'),
    });
    kiwi['plugin-emojis'] = Object.create(null);
    kiwi['plugin-emojis'].emojiIndex = emojiIndex;

    kiwi.replaceModule('libs/EmojiProvider', EmojiProvider);
    kiwi.replaceModule('components/inputtools/Emoji', {
        template: `    <picker
            v-bind="pickerProps"
            :set="emojiSet"
            :data="emojiIndex"
            class="kiwi-emoji-mart"
            @select="onEmojiSelected"
        />`,
        components: {
            Picker,
        },
        props: ['ircinput'],
        computed: {
            emojiIndex() {
                return kiwi['plugin-emojis'].emojiIndex;
            },
            pickerProps() {
                return config.setting('pickerProps');
            },
            emojiSet() {
                return config.setting('emojiSet');
            },
        },
        methods: {
            getBestAscii(emoji) {
                if (config.setting('sendNativeEmojis') && emoji.native) {
                    return emoji.native;
                }

                if (emoji.colons.includes('::')) {
                    // Emoji has skin tone, always use colons
                    return emoji.colons;
                }

                if (emoji.emoticons && emoji.emoticons.length > 0) {
                    // Emoji has emoticons find the best
                    for (let i = 0; i < emoji.emoticons.length; i++) {
                        // Try to find a emoticon starting with a colon
                        if (emoji.emoticons[i].indexOf(':') === 0) {
                            return emoji.emoticons[i];
                        }
                    }
                    return emoji.emoticons[0];
                }

                // No emoticon was found, use colons
                return emoji.colons;
            },
            onEmojiSelected(emoji) {
                if (emoji.imageUrl) {
                    // custom emojis
                    this.ircinput.addImg(
                        this.getBestAscii(emoji),
                        emoji.imageUrl,
                    );
                    return;
                }

                this.ircinput.addImg(
                    this.getBestAscii(emoji),
                    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    {
                        style: `background-position: ${emoji.getPosition()}; height: 1.2em; vertical-align: -0.3em;`,
                        className: `emoji-set-${config.setting('emojiSet')} emoji-type-image`,
                    },
                );
            },
        },
    });
    kiwi.state.$once('network.connecting', () => {
        // Preload emoji sheet
        const img = document.createElement('img');
        img.className = `emoji-set-${config.setting('emojiSet')} emoji-type-image`;
        img.style = 'width: 1px; height: 1px; position: absolute; left: -10px;';
        document.body.appendChild(img);

        // Two ticks are required to append the child
        // and start loading the background-image
        kiwi.Vue.nextTick(() => {
            kiwi.Vue.nextTick(() => {
                document.body.removeChild(img);
            });
        });
    });
});
