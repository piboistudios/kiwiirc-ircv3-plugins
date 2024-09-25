kiwi.plugin('standard-replies', async function(kiwi, log){
      /**
  * @type {typeof import('irc-framework/src/ircmessage')}
  */
      const { Message: IrcMessage, ircLineParser } = require('irc-framework')
      await new Promise((resolve) => kiwi.on('start', resolve));
  
      /**
       * @type {import('../../kiwiirc/src/libs/state/NetworkState').default}
       */
      const network = kiwi.state.getActiveNetwork();
      const {ircClient} = network;
      ircClient.use((client, raw, parsed) => {
        parsed.use((event_name, event, client, next) => {
            if (event_name === 'standard reply') {
                const {
                    description,
                } = event;
                const serverBuf = network.serverBuffer();
                kiwi.state.addMessage(serverBuf, {
                    ...event,
                    message: description,
                    type: 'server_message'
                });
            }
        });
      });
})