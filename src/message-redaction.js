const IrcMessage = require('irc-framework/src/ircmessage');

kiwi.plugin('message-redaction', function (kiwi, log) {
    kiwi.on('start',

        async () => {
            const redact = /* kiwi.Vue.createApp */({
                template: `<a v-if="message?.tags?.msgid" @click="redact" class="u-link kiwi-messageinfo-reply">
                            <svg-icon icon="fa fa-reply rotate-180"/>
                            Delete Message
                            </a>`,
                methods: {
                    redact() {
                        if (!this?.message?.tags?.msgid) return;
                        const messages = this.buffer.getMessages();
                        const idx = messages.indexOf(this.message);
                        if (idx >= 0) {
                            messages.splice(idx, 1);
                            /**
                             * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
                             */
                            const net = this.$state.getActiveNetwork();
                            net.ircClient.raw(new IrcMessage('REDACT', this.buffer.name, this.message.tags.msgid).to1459());
                        }
                    }
                },
                props: ['message', 'buffer']
            });
            kiwi.addUi('message_info', redact);
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
                    const TextFormatting = kiwi.require('helpers/TextFormatting');
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
                                    const messages = buf.getMessages();
                                    const idx = messages.findIndex(m => m?.tags?.msgid === msgid);
                                    if (idx !== -1) messages.splice(idx, 1);
                                    const messageBody = TextFormatting.formatText('action', {
                                        nick: event.nick,
                                        username: event.ident,
                                        host: event.hostname,
                                        text: event.params[event.params.length-1],
                                    });

                                    const message = {
                                        time: new Date(event.tags.time || Date.now()),
                                        server_time: new Date(event.tags.time || Date.now()),
                                        nick: event.nick,
                                        message: messageBody,
                                        type: event.type,
                                        tags: event.tags || {},
                                    };
                                    kiwi.state.addMessage(buf, message)
                                }
                            }

                            next();
                        })
                });
        })
})