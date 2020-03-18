# sha3-wasm

Keccak hash functions implemented in WebAssembly.

*NOTICE*: Currently only Keccak hash functions are exposed, NOT the [FIPS-202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf) specification of SHA3.

## Usage
```js
const Keccak = require('keccak-wasm')

// default is 256bit
const hash = new Keccak()
    .update(Buffer.from('testing'))
    .update('testing')
    .update('1234567890abcdef', 'hex')
    .digest()

console.log(Buffer.isBuffer(hash))
// true

console.log('hash:', hash.toString('hex'))
// hash: 750d203ee2a80cd3b09b194978a1278d3989ee023efb96d7a2b3181c9eb29623
```
## API

#### `const hash = new Keccak([bitrate = 1088])`

Instantiate a new hash instance. `bitrate` paramaterises the hash function; for `k` bits of desired security, use `bitrate = (1600 - k) / 2` (will soon be changed to explicitly set desired security).

#### `hash.update(data, [enc])`

Update the hash with a given input. Input may be passed as a `buffer` or as a `string` with encoding specified by `enc`.

#### `hash.digest([enc, digestLength, offset])`

Compute the digest of the hash. If `enc` is specified, the digest shall be returned as an `enc` encoded string, otherwise a `buffer` is returned. Keccak may produced arbitrary length outputs, so `digestLength` may be specified in bits, otherwise the security parameter of the hash is used by default.

An exisiting `UInt8Array` may be passed as `enc` to write the hash to a preallocated buffer at a given `offset`.

## License

MIT
