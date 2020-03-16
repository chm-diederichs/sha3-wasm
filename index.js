const assert = require('nanoassert')
keccak512 = require('js-sha3').keccak512;

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

function Keccak (bitrate = 576, wordLength = 64) {
  if (!(this instanceof Keccak)) return new Keccak()
  if (!(wasm && wasm.exports)) throw new Error('WASM not loaded. Wait for Keccak.ready(cb)')

  if (!freeList.length) {
    freeList.push(head)
    head += 224 // need 100 bytes for internal state
  }

  this.finalized = false
  this.bitrate = bitrate
  this.digestLength = 1600 - bitrate / 2
  this.pointer = freeList.pop()
  this.alignOffset = 0
  this.inputLength = 0

  wasm.exports.init(this.pointer, this.bitrate, wordLength)

  if (this.pointer + this.digestLength > wasm.memory.length) wasm.realloc(this.pointer + 100)
}

Keccak.prototype.update = function (input, enc) {
  assert(this.finalized === false, 'Hash instance finalized')

  if (head % 8 !== 0) head += 8 - head % 8
  assert(head % 8 === 0, 'input shoud be aligned for int64')

  let [ inputBuf, length ] = formatInput(input, enc)
  
  assert(inputBuf instanceof Uint8Array, 'input must be Uint8Array or Buffer')
  
  if (head + length > wasm.memory.length) wasm.realloc(head + length)
  
  if (this.alignOffset) wasm.memory.fill(0, head, head + this.alignOffset)
  wasm.memory.set(inputBuf, head + this.alignOffset)
  
  this.alignOffset = wasm.exports.absorb(this.pointer, head, head + this.alignOffset + length)
  this.inputLength += length
  return this
}

Keccak.prototype.digest = function (digestLength, enc, offset = 0) {
  assert(this.finalized === false, 'Hash instance finalized')

  this.finalized = true
  freeList.push(this.pointer)

  const padLen = wasm.exports.pad(this.bitrate, head + this.alignOffset, this.inputLength)
  wasm.exports.absorb(this.pointer, head, head + this.alignOffset + padLen)
  wasm.exports.f_permute(this.pointer)

  wasm.exports.squeeze(this.pointer, head, digestLength)
  const resultBuf = Buffer.from(wasm.memory.subarray(head, head + digestLength / 8))

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

Keccak.ready = function (cb) {
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

Keccak.prototype.ready = Keccak.ready

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
