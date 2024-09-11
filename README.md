# Pump trader
Pump.fun sniping bot that can buy and sell tokens.

## Trading rules
- buy and sell transaction costs 0.000145 SOL to network
- pump.fun fee is paid only when buying (~0,00001 SOL)
- on first buy you have to create associated token account that costs 0.00203928 SOL
- transaction confirmation time

## Development roadmap
- [X] Get token info
- [X] Buy tokens
- [X] Sell tokens
- [X] List bought tokens
- [X] Listen new token mint events from websocket
- [ ] Calculate exact profit & costs (historic and realtime)
- [ ] Sandbox transactions to train strategy
- [ ] Train model to decise when to sell and buy with tensorflow