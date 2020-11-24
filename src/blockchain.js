/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persistent storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const bitcoinMessage = require('bitcoinjs-message');

const Block = require('./block.js');
const Time = require('./time.js');

const MESSAGE_TIME_INDEX = 1;

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain().then();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if (this.height === -1) {
            let block = new Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            block.height = this.chain.length;
            block.time = Time.now();

            // Set previous block hash for non-genesis blocks
            if (this.chain.length > 0) {
                const previousBlock = this.chain[this.chain.length - 1];
                block.previousBlockHash = previousBlock.hash;
            }

            // Compute block hash and push to chain
            block.hash = SHA256(JSON.stringify(block)).toString();
            self.chain.push(block);

            // Validate chain, removing last added block if chain is invalid
            self.validateChain()
                .then(errorLog => {
                    if (errorLog.length > 0) {
                        self.chain.pop();
                        reject(errorLog);
                    } else {
                        resolve(block);
                    }
                });
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            const time = Time.now();
            const message = `${address}:${time}:starRegistry`;
            resolve(message);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            const messageTime = parseInt(message.split(':')[MESSAGE_TIME_INDEX]);
            const currentTime = Time.now();

            if (currentTime - messageTime < 5 * 60) {
                let verified =  bitcoinMessage.verify(message, address, signature);
                if (verified) {
                    const block = new Block({
                        owner: address,
                        message,
                        signature,
                        star
                    });
                    self._addBlock(block)
                        .then(block => resolve(block))
                        .catch(error => reject(error));
                } else {
                    reject('Signature is invalid');
                }
            } else {
                reject('Exceeded validation time of 5 minutes');
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           const [block] = self.chain.filter(block => block.hash === hash);
           if (block) {
               resolve(block);
           } else {
               reject("No block with given hash exists");
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if (block) {
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method returns a Promise that will resolve an array of Stars objects existing in the chain
     * that belong to the owner with the wallet address passed as the parameter.
     * Remember the star object should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        let self = this;
        return new Promise((resolve, reject) => {
            Promise.all(self.chain.map(block => block.getBData()))
                .then((decodedBlocks) => {
                    const stars = decodedBlocks
                        .filter(block => block && block.owner === address)
                        .map(block => block.star);

                    resolve(stars);
                })
                .catch(error => reject(error));
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise((resolve) => {
            // Go through each block and make sure stored hash of
            // previous block matches actual hash of previous block
            let validatePromises = [];
            self.chain.forEach((block, index) => {
                if (block.height > 0) {
                    const previousBlock = self.chain[index - 1];
                    if (block.previousBlockHash !== previousBlock.hash) {
                        const errorMessage = `Block ${index} previousBlockHash set to ${block.previousBlockHash}, but actual previous block hash was ${previousBlock.hash}`;
                        errorLog.push(errorMessage);
                    }
                }

                // Store promise to validate each block
                validatePromises.push(block.validate());
            });

            // Collect results of each block's validate call
            Promise.all(validatePromises)
                .then(validatedBlocks => {
                    validatedBlocks.forEach((valid, index) => {
                        if (!valid) {
                            const invalidBlock = self.chain[index];
                            const errorMessage = `Block ${index} hash (${invalidBlock.hash}) is invalid`;
                            errorLog.push(errorMessage);
                        }
                    });

                    resolve(errorLog);
                });
        });
    }

}

module.exports.Blockchain = Blockchain;   