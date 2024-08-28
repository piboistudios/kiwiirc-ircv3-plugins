
const emojiData = require('emoji-mart-vue-fast/data/all.json');
require('./replies.css');
const REPLY_COMMANDS = [
    "PRIVMSG",
    "NOTICE",
    "BATCH"
]


const { Picker } = kiwi.require('components/utils/VueEmojiMartFast');
const IrcMessage = require('irc-framework/src/ircmessage');
const { v4: uuid } = require('uuid');
require('emoji-mart-vue-fast/css/emoji-mart.css');

const REACT_INTERNALS = Symbol('react');
kiwi.plugin('message-replies', async function (kiwi, log) {
    const HAS_LISTENERS = Symbol('has-emoji-listeners');
    function setupListener() {
        const container = document.querySelector('.kiwi-container-content');
        if (!container[HAS_LISTENERS]) {

            container.addEventListener('wheel', setEmojiMartClasses);
            container.addEventListener('touchmove', setEmojiMartClasses);
            container[HAS_LISTENERS] = true;
        }
        setTimeout(() => {

            setEmojiMartClasses();
        }, 1)
    }
    function setEmojiMartClasses() {
        const marts = document.querySelectorAll('.kiwi-emoji-mart.active');
        marts.forEach(mart => {
            const rect = mart.getBoundingClientRect();
            if (rect.right >= window.innerWidth) {
                log.debug('setting right');
                mart.classList.remove('right');
                mart.classList.add('left');
            } /* else {
                mart.classList.remove('left');
                mart.classList.add('right');
                log.debug('setting left');
            } */
            if (rect.bottom > window.innerHeight) {
                mart.classList.add('top');
                mart.classList.remove('bottom');
                log.debug('setting top');

            } else if (rect.top < 0) {
                mart.classList.add('bottom');
                mart.classList.remove('top');
                log.debug('setting bottom');

            }

        });
    }
    const { titleCase } = await import('title-case');
    const { EmojiIndex } = await import('emoji-mart-vue-fast/src/utils/emoji-data');
    const emojiIndex = new EmojiIndex(emojiData)
    const EmojiPicker = {
        computed: {
            emojiIndex() {
                return emojiIndex;
            },
            pickerProps() {
                return config.setting('pickerProps');
            },
            emojiSet() {
                return config.setting('emojiSet');
            },
        },
        data() {
            return {
                reacting: false
            }
        },
        watch: {
            reacting(n, o) {
                if (n) setupListener();
            }
        },
        methods: {
            onEmojiSelected(emoji) {
                this.reacting = false;
                const buf = this.buffer;
                /**
                 * @type {}
                 */
                const net = this.$state.getActiveNetwork();
                const nick = net.nick;
                const msgid = this.message?.tags?.msgid;
                selectEmoji({ buf, net, nick, msgid, emoji: emoji.native });
            },
        },

    }
    const _ = require('lodash');
    const append = /* kiwi.Vue.createApp */({

        template: `
            <div v-if="reacts" class="react-counts">
                <div @click.stop="reactWith(emoji)" class="react-count kiwi-controlinput-button tooltip-container" v-for="(nicks, emoji) in reacts" :key="emoji">
                    
                    <i>{{ emoji }}</i>
                    <span class="text count">{{nicks.length}}</span>
                    <span class="tooltip bottom text">
                        <strong :style="\`color:\${users[nick.toUpperCase()]?.getColour?.()}\`" v-for="(nick, idx) in nicks">{{ nick }}<template v-if="idx !== nicks.length-1">,</template></strong>
                        reacted with <strong>{{ colons(emoji) }}</strong>
                    </span>
                </div>

                <div @click.stop="toggleReact" class="add-react react-count kiwi-controlinput-button tooltip-container">
                    <span @click.stop="toggleReact" :class="{active: reacting }" class="fa-stack-2x message-reaction tooltip-container z-idx-up-2">
                        <span  class="tooltip bottom text" style="width:64px;">Add reaction</span>
                        <svg-icon icon="fa-regular fa-face-smile" class="fa fa-stack-item fa-face-smile z-idx-up-2" aria-hidden="true" />
                        <svg-icon icon="fa fa-stack-item fa-stack-item-corner fa-plus" aria-hidden="true" /> 
                          <emoji-picker
                            ref="emoji-picker"
                            :class="{active: reacting}"
                            v-if="reacting"
                            @click.stop
                            v-bind="pickerProps"   
                            :key="state"         
                            :set="emojiSet"         
                            :data="emojiIndex"          
                            class="kiwi-emoji-mart message-react-emoji-mart"         
                            @select="selectEmoji"     
                        />
                    </span>
                </div>
            </div>
        `,
        mixins: [EmojiPicker],
        components: { EmojiPicker: Picker },
        filters: {

        },
        computed: {
            msgid() {
                this.state;
                const ret = this.message?.tags?.msgid;
                return ret;
            },
            users() {
                this.state;
                const ret = this.buffer.users;
                return ret;
            },
            reacts() {
                this.state;
                const ret = this.msgid && this.buffer.setting('reactions')?.[this.msgid];
                ret && delete ret['undefined'];
                return Object.fromEntries(Object.entries(ret).filter(e => Boolean(e[1].length)));
            }
        },
        methods: {
            colons(emoji) {
                if (!emoji || emoji === 'undefined') return ':blank:';
                const ret = emojiIndex.findEmoji(emoji).colons;
                return ret;
            },
            toggleReact() {
                this.reacting = !this.reacting;
                log.debug("refs:", this.$refs);
                this.reacting && this.$nextTick(() => {
                    const picker = this.$refs["emoji-picker"].$el;

                    const closeMart = evt => {
                        if (evt.target !== picker && !picker.contains(evt.target)) {
                            this.reacting = false;
                            document.removeEventListener('click', closeMart);
                        }
                    }
                    document.addEventListener('click', closeMart)
                });
            },
            selectEmoji(e) {
                this.onEmojiSelected(e);
            },
            reactWith(emoji) {

                const buf = this.buffer;
                const net = this.$state.getActiveNetwork();
                const nick = net.nick;
                const msgid = this.message?.tags?.msgid;
                selectEmoji({
                    buf,
                    net,
                    nick,
                    msgid,
                    emoji
                });
            }
        },
        mounted() {
            const self = this;
            this.message[REACT_INTERNALS] = {
                update: () => {
                    self.state = (self.state + 1) % 1024;
                }
            }
        },
        data() {
            return {
                emoji: false,
            }
        },
        props: ["message", "buffer", "messagelist", "color"]
    })
    const prepend = /* kiwi.Vue.createApp */({
        template: `<div  v-if="isReply" class="irc-fg-colour-grey"  >
            <div @click.self.stop="scrollToReply" style="overflow:hidden;white-space:nowrap;display:inline-block;font-weight:initial;">
            <i @click.self.stop="scrollToReply" class="fa fa-reply rotate-180"/>
            <span @click.self.stop="scrollToReply">
            <template v-if="react">Reacted {{react}} in</template>
            <template v-else>In</template> reply to <a class="u-link" @click.stop="onUserClick(subject.nick)" :style="\`color:\${subject.user.getColour()}\`"><strong>{{subject.nick}}</strong></a>:</span></div>
            <a
                class="u-link"
                style="margin:0;font-style: italic;"
                @click.self.stop="scrollToReply" 
            >
                <div @click.self.stop="scrollToReply" class="truncate" style="max-width: 25vw;display:inline-block" ><span @click.self.stop="scrollToReply" class="inline" v-html="subject.html"/></div>
            </a>
        </div>`,
        created() {
        },
        methods: {
            onUserClick(nick) {
                this.messagelist.openUserBox(nick);
            },
            scrollToReply() {
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
                return Boolean(this?.message?.tags?.["+draft/reply"]) && this.subject;
            },
            react() {
                return this.isReply && this?.message?.tags?.["+draft/react"]
            },
            subject() {
                const ret = this.buffer.getMessages().find(m => m.tags && m.tags.msgid && m.tags.msgid === this.message.tags["+draft/reply"])
                const color = ret?.user?.getColour?.() || 'unset';
                return ret;
            },

        },
        props: ['message', 'messagelist', 'buffer', 'color']
    });
    const reply = /* kiwi.Vue.createApp */({
        template: `<a v-if="message.tags.msgid" @click="reply" class="u-link kiwi-messageinfo-reply">
                    <svg-icon icon="fa fa-reply rotate-180"/>
                    Reply
                    </a>`,
        methods: {
            reply() {
                this.buffer.state.reply = this.message;
                kiwi.emit('dock.update');

            }
        },
        props: ['message', 'buffer']
    });
    const config = require('./config');

    const react = /* kiwi.Vue.createApp */({
        template: `
            <div class="react-btn">
                <emoji-picker
                    v-if="reacting"
                    :class="{active: reacting}"
                    v-bind="pickerProps"            
                    :set="emojiSet"         
                    :data="emojiIndex"          
                    class="kiwi-emoji-mart react-emoji-mart"         
                    @select="onEmojiSelected"           
                />          
              <a v-if="message.tags.msgid" @click="react" class="u-link  kiwi-messageinfo-reply">
                <span class="fa-stack-2x tooltip-container z-idx-up-2">
                    <svg-icon icon="fa-regular fa-face-smile" class="fa fa-stack-item fa-face-smile z-idx-up-2" aria-hidden="true" />
                    <svg-icon icon="fa fa-stack-item fa-stack-item-corner fa-plus" aria-hidden="true" />
                </span>
                React
                </a>
            </div>`,
        components: {
            EmojiPicker: Picker
        },

        mixins: [EmojiPicker],
        methods: {
            react() {
                this.reacting = !this.reacting;
                // this.buffer.state.reply = this.message;
                // kiwi.emit('dock.update');

            }
        },
        data() {
            return {
            }
        },
        props: ['message', 'buffer']
    });
    let cache = {};
    /**
     * 
     * @param {{
     *  net: import('../../kiwiirc/src/libs/state/NetworkState').default,
     *  buf: import('../../kiwiirc/src/libs/state/BufferState').default,
     *  
     * }} param0 
     */
    function selectEmoji({ buf, net, nick, msgid, emoji }) {
        const { reacted, label } = setReactionUi({ buf, msgid, emoji, nick });
        log.debug("Reacted:", { reacted, label, msgid });
        if (reacted) {
            const correlation = buf.state.reacts[msgid] || (label && buf.state.reacts[label]);
            if (!correlation?.msgid) return;
            unsetReactionUi({ buf, msgid, emoji, nick });
            log.debug("Correlation:", correlation);
            log.debug("reacts:", buf.state.reacts);
            log.debug("label:", label);
            const msg = new IrcMessage('REDACT', buf.name, correlation.msgid);
            msg.tags = {
                label: uuid()
            };
            net.ircClient.raw(msg.to1459());
            return;
        }

        const msg = new IrcMessage('TAGMSG', buf.name);
        buf.state.reacts ??= {};
        buf.state.reacts[label] = { emoji, nick };
        msg.tags = {
            '+draft/react': emoji,
            '+draft/reply': msgid,
            label
        };
        net.ircClient.raw(msg.to1459());
    }
    const LABEL = Symbol('label');
    /**
     * 
     * @param {{buf:import('../../kiwiirc/src/libs/state/BufferState').default}} param0 
     */
    function setReactionUi({ buf, msgid, emoji, nick, event }) {
        const _reactions = buf.setting('reactions');
        const data = _reactions || { [msgid]: { [emoji]: [] } };
        if (!data[msgid]) data[msgid] = { [emoji]: [] };
        if (!data[msgid][emoji]) data[msgid][emoji] = [];
        !_reactions && buf.setting('reactions', data);
        const didntExist = !data[msgid][emoji].includes(nick);
        didntExist && data[msgid][emoji].push(nick);
        if (!_reactions) buf.setting('reactions', data);
        const msg = cache[msgid] !== undefined ? cache[msgid] : buf.getMessages().find(m => m?.tags?.msgid === msgid);
        const labelKey = [msgid, emoji, nick, "label"].join('.')
        const label = event ? (event?.tags?.label || event?.tags?.msgid) : (didntExist ? uuid() : buf.setting(labelKey));
        cache[msgid] = msg;
        buf.setting(labelKey, label)
        if (msg) {
            msg[REACT_INTERNALS] && msg[REACT_INTERNALS].update();
        }
        return { reacted: !didntExist, label };
    }
    /**
     * 
     * @param {{buf:import('../../kiwiirc/src/libs/state/BufferState').default}} param0 
     */
    function unsetReactionUi({ buf, msgid, emoji, nick }) {
        const _reactions = buf.setting('reactions');
        const data = _reactions || { [msgid]: { [emoji]: [] } };
        if (!data[msgid]) data[msgid] = { [emoji]: [] };
        if (!data[msgid][emoji]) data[msgid][emoji] = [];
        !_reactions && buf.setting('reactions', data);
        const idx = data[msgid][emoji].indexOf(nick);
        idx !== -1 && data[msgid][emoji].splice(idx, 1);
        if (!_reactions) buf.setting('reactions', data);
        const msg = cache[msgid] !== undefined ? cache[msgid] : buf.getMessages().find(m => m?.tags?.msgid === msgid);
        cache[msgid] = msg;
        if (msg) {
            msg[REACT_INTERNALS] && msg[REACT_INTERNALS].update();
        }
    }
    const HANDLES_REPLIES = Symbol('reply');
    const dockMsg = /* kiwi.Vue.createApp */({
        template: `<div style="display:flex;align-items:center;" v-if="msg">
                        <a 
                        @click="cancel" 
                        style="margin-right: 4px" 
                        class="kiwi-controlinput-button">
                            <svg-icon icon="fa fa-close"/>
                        </a>
                        <span>
                            {{msg}}
                        </span>
                        <div
                            class="kiwi-controlinput-button"
                            @click.stop="toggleEmoji"
                        >
                            <span @click.stop="cancelReact" v-if="react" class="selected-emoji">
                                <span class="fa tooltip-activator">{{ react.emoji }}</span>
                                <span  class="reaction-tip tooltip">Reaction: {{react.info.name}}</span>
                                <svg-icon  icon="fa fa-solid fa-close" class="fa-stack-item-corner cancel-react" aria-hidden="true" />

                            </span>
                            <span v-else :class="{'active': reacting }" class="fa-stack-2x message-reaction tooltip-container z-idx-up-2">
                                <span  class="message-reaction-tip tooltip right center">Reaction</span>
                                <svg-icon icon="fa-regular fa-face-smile" class="fa fa-stack-item fa-face-smile z-idx-up-2" aria-hidden="true" />
                                <svg-icon icon="fa fa-stack-item fa-stack-item-corner fa-plus" aria-hidden="true" />
                                 <emoji-picker
                                    ref="emoji-picker"
                                    v-if="reacting"
                                    :class="{active: reacting}"
                                    v-bind="pickerProps"
                                    @click.stop
                                    :set="emojiSet"         
                                    :data="emojiIndex"          
                                    class="kiwi-emoji-mart message-react-emoji-mart left"         
                                    @select="onEmojiSelected"     
                                />     
                            </span>
                        </div>
                        
                    </div>`,
        components: {
            EmojiPicker: Picker
        },
        mixins: [EmojiPicker],
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
                        const historicalTime = Date.now() - 100; // cant think of another way to tell if msg is historical or not

                        if (buffer.state.reply && REPLY_COMMANDS.indexOf(msg.type.toUpperCase()) !== -1 && nick === msg.nick && msg.time > historicalTime) {
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
                this.reacting = !this.reacting;
                if (this.reacting) {
                    this.reacting && this.$nextTick(() => {
                        const picker = this.$refs["emoji-picker"].$el;

                        const closeMart = evt => {
                            if (evt.target !== picker && !picker.contains(evt.target)) {
                                this.reacting = false;
                                document.removeEventListener('click', closeMart);
                            }
                        }
                        document.addEventListener('click', closeMart)
                    });
                    if (this.$refs.autocomplete) {
                        if (this.$refs.autocomplete.$refs.text) {
                            setTimeout(() => {

                                this.$refs.autocomplete.$refs.text.focus();
                            }, 10)
                        } else {
                        }
                    } else {

                    }
                }
            },
            onEmojiSelected(emoji) {

                this.react = { emoji: emoji.native, info: emoji }
                this.reacting = false;
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
                reacting: false
            }
        }
    })
    kiwi.addUi('message_prepend', prepend);
    kiwi.addUi('message_append', append);
    // kiwi.addUi('message_append', component);
    kiwi.addUi('message_info', reply);
    kiwi.addUi('message_info', react);
    kiwi.addUi('input_dock', dockMsg);
    kiwi.on('start',

        async () => {
            /**
             * 
             * @type { import('../../kiwiirc/src/libs/state/NetworkState').default}
             */
            const network = kiwi.state.getActiveNetwork();
            network.ircClient.use(
                /**
                 * 
                 * @param {import('irc-framework/src/client')} client 
                 * @param {import('middleware-handler')} raw 
                 * @param {import('middleware-handler')} parsed 
                 */
                (client, raw, parsed) => {

                    raw.use(
                        /**
                         * 
                         * @param {string} event_name 
                         * @param {import('irc-framework/src/ircmessage')} event 
                         * @param {*} next 
                         * @returns 
                         */
                        (event_name, event, line, client, next) => {
                            if (network.ircClient.network.cap.enabled.includes('draft/message-redaction')) {
                                if (event_name.toLowerCase() === 'redact') {
                                    const target = event.params[0];
                                    const msgid = event.params[1];
                                    if (!target || !msgid) return;
                                    const buf = network.bufferByName(target);
                                    if (!buf) return;
                                    if (!buf.state.reacts) return;
                                    const react = buf.state.reacts[msgid];
                                    const { emoji, nick, msgid: refid } = react;
                                    unsetReactionUi({ buf, msgid: refid, emoji, nick, event });
                                }
                            }
                            next();
                        })
                    parsed.use((event_name, event, client, next) => {

                        if (event_name.toLowerCase() === 'tagmsg') {
                            const cond = event?.tags["+draft/reply"] && event?.tags["+draft/react"];
                            if (cond) reacthandler: {
                                const { "+draft/reply": msgid, "+draft/react": emoji } = event.tags;
                                if (!emoji) break reacthandler;

                                const { target, nick } = event;
                                /**
                                 * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
                                */
                                const buf = network.bufferByName(target);
                                if (buf) {
                                    const reactid = event?.tags?.msgid;
                                    const label = event?.tags?.label;
                                    if (label && buf.state?.reacts?.[label]) {
                                        buf.state.reacts[label].msgid = reactid;
                                    }
                                    if (reactid) {

                                        buf.state.reacts ??= {};
                                        buf.state.reacts[reactid] = { msgid, emoji, nick };
                                        buf.state.reacts ??= {};
                                        buf.state.reacts[msgid] = { msgid: reactid, emoji, nick };
                                    }
                                    setReactionUi({ buf, msgid, emoji, nick, event })
                                }
                            }
                        }
                        next();
                    })
                });
        })

    kiwi.on('ircout', async (evt) => {
        /**
         * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
         */
        if (REPLY_COMMANDS.includes(evt.message.command)) {
            let buffer = kiwi.state.getActiveBuffer();
            if (!buffer.state.reply) return;
            if (!evt.message.tags) evt.message.tags = {};
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


    });

})