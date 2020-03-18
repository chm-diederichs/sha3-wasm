# sha3-wasm
[![Build Status](https://travis-ci.org/chm-diederichs/sha3-wasm.svg?branch=master)](https://travis-ci.org/chm-diederichs/sha3-wasm)

Keccak-p based hash functions implemented in WebAssembly.

## Usage
```js
const Keccak = require('sha3-wasm')

if (!Keccak.SUPPORTED) {
  console.log('WebAssembly not supported by your runtime')
}

const examples = {}
var results = {}

examples.sha224 = Keccak.sha224()
examples.sha256 = Keccak.sha256()
examples.sha384 = Keccak.sha384()
examples.sha512 = Keccak.sha512()

examples.keccak224 = Keccak.keccak224()
examples.keccak256 = Keccak.keccak256()
examples.keccak384 = Keccak.keccak384()
examples.keccak512 = Keccak.keccak512()

examples.SHAKE128 = Keccak.SHAKE128(192)
examples.SHAKE256 = Keccak.SHAKE256(192)

Object.keys(examples).map(key => {
  results[key] = examples[key].update('Hello, World!').digest('hex')
})

Object.entries(results).forEach((key, value) => console.log(key + ': ' + result))
/*
sha224: 853048fb8b11462b6100385633c0cc8dcdc6e2b8e376c28102bc84f2
sha256: 1af17a664e3fa8e419b8ba05c2a173169df76162a5a286e0c405b460d478f7ef
sha384: aa9ad8a49f31d2ddcabbb7010a1566417cff803fef50eba239558826f872e468c5743e7f026b0a8e5b2d7a1cc465cdbe
sha512: 38e05c33d7b067127f217d8c856e554fcff09c9320b8a5979ce2ff5d95dd27ba35d1fba50c562dfd1d6cc48bc9c5baa4390894418cc942d968f97bcb659419ed
keccak224: 4eaaf0e7a1e400efba71130722e1cb4d59b32afb400e654afec4f8ce
keccak256: acaf3289d7b601cbd114fb36c4d29c85bbfd5e133f14cb355c3fd8d99367964f
keccak384: 4d60892fde7f967bcabdc47c73122ae6311fa1f9be90d721da32030f7467a2e3db3f9ccb3c746483f9d2b876e39def17
keccak512: eda765576c84c600ed7f5d97510e92703b61f5215def2a161037fd9dd1f5b6ed4f86ce46073c0e3f34b52de0289e9c618798fff9dd4b1bfe035bdb8645fc6e37
SHAKE128: 2bf5e6dee6079fad604f573194ba8426bd4d30eb13e8ba2e
SHAKE256: b3be97bfd978833a65588ceae8a34cf59e95585af62063e6
*/
```

## API

The following functions are exposed directly:

- `sha224`
- `sha256`
- `sha384`
- `sha512`
- `keccak224`
- `keccak256`
- `keccak384`
- `keccak512`
- `SHAKE128`
- `SHAKE256`

Otherwise, a low-level API is also exposed:

### Hashes

#### `const hash = new Hash(bitrate, padRule, digestLength)`

Instantiate a new hash instance.

_Constants_

- `KECCAK_PAD_RULE` (default)
- `SHA3_PAD_RULE`
- `SHAKE_PAD_RULE`

`bitrate` paramaterises the hash function; for `k` bits of desired security, use `bitrate = (1600 - k) / 2`. Keccak uses a sponge construction allowing for arbitrary length output, this may be specified by `digestLength` otherwise it is calculated from the bitrate by default.

#### `hash.update(data, [enc])`

Update the hash with a given input. Input may be passed as a `buffer` or as a `string` with encoding specified by `enc`.

#### `hash.digest([enc, offset])`

Compute the digest of the hash. If `enc` is specified, the digest shall be returned as an `enc` encoded string, otherwise a `buffer` is returned.

An exisiting `Uint8Array` may be passed as `enc` to write the hash to a preallocated buffer at a given `offset`.

### Extended Output Functions

#### const XOF = new SHAKE(bitrate, outputBits)

Instantiate a SHAKE xof instance with a given `bitrate` and desire output length, `outputBits`

#### `XOF.update(data, [enc])`

Update the hash with a given input. Input may be passed as a `buffer` or as a `string` with encoding specified by `enc`.

#### `XOF.digest([enc, offset])`

Compute the digest, matches the hash API above.

## License

MIT
