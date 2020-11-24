# Private Blockchain Application

Run the application with the following command from the root directory:

```
node app.js
```

Be sure you run `npm install` before trying to run the application.

## Notes

1. The route `submitstar` was renamed to `submitStar` for consistency.

2. The existing routes for getting a block by height/hash were functionally identical (`GET /block/:height` vs `GET /block/:hash`). This resulted in the first defined route overriding the second, meaning that the code for `GET /block/:hash` was never reached.

   To resolve this, I renamed the route to get blocks by hash to be `/block/hash/:hash`.
   
## Images

1. Get Genesis block: ![Get Genesis block](images/get_genesis_block.png)

2. Get block by hash (notice the modified route): ![Get block by hash](images/get_block_by_hash.png)

3. Request validation: ![Request validation](images/request_validation.png)

4. Sign message: ![Sign message](images/sign_message.png)

5. Submit star: ![Submit star](images/submit_star.png)

6. Get stars by wallet address: ![Get stars by wallet address](images/get_stars_by_wallet_address.png)

7. Validate chain (returns an empty array if there are no errors): ![Validate chain](images/validate_chain.png)