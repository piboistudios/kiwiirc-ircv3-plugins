const { v4: uuid } = require('uuid');
const UI_MESSAGES = ['PRIVMSG', 'NOTICE'];
kiwi.plugin('labeled-response', function (kiwi, log) {
    kiwi.on('input.command.*', async (evt) => {
        /**
         * because message gets rendered in UI and tags are set 
         * before they reach ircClient.raw...
         */
        evt.tags ??= {};
        if (!evt.tags.label) evt.tags.label = uuid();
    });
    /**
  * @type {typeof import('irc-framework/src/ircmessage')}
  */
    const { Message: IrcMessage } = require('irc-framework')
    kiwi.on('start', () => {
        /**
         * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
         */
        const network = kiwi.state.getActiveNetwork();
        /**
         * because not all messages sent by client are input.commands....
         */
        network.ircClient.use((client, raw, parsed) => {
            const { ircClient } = network;
            ircClient.raw = function raw(input) {
                log.debug("input?", input, "is IrcMessage?", input instanceof IrcMessage);
                // have to duck type...
                if (!(input.to1459 instanceof Function)) {
                    const msg = new IrcMessage(...(input instanceof Array ? input : arguments));
                    input = msg;
                }

                input.tags.label ??= uuid();
                log.debug("sending", input);
                return this.connection.write(input.to1459());

            }
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