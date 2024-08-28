const { v4: uuid } = require('uuid');
const UI_MESSAGES = ['PRIVMSG', 'NOTICE'];
kiwi.plugin('labeled-response', function (kiwi, log) {
    kiwi.on('input.command.*', async (evt) => {
        evt.tags ??= {};
        if (!evt.tags.label) evt.tags.label = uuid();
    });
    kiwi.on('start', async () => {
        /**
         * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
         */
        const network = kiwi.state.getActiveNetwork();
        network.ircClient.use((client, raw, parsed) => {
            raw.use(
                /**
                 * 
                 * @param {string} event_name 
                 * @param {import('irc-framework/src/ircmessage')} event 
                 * @param {*} next 
                 * @returns 
                 */
                (event_name, event, line, client, next) => {
                    if (event?.tags?.label && event?.tags?.msgid && UI_MESSAGES.includes(event_name.toUpperCase())) {
                        const target = event.params[0];
                        const buf = network.bufferByName(target);
                        if (buf) {
                            const msg = buf.getMessages().find(m => m?.tags?.label === event.tags.label);
                            if (msg) {

                                msg.tags.msgid = event.tags.msgid;
                                return;
                            }
                        }
                    }
                    next();
                });
        })
    })
})