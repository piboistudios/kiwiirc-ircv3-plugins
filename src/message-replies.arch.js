
require('./replies.css');
const emoji1 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/smileys_and_people_emoji_map.json');
const emoji2 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/activities_emoji_map.json');
const emoji3 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/flags_emoji_map.json');
const emoji4 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/food_and_drink_emoji_map.json');
const emoji5 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/objects_emoji_map.json');
const emoji6 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/symbols_emoji_map.json');
const emoji7 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/travel_and_places_emoji_map.json');
const emoji8 = require('../fixtures/emoji_unicode_json_mapping/emoji_map_files/animals_and_nature_emoji_map.json');
const REPLY_COMMANDS = [
    "PRIVMSG",
    "NOTICE",
    "BATCH"
]
function extractCodes(o) {
    return Object.values(o).flatMap(o => Object.entries(o)).map(([k, v]) => [k, v.js_escape])
}
const escapeRegex = require('escape-regex');
const { titleCase } = require('title-case');
function formatTitle(v) {
    return titleCase(
        v,
        {
            wordSeparators: new Set(['_'])
        }
    )
        .replace(/_/gi, ' ')
}
const {Picker} = require('emoji-mart-vue');

function extractCodes2(o) {
    return Object.entries(o)
        .map(([k1, v]) => {
            const section = formatTitle(k1);
            return [section, Object
                .entries(v)
                .map(
                    ([k2, v]) => {
                        const name = formatTitle(k2);
                        return [
                            v.js_escape,
                            {
                                section,
                                name,
                                tags: [section, name]
                            }
                        ]
                    }
                )]
        }
        )
}
const ALL_EMOJIS = [emoji1, emoji2, emoji3, emoji4, emoji5, emoji6, emoji7, emoji8].flatMap(extractCodes);
const ALL_EMOJIS_ALT = [emoji1, emoji2, emoji3, emoji4, emoji5, emoji6, emoji7, emoji8].flatMap(extractCodes2);
const ALL_EMOJIS_MAP = Object.fromEntries(ALL_EMOJIS);
const ALL_EMOJIS_OBJECT = Object.assign(emoji1, emoji2, emoji3, emoji4, emoji5, emoji6, emoji7, emoji8);
kiwi.plugin('message-replies', function (kiwi, log) {
    kiwi.state.setting('forceHideEmojiPicker', true);
    const EmojiTool = kiwi.require('components/inputtools/Emoji');
    kiwi.log("smileys and people:", ALL_EMOJIS_MAP);
    kiwi.log("all emojis arr:", ALL_EMOJIS);
    kiwi.log("all emojis:", ALL_EMOJIS_OBJECT);
    kiwi.log('alt emojis', ALL_EMOJIS_ALT);
    const _ = require('lodash');
    kiwi.state.setting('modern_emojis', ALL_EMOJIS_ALT);
    const ModernEmojiTool = kiwi.Vue.extend({
        template: `<div class="default-bg emoji-tool" >
            <div class="default-bg u-form emoji-search-container">
                <label>
                    <input type="text" class="u-input" v-model="search"/>
                </label>
                <div @click="close" class="kiwi-controlinput-button kiwi-controlinput-button">
                    
                    <i class="fa fa-close" />
                </div>
            </div>
            <template v-for="section in filteredSections" v-if="section[1].length">
                
                <div class="default-bg emoji-section" @mousedown.prevent @click.prevent>
                    <label class="kiwi-messagelist-body small">{{section[0]}}</label>
                    <div class="emoji-wrapper default-bg">
                        <div
                            v-for="[eCode, info] in section[1]"
                            :key="eCode"
                            :title="info.name"
                            :data-code="eCode"
                            class="kiwi-inputtool-emoji-emoji kiwi-messagelist-item"
                            @click="onEmojiClick"
                            v-text="eCode"
                        />
                    </div>
                </div>
            </template>
        </div>`,
        props: ['ircinput'],
        computed: {
            filteredSections() {
                kiwi.log(this.ircinput);
                const filter = this.search && new RegExp(escapeRegex(this.search), 'i')
                return this.emojis.map(s => [s[0], (!this.search && s[1] || s[1].filter(([k, v]) => v.tags.find(t => filter.test(t))))/* .map(v => v[0]) */]);
            },
            emojis() {

                return this.$state.setting('modern_emojis');
            },
        },
        data() {
            return {
                search: ''
            }
        },
        methods: {
            close() {
                this.ircinput.$parent.toggleInputTool(Picker);
            },
            onEmojiClick: function (event) {

                let code = event.target.dataset.code;
                this.ircinput && this.ircinput.insertText(code);
                this.$emit('emoji', code);
            },
        },
    })
    const ModernEmojiToolWrapped = kiwi.Vue.extend({
        template: `
            <div class="emoji-selector-container">
                <modern-emoji-tool :ircinput="ircinput" />
            </div>
        `,
        components: { ModernEmojiTool },
        props: ['ircinput'],
    })
    kiwi.addUi('input_tool', kiwi.Vue.extend({
        template: `
            <div
                class="kiwi-controlinput-button"
                @click.prevent="showTool"
            >
                <i class="fa fa-smile-o" aria-hidden="true" />
            </div>
        `,

        props: ['controlinput'],
        methods: {
            showTool() {
                this.controlinput.toggleInputTool(Picker);
            }
        },
    }))
    kiwi.log("Picker", Picker);
    kiwi.log("ModernEmojiToolWrapped", ModernEmojiToolWrapped);
    const prepend = kiwi.Vue.extend({
        template: `<div @click.stop="scrollToReply" v-if="isReply" class="irc-fg-colour-grey"  >
            <div style="overflow:hidden;white-space:nowrap;display:inline-block;font-weight:initial;">↪
            <span>
            <template v-if="react">Reacted {{react}} in</template>
            <template v-else>In</template> reply to <strong>{{subject.nick}}</strong>:</span></div>
            <a
                class="u-link"
                style="margin:0;font-style: italic;"
            >
                <div class="truncate" style="max-width: 25vw;display:inline-block" ><span class="inline" v-html="subject.html"/></div>
            </a>
        </div>`,
        created() {
            log.debug("Props:", { message: this.message, buffer: this.buffer })
            log.debug("Vm:", this);
        },
        methods: {
            scrollToReply() {
                // alert()
                this.$state.$emit('scrolltoreply');
                this.$state.$emit('messageinfo.close');
                const msgid = this.subject.tags.msgid;
                this.$state.$emit('messagelist.scrollto', { id: msgid });
                const el = document.querySelector(`[data-message-id="${msgid}"]`);
                this.$nextTick(() => {

                    el.classList.add('attention');
                    document.body.addEventListener('click', f)
                    this.$state.$on('scrolltoreply', f);
                });
                function f() {
                    el.classList.remove('attention');
                    dispose();
                }
                let disposed;
                function dispose() {
                    !disposed && document.body.removeEventListener('click', f);
                    !disposed && this?.$state?.$off?.('scrolltoreply', f);
                    disposed = true;
                }
                // setTimeout(() => {
                // }, 4000)
            }
        },
        computed: {
            isReply() {
                return Boolean(this?.message?.tags?.["+draft/reply"])
            },
            react() {
                return this?.message?.tags?.["+draft/react"]
            },
            subject() {
                return this.buffer.getMessages().find(m => m.tags.msgid === this.message.tags["+draft/reply"])
            }
        },
        props: ['message', 'buffer', 'color']
    });
    const AutoCompleteEmojiPicker = kiwi.Vue.extend({
        template: `<div class="autocomplete emoji-picker u-form">
        <label>
    <input ref="text" type="text" class="u-input z-idx-up-1 default-bg "v-model="selection"
        @click.stop
    />
    </lable>
    <ul ref="menu" class="dropdown-menu" style="width:100%">
        <li 
            v-for="([emoji, info], $index) in filteredL"
            class="emoji-dropdown-item"
            :title="info.name"
            @click.stop="select(emoji, info)"
        >
            <label>{{emoji}}</label>
        </li>
    </ul>
</div>`,
        data() {
            return {
                open: false,
                current: 0
            }
        },

        props: {
            suggestions: {
                type: Array,
                required: true
            },

            selection: {
                type: String,
                required: true,
                twoWay: true
            }
        },

        computed: {
            emojis() {

                return this.$state.setting('modern_emojis');
            },
            filtered() {
                const filter = this.selection && new RegExp(escapeRegex(this.selection), 'i');
                return this.emojis.flatMap(s => (!this.selection && s[1] || s[1].filter(([k, v]) => v.tags.find(t => filter.test(t))))/* .map(v => v[0]) */);
            },
            filteredL() {

                this.resize();
                return this.filtered;
            }
        },
        mounted() {
            this.resize();
        },
        methods: {
            resize() {
                const offset = Math.max(Math.min(this.filtered.length * 28, 320), 48);
                if (this.$refs.menu) {

                    this.$refs.menu.style.top = `-${offset}px`;
                    this.$refs.menu.style.height = `${offset}px`;
                } else {
                    kiwi.log("no refs", this.$refs);
                }
            },
            select(emoji, info) {
                this.$emit('emoji', emoji, info);
            }
        }
    })
    const reply = kiwi.Vue.extend({
        template: `<a v-if="message.tags.msgid" @click="reply" class="u-link kiwi-messageinfo-reply">Reply</a>`,
        methods: {
            reply() {
                // alert('waaa');
                this.buffer.state.reply = this.message;
                // log.debug("Props:", { message: this.message, buffer: this.buffer })
                // log.debug("Vm:", this);
                kiwi.emit('dock.update');

            }
        },
        props: ['message', 'buffer']
    });
    const HANDLES_REPLIES = Symbol('reply');
    const dockMsg = kiwi.Vue.extend({
        template: `<div style="display:flex;align-items:center;" v-if="msg">
                        <a 
                        @click="cancel" 
                        style="margin-right: 4px" 
                        class="kiwi-controlinput-button">
                            <i class="fa fa-close"/>
                        </a>
                        <span>
                            {{msg}}
                        </span>
                        <div
                            class="kiwi-controlinput-button"
                            @click.prevent="toggleEmoji"
                        >
                            <span v-if="react" class="selected-emoji">
                                <i class="fa tooltip-activator">{{ react.emoji }}</i>
                                <span  class="reaction-tip tooltip" style="left:-100%;top: 27px;">Reaction: {{react.info.name}}</span>
                                <i @click.stop="cancelReact" class="fa fa-stack-item-corner cancel-react fa-times-circle" aria-hidden="true" />

                            </span>
                            <span v-else :class="{'active': emoji }" class="fa-stack-2x tooltip-container z-idx-up-2">
                                <span  class="reaction-tip tooltip right center">Reaction</span>
                                <i class="fa fa-stack-item fa-smile-o z-idx-up-2" aria-hidden="true" />
                                <i class="fa fa-stack-item fa-stack-item-corner fa-plus" aria-hidden="true" />
                                <auto-complete-emoji-picker @emoji="pickEmoji" ref="autocomplete" v-show="emoji" :suggestions="allEmojis"/>
                            </span>
                        </div>
                        
                    </div>`,
        components: {
            AutoCompleteEmojiPicker
        },
        computed: {
            allEmojis() {
                return ALL_EMOJIS.map(e => e[1])
            }
        },
        created() {
            kiwi.on('dock.update', () => {
                const buffer = this.$state.getActiveBuffer();
                if (!buffer[HANDLES_REPLIES]) {
                    const oldAdd = this.$state.addMessage.bind(this.$state);
                    const self = this;
                    this.$state.addMessage = function (buf, msg) {
                        const nick = kiwi.state.getActiveNetwork().nick;
                        log.debug("reply add msg", msg);
                        const historicalTime = Date.now() - 100; // cant think of another way to tell if msg is historical or not
                        log.debug("historical time:", historicalTime);
                        log.debug("reply", buffer.state.reply);
                        log.debug("message type:", msg.type);
                        log.debug("nick:", nick, "/", msg.nick)

                        if (buffer.state.reply && REPLY_COMMANDS.indexOf(msg.type.toUpperCase()) !== -1 && nick === msg.nick && msg.time > historicalTime) {
                            alert('?');
                            if (!msg.tags) msg.tags = {};
                            msg.tags["+draft/reply"] = buffer.state.reply.tags.msgid;
                            if (buffer.state.reply.react) {
                                msg.tags["+draft/react"] = buffer.state.reply.react;
                            }

                        }
                        oldAdd(...arguments);
                    }


                    buffer[HANDLES_REPLIES] = true;
                }
                if (!buffer?.state?.reply)
                    this.msg = null;

                else {
                    this.msg = `Replying to ${buffer.state.reply.nick}:`
                    this?.controlinput?.$refs?.input?.focus?.();

                }
            })
        },
        props: ['controlinput', 'buffer'],
        watch: {
            react(n, o) {
                this.buffer.state.reply.react = n ? n.emoji : null;
            },
        },
        methods: {
            cancelReact() {
                this.react = null;
            },
            toggleEmoji() {
                if (this.react) {
                    // this.react = null;
                    return;
                }
                this.emoji = !this.emoji;
                if (this.emoji)
                    if (this.$refs.autocomplete) {
                        if (this.$refs.autocomplete.$refs.text) {
                            kiwi.log("focused");
                            setTimeout(() => {

                                this.$refs.autocomplete.$refs.text.focus();
                            }, 10)
                        } else {
                            kiwi.log("No refs autocomplete refs text")
                        }
                    } else {
                        kiwi.log("No refs autocomplete")

                    }
            },
            pickEmoji(emoji, info) {
                kiwi.log("Picking emoji", { emoji, info });
                this.react = { emoji, info }
                this.emoji = false;
            },
            cancel() {
                this.msg = null;
                const buffer = this.$state.getActiveBuffer();
                buffer.state.reply = null;
            }
        },
        data() {
            return {
                msg: null,
                react: null,
                emoji: false
            }
        }
    })
    kiwi.addUi('message_prepend', prepend);
    // kiwi.addUi('message_append', component);
    kiwi.addUi('message_info', reply);
    kiwi.addUi('input_dock', dockMsg);

    kiwi.on('ircout', async (evt) => {
        /**
         * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
         */
        if (REPLY_COMMANDS.includes(evt.message.command)) {
            let buffer = kiwi.state.getActiveBuffer();
            if (!buffer.state.reply) return;
            if (!evt.tags) evt.message.tags = {};
            evt.message.fromMe = true;
            if (buffer?.state?.reply?.tags?.msgid) {

                evt.message.tags["+draft/reply"] = buffer.state.reply.tags.msgid;
                if (buffer.state.reply.react) {
                    evt.message.tags["+draft/react"] = buffer.state.reply.react;
                }
            }
            delete buffer.state.reply;
            kiwi.emit('dock.update');
            kiwi.emit('messageinfo.close');
        }
        log.debug("About to send", evt);
        /*    {
               time: eventTime,
               server_time: serverTime,
               nick: event.nick,
               message: messageBody,
               type: event.type,
               tags: event.tags || {},
           }; */

    });

})