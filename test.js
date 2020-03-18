const Keccak = require('./')
const crypto = require('crypto')
const tape = require('tape')
const jsRef = require('js-sha3')

const hashes = [
  'sha3_224',
  'sha3_256',
  'sha3_384',
  'sha3_512',
  'keccak224',
  'keccak256',
  'keccak384',
  'keccak512',
]

hashes.map(type => {
  // timing benchmark
  {
    console.log(type)
    const buf = Buffer.alloc(128)
    crypto.randomFillSync(buf)

    const hash = Keccak[type]()
    const jsHash = jsRef[type].create()

    console.time('wasm')
    for (let i = 0; i < 100000; i++) {
      hash.update(buf)
    }
    const res = hash.digest('hex')
    console.timeEnd('wasm')

    console.time('js')
    for (let i = 0; i < 100000; i++) {
      jsHash.update(buf)
    }
    const jsRes = Buffer.from(jsHash.digest()).toString('hex')
    console.timeEnd('js')
    console.log('')
    // console.log('\nhashes are consistent: ', res === jsRes)
  }
})

hashes.map(type => {
  tape('empty input', function (t) {
    const hash = Keccak[type]().digest('hex')
    const ref = Buffer.from(jsRef[type].digest('')).toString('hex')
    t.equal(hash, ref, 'consistent for empty input')
    t.end()
  })

  tape('naive input fuzz', function (t) {
    for (let i = 0; i < 100; i++) {
      const buf = crypto.randomBytes(2 ** 18 * Math.random())

      const hash = Keccak[type]().update(buf).digest('hex')
      const ref = Buffer.from(jsRef[type].update(buf).digest()).toString('hex')

      if (hash !== ref) console.log(buf.length)
      t.ok(hash === ref)
    }
    t.end()
  })

  tape.skip('test power of 2 length buffers', function (t) {
    for (let i = 0; i < 29; i++) {  
      const hash = Keccak[type]()
      const refHash = jsRef[type].create()
      
      const buf = Buffer.alloc(2 ** i)

      const test = hash.update(buf).digest('hex')
      const ref = Buffer.from(refHash.update(buf).digest()).toString('hex')

      t.ok(test === ref)
    }
    t.end()
  })

  tape('fuzz multiple updates', function (t) {
    const hash = Keccak[type]()
    const refHash = jsRef[type].create()

    for (let i = 0; i < 2; i++) {  
      const buf = crypto.randomBytes(2**16 * Math.random())

      hash.update(buf)
      refHash.update(buf)
    }

    t.same(hash.digest('hex'), Buffer.from(refHash.digest()).toString('hex'), 'multiple updates consistent')
    t.end()
  })

  tape('several instances updated simultaneously', function (t) {
    const hash1 = Keccak[type]()
    const hash2 = Keccak[type]()
    const refHash = jsRef[type].create()

    const buf = Buffer.alloc(1024)

    for (let i = 0; i < 10; i++) {
      crypto.randomFillSync(buf)

      if (Math.random() < 0.5) {
        hash1.update(buf)
        hash2.update(buf)
      } else {
        hash2.update(buf)
        hash1.update(buf)
      }
      refHash.update(buf)
    }

    const res = Buffer.from(refHash.digest()).toString('hex')
    const res1 = hash1.digest('hex')
    const res2 = hash2.digest('hex')

    t.equal(res, res1, 'consistent with reference')
    t.equal(res1, res2, 'consistent with eachother')
    t.end()
  })

  tape('reported bugs', function (t) {
    const testBuf = Buffer.from('hello')

    const res = Buffer.from(jsRef[type].update(testBuf).digest()).toString('hex')
    const res1 = Keccak[type]().update(testBuf).digest('hex')
    const res2 = Keccak[type]().update(testBuf).digest('hex')

    t.equal(res, res1)
    t.equal(res1, res2)
    t.end()
  })
})
