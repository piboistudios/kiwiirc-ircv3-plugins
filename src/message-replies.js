
const emojiData = require('emoji-mart-vue-fast/data/all.json');
require('./replies.css');
const REPLY_COMMANDS = [
    "PRIVMSG",
    "NOTICE",
    "BATCH"
]


const IrcMessage = require('irc-framework/src/ircmessage');
const { v4: uuid } = require('uuid');
require('emoji-mart-vue-fast/css/emoji-mart.css');

const REACT_INTERNALS = Symbol('react');
kiwi.plugin('message-replies', async function (kiwi, log) {
    const { Picker } = await import('emoji-mart-vue-fast/src');
    const {
        faReply
    } = await import('@fortawesome/free-solid-svg-icons/faReply')
    const {
        faFaceSmile
    } = await import('@fortawesome/free-regular-svg-icons/faFaceSmile')
    kiwi.svgIcons.library.add(
        faReply, 
        faFaceSmile
    );


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
    /** sometimes you just gotta hack shit together....
        * this is bc absolute positioned elements get cut off by overflow: hidden, but
        *  fixed elements are, well, fixed... this will make a fixed element, e.g.
        *  the emoji mart behave like a relative one
        * 
        * console learnings:
        * bottom to top of btn
        * mart.style.top = ((mart.parentElement.getBoundingClientRect().top - mart.getBoundingClientRect().height) + 16)+ 'px';
        *     window.bottomFn = spam((mart) => {mart.style.top = ((mart.parentElement.getBoundingClientRect().bottom + mart.parentElement.getBoundingClientRect()))+ 'px';});
   window.topFn = spam((mart) => {mart.style.top = (((mart.parentElement.getBoundingClientRect().top)) - mart.getBoundingClientRect().height+24) + 'px';console.log({mart: mart.getBoundingClientRect(), parent: mart.parentElement.getBoundingClientRect(), container: container.getBoundingClientRect() }) })

        */
    /**
     * top to bottom of btn
     * temp5.style.top = ((temp6.getBoundingClientRect().top) + temp6.getBoundingClientRect().height*2)+ 'px';
     */
    const spamIt = fn => (...args) => { const interval = setInterval(() => fn(...args), 50); setTimeout(() => clearInterval(interval), 1000) }
    function setEmojiMartClasses() {
        const container = document.querySelector('.kiwi-container-content').getBoundingClientRect();

        const marts = document.querySelectorAll('.kiwi-emoji-mart.active');

        marts.forEach(spamIt(mart => {
            const rect = mart.getBoundingClientRect();
            const parent = mart.parentElement.getBoundingClientRect();

            if ((parent.bottom) > (container.bottom - container.height / 2)) {
                mart.classList.add('top');
                mart.classList.remove('bottom');
                log.debug('setting top');
                mart.style.top = (parent.top - mart.getBoundingClientRect().height + 24) + 'px'

            } else /* if (parent.top < container.top) */ {
                mart.classList.add('bottom');
                mart.classList.remove('top');
                log.debug('setting bottom');
                mart.style.top = ((parent.bottom + parent.height)) + 'px';

            }

        }));
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
    const replyUi = {
        computed: {
            replyable() {
                return REPLY_COMMANDS.indexOf(this.message.type.toUpperCase()) !== -1
            }
        }
    }
    const _ = require('lodash');
    const append = /* kiwi.Vue.createApp */({

        template: `
            <div v-if="replyable && reacts" class="react-counts">
                <div @click.stop="reactWith(emoji)" class="react-count kiwi-controlinput-button tooltip-container" v-for="(reactors, emoji) in reacts" :key="emoji">
                    
                    <i>{{ emoji }}</i>
                    <span class="text count">{{reactors.length}}</span>
                    <span class="tooltip bottom text">
                        <strong :style="\`color:\${users[reactor.nick.toUpperCase()]?.getColour?.()}\`" v-for="(reactor, idx) in reactors">{{ reactor.nick }}<template v-if="idx !== reactors.length-1">,</template></strong>
                        reacted with <strong>{{ colons(emoji) }}</strong>
                    </span>
                </div>

                <div @click.stop="toggleReact" class="add-react react-count kiwi-controlinput-button tooltip-container">
                    <span @click.stop="toggleReact" :class="{active: reacting }" class="fa-stack-2x message-reaction tooltip-container z-idx-up-2">
                        <span  class="tooltip bottom text" style="width:64px;">Add reaction</span>
                        <svg-icon icon="fa-regular fa-face-smile" class="fa fa-stack-item fa-face-smile z-idx-up-2" aria-hidden="true" />
                        <svg-icon icon="fa fa-stack-item fa-stack-item-corner fa-plus" aria-hidden="true" /> 
                    </span>
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
                </div>
            </div>
        `,
        mixins: [EmojiPicker, replyUi],
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
                const ret = this.msgid && this.buffer.state?.reactions?.[this.msgid];
                ret && delete ret['undefined'];
                return ret && Object.fromEntries(Object.entries(ret).filter(e => Boolean(e[1].length)));
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
            if (!this.replyable) return;
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
        template: `<div  v-if="replyable && isReply" class="irc-fg-colour-grey"  >
            <div @click.self.stop="scrollToReply" style="overflow:hidden;white-space:nowrap;display:inline-block;font-weight:initial;">
            <svg-icon @click.self.stop="scrollToReply" icon="reply" class="rotate-180"/>
            <span class="in-reply-to" @click.self.stop="scrollToReply">
            <template v-if="react">Reacted {{react}} in</template>
            <template v-else>In</template> reply to <a class="u-link" @click.stop="onUserClick(subject.nick)" :style="\`color:\${subject?.user?.getColour?.() || 'unset'}\`"><strong>{{subject.nick}}</strong></a>: </span></div>
            <a
                class="u-link"
                style="margin:0;font-style: italic;"
                @click.self.stop="scrollToReply" 
            >
                <div @click.self.stop="scrollToReply" class="truncate" style="max-width: 25vw;display:inline-block" ><span @click.self.stop="scrollToReply" class="inline" v-html="subject.html"/></div>
            </a>
        </div>`,
        mixins: [replyUi],
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
                return ret;
            },

        },
        props: ['message', 'messagelist', 'buffer', 'color']
    });
    const reply = /* kiwi.Vue.createApp */({
        template: `<a v-if="replyable && message.tags.msgid" @click="reply" class="u-link kiwi-messageinfo-reply">
                    <svg-icon icon="reply" class="rotate-180"/>
                    Reply
                    </a>`,
        mixins: [replyUi],
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
            <div v-if="replyable" class="react-btn">
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

        mixins: [EmojiPicker, replyUi],
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

        const existingReact = buf?.state?.reactions?.[msgid]?.[emoji]?.find?.(e => e.nick === nick);
        if (existingReact) {
            log.debug("Removed react:", existingReact);
            unsetReactionUi({ buf, msgid, nick, emoji });
            if (!existingReact.id) return
            removeReact(buf, existingReact.id);
            const msg = new IrcMessage('REDACT', buf.name, existingReact.id);
            if (net.ircClient.network.cap.enabled.includes('draft/labeled-response')) {
                msg.tags = { label: uuid() }
            }
            net.ircClient.raw(msg.to1459());
            return;
        }
        const { label } = setReactionUi({ buf, msgid, emoji, nick });
        log.debug("Reacted:", { msgid });
        const msg = new IrcMessage('TAGMSG', buf.name);
        buf.state.reacts ??= {};
        buf.state.reacts[label] = { emoji, nick };
        msg.tags = {
            '+draft/react': emoji,
            '+draft/reply': msgid,
        };
        if (label) msg.tags.label = label;
        net.ircClient.raw(msg.to1459());
    }
    function removeReact(buf, reactid) {
        if (!buf) return log.error("buf required");
        if (!reactid) return log.error('reactid required');
        if (buf.state.reaction_msgs?.[reactid]) {
            const item = buf.state.reaction_msgs[reactid];
            item.arr.splice(item.arr.indexOf(item.entry), 1);
            unsetReactionUi({ buf, msgid: item.msgid, nick: item.entry.nick, emoji: item.emoji });
            delete buf.state.reaction_msgs[reactid];
        }
    }
    /**
     * 
     * @param {{buf:import('../../kiwiirc/src/libs/state/BufferState').default}} param0 
     */
    function setReactionUi({ buf, msgid, emoji, nick, label, reactid }) {
        const net = buf.getNetwork();
        if (!label && net.ircClient.network.cap.enabled.includes('draft/labeled-response'))
            label = uuid();
        const _reactions = buf.state.reactions;
        const data = _reactions || { [msgid]: { [emoji]: [] } };
        if (!data[msgid]) data[msgid] = { [emoji]: [] };
        if (!data[msgid][emoji]) data[msgid][emoji] = [];
        if (!_reactions) buf.state.reactions = data;
        let entry = data[msgid][emoji].find(e => e.nick === nick);
        if (!entry) {
            entry = { nick, label, id: reactid };
            data[msgid][emoji].push(entry);
        }
        if (!_reactions) buf.state.reactions = data;
        const msg = cache[msgid] !== undefined ? cache[msgid] : buf.getMessages().find(m => m?.tags?.msgid === msgid);
        cache[msgid] = msg;
        if (msg) {
            msg[REACT_INTERNALS] && msg[REACT_INTERNALS].update();
        }
        const stored = { entry, arr: data[msgid][emoji], emoji, msgid };
        if (label) {
            buf.state.reaction_labels ??= {};
            buf.state.reaction_labels[label] = entry;
        }
        if (reactid) {
            buf.state.reaction_msgs ??= {};
            buf.state.reaction_msgs[reactid] = stored;
        }
        return entry;
    }
    /**
     * 
     * @param {{buf:import('../../kiwiirc/src/libs/state/BufferState').default}} param0 
     */
    function unsetReactionUi({ buf, msgid, emoji, nick }) {
        const _reactions = buf.state.reactions;
        const data = _reactions || { [msgid]: { [emoji]: [] } };
        if (!data[msgid]) data[msgid] = { [emoji]: [] };
        if (!data[msgid][emoji]) data[msgid][emoji] = [];
        if (!_reactions) buf.state.reactions = data;
        const idx = data[msgid][emoji].findIndex(e => e.nick === nick)
        idx !== -1 && data[msgid][emoji].splice(idx, 1);
        if (!_reactions) buf.state.reactions = data;
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
                                <span  class="message1-reaction-tip tooltip right center">Reaction</span>
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
                                    if (!buf.state.reactions) return;
                                    const react = buf.state.reaction_msgs[msgid];

                                    const { emoji, entry: { nick }, msgid: refid } = react;
                                    unsetReactionUi({ buf, msgid: refid, emoji, nick });
                                }
                            }
                            next();
                        })
                    parsed.use((event_name, event, client, next) => {
                        const buf = event?.target && network.bufferByName(event.target);
                        if (buf) {
                            if (buf.redactions?.[event?.tags?.msgid]) return;
                        }
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
                                    if (reactid && label) {
                                        const entry = buf.state?.reaction_labels?.[label];
                                        if (entry) {
                                            entry.id = reactid;
                                        }
                                    }
                                    setReactionUi({ buf, msgid, emoji, nick, label, reactid })
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