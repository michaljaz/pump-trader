![Zrzut ekranu 2024-09-23 121249](https://github.com/user-attachments/assets/f30fff47-783e-4b35-a794-10ecd3453f29)

# Pump trader

Pump.fun sniping bot that can buy and sell tokens.

## Trading rules
- buy and sell transaction costs 0.000145 SOL to network
- pump.fun fee is paid only when buying (~0,00001 SOL)
- on first buy you have to create associated token account that costs 0.00203928 SOL
- transaction confirmation time around 10 seconds (could be super fast, but with only broadcast)

## Development roadmap
- [X] Get token info
- [X] Buy tokens
- [X] Sell tokens
- [X] List bought tokens
- [X] Listen new token mint events from websocket
- [X] Get whole historic account transactions
- [X] Calculate profit and loss from each transaction
- [ ] Sandbox transactions to train strategy
- [ ] Train model to decide whether to sell or buy with tensorflow
- [ ] Run bot on production with 0.01 SOL
