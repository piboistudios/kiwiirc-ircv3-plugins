const parseIrcLine = require('irc-framework/src/irclineparser');
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
    function getLabeledBuffer(state, buffer, message) {
        const label = message?.tags?.label;
        if (label !== undefined) {
            state.labelBuffer ??= {};
            if (!state.labelBuffer?.[label]) {
                state.labelTimestamps ??= [];
                const timestamp = Date.now();
                state.labelBuffer[label] = buffer;
                state.labelTimestamps.push({ label, timestamp });
                let i = 0;
                for (; i < state.labelTimestamps.length; i++) {
                    const entry = state.labelTimestamps[i];
                    if (entry.timestamp > timestamp - (1000 * 60)) {
                        break;
                    }
                }
                log.debug(
                    'removing entries:',
                    i,
                    { ...state.labelBuffer },
                    state.labelTimestamps.slice()
                );
                if (i > 0) {
                    const entriesToRemove = state.labelTimestamps
                        .splice(0, i);
                    entriesToRemove.forEach((e) => {
                        delete state.labelBuffer[e.label];
                    });
                }
            } else {
                buffer = state.labelBuffer[label];
            }
        }
        return buffer;
    }
    const addMessage = kiwi.state.addMessage.bind(kiwi.state);
    kiwi.state.addMessage = function addPotentiallyLabeledMessage(buffer, message) {
        return addMessage(getLabeledBuffer(kiwi.state, buffer, message), message);
    }
    /**
  * @type {typeof import('irc-framework/src/ircmessage')}
  */
    const { Message: IrcMessage, ircLineParser } = require('irc-framework')
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
                // have to duck type...
                if (!(input.to1459 instanceof Function)) {
                    if (typeof input === 'string' && input.indexOf(' ') !== -1) {
                        input = parseIrcLine(input);
                    } else {

                        const msg = new IrcMessage(...(input instanceof Array ? input : arguments));
                        input = msg;
                    }
                }

                input.tags.label ??= uuid();
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
                            const msg = buf.getMessages().find(m => m?.tags?.label && m.tags.label === event.tags.label);
                            if (msg) {
                                log.debug('not rendering labeled msg');
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