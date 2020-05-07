const assert = require('nanoassert')

const wasm = require('./keccak.js')({
  imports: {
    debug: {
      log (...args) {
        console.log(...args.map(int => (int >>> 0).toString(16).padStart(8, '0')))
      },
      log_tee (arg) {
        console.log((arg >>> 0).toString(16).padStart(8, '0'))
        return arg
      }
    }
  }
})

let head = 0
const freeList = []

const SHA3_PAD_FLAG = 0
const KECCAK_PAD_FLAG = 1
const SHAKE_PAD_FLAG = 2

module.exports = {
  Hash,
  Sha3,
  Keccak,
  SHAKE
}

module.exports.sha3_224 = () => Sha3(1152)
module.exports.sha3_256 = () => Sha3(1088)
module.exports.sha3_384 = () => Sha3(832)
module.exports.sha3_512 = () => Sha3(576)


module.exports.keccak224 = () => Keccak(1152)
module.exports.keccak256 = () => Keccak(1088)
module.exports.keccak384 = () => Keccak(832)
module.exports.keccak512 = () => Keccak(576)

module.exports.SHAKE128 = outputBits => SHAKE(1344, outputBits)
module.exports.SHAKE256 = outputBits => SHAKE(1088, outputBits)

function Sha3(bitrate) {
  return new Hash(bitrate, SHA3_PAD_FLAG)
}

function Keccak (bitrate) {
  return new Hash(bitrate, KECCAK_PAD_FLAG)
}

function SHAKE (bitrate, outputBits) {
  return new Hash(bitrate, SHAKE_PAD_FLAG, outputBits)
}

function Hash (bitrate = 1088, padRule = KECCAK_PAD_FLAG, digestLength) {
  if (!(this instanceof Hash)) return new Hash(bitrate, padRule, digestLength)
  if (!(wasm && wasm.exports)) throw new Error('WASM not loaded. Wait for Keccak.ready(cb)')

  if (!freeList.length) {
    freeList.push(head)
    head += 208 // need 100 bytes for internal state
  }

  this.finalized = false
  this.bitrate = bitrate
  this.digestLength = digestLength || (1600 - bitrate) / 2
  this.pointer = freeList.pop()
  this.alignOffset = 0
  this.inputLength = 0
  this.padRule = padRule

  if (this.pointer + this.digestLength > wasm.memory.length) wasm.realloc(this.pointer + 208)

  wasm.memory.fill(0, this.pointer, this.pointer + 208)
  wasm.exports.init(this.pointer, this.bitrate)
}

Hash.prototype.update = function (input, enc) {
  assert(this.finalized === false, 'Hash instance finalized')

  if (head % 8 !== 0) head += 8 - head % 8
  assert(head % 8 === 0, 'input shoud be aligned for int64')

  let [ inputBuf, length ] = formatInput(input, enc)
  
  assert(inputBuf instanceof Uint8Array, 'input must be Uint8Array or Buffer')
  
  if (head + this.alignOffset + length > wasm.memory.length) wasm.realloc(head + length)
  
  wasm.memory.fill(0, head, head + this.alignOffset + length)
  wasm.memory.set(inputBuf, head + this.alignOffset)


  this.alignOffset = wasm.exports.absorb(this.pointer, head, head + this.alignOffset + length)
  this.inputLength += length

  return this
}

Hash.prototype.digest = function (enc, offset = 0, digestLength) {
  assert(this.finalized === false, 'Hash instance finalized')

  if (digestLength && this.padRule === SHAKE_PAD_FLAG) this.digestLength = digestLength
  assert(this.digestLength, 'digestLength must be specified')

  this.finalized = true
  freeList.push(this.pointer)

  const padLen = wasm.exports.pad(this.bitrate, head + this.alignOffset, this.inputLength, this.padRule)

  if (this.alignOffset) wasm.memory.fill(0, head, head + this.alignOffset)

  wasm.exports.absorb(this.pointer, head, head + this.alignOffset + padLen)
  wasm.exports.squeeze(this.pointer, head, this.digestLength / 8)

  const resultBuf = Buffer.from(wasm.memory.subarray(head, head + this.digestLength / 8))

  if (!enc) {    
    return resultBuf
  }

  if (typeof enc === 'string') {
    return resultBuf.toString(enc)
  }

  assert(enc instanceof Uint8Array, 'input must be Uint8Array or Buffer')
  assert(enc.byteLength >= this.digestLength + offset, 'input not large enough for digest')

  for (let i = 0; i < this.digestLength; i++) {
    enc[i + offset] = resultBuf[i]
  }

  return enc
}

Hash.ready = function (cb) {
  if (!cb) cb = noop
  if (!wasm) return cb(new Error('WebAssembly not supported'))

  var p = new Promise(function (reject, resolve) {
    wasm.onload(function (err) {
      if (err) resolve(err)
      else reject()
      cb(err)
    })
  })

  return p
}

Hash.prototype.ready = Hash.ready

module.exports.SUPPORTED = typeof WebAssembly !== 'undefined'

function noop () {}

function formatInput (input, enc = null) {
  let result
  if (Buffer.isBuffer(input)) {
    result = input
  } else {
    result = Buffer.from(input, enc)
  }

  return [result, result.byteLength]
}
