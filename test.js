const Keccak = require('./')
const crypto = require('crypto')
const tape = require('tape')
const jsRef = require('js-sha3').keccak256
// const vectors = require('./vectors.json')

// // timing benchmark
// {
//   const buf = Buffer.alloc(8192)
//   crypto.randomFillSync(buf)

//   const hash = new Keccak(576)
//   const jsHash = jsRef.create()

//   console.time('wasm')
//   for (let i = 0; i < 1000; i++) {
//     hash.update(buf)
//   }
//   const res = hash.digest('hex')
//   console.timeEnd('wasm')

//   console.time('js')
//   for (let i = 0; i < 1000; i++) {
//     jsHash.update(buf)
//   }
//   const jsRes = Buffer.from(jsHash.digest()).toString('hex')
//   console.timeEnd('js')
//   console.log(jsRes)
//   console.log(res)
//   console.log('\nhashes are consistent: ', res === jsRes)
// }

tape('empty input', function (t) {
  const hash = new Keccak(1088).digest('hex')
  const ref = Buffer.from(jsRef.digest('')).toString('hex')
  console.log(hash)
  t.equal(hash, ref, 'consistent for empty input')
  t.end()
})

tape('naive input fuzz', function (t) {
  for (let i = 0; i < 10; i++) {
    const buf = crypto.randomBytes(2 ** 18 * Math.random())

    const hash = Keccak(1088).update(buf).digest('hex')
    const ref = Buffer.from(jsRef.update(buf).digest()).toString('hex')

    if (hash !== ref) console.log(buf.length)
    t.ok(hash === ref)
  }
  t.end()
})

tape.skip('test power of 2 length buffers', function (t) {
  for (let i = 0; i < 25; i++) {  
    const hash = Keccak(1088)
    const refHash = jsRef.create()
    
    const buf = Buffer.alloc(2 ** i)

    const test = hash.update(buf).digest('hex')
    const ref = Buffer.from(refHash.update(buf).digest()).toString('hex')

    t.ok(test === ref)
  }
  t.end()
})

tape('fuzz multiple updates', function (t) {
  const hash = Keccak(1088)
  const refHash = jsRef.create()

  for (let i = 0; i < 2; i++) {  
    const buf = crypto.randomBytes(2**16 * Math.random())

    hash.update(buf)
    refHash.update(buf)
  }

  t.same(hash.digest('hex'), Buffer.from(refHash.digest()).toString('hex'), 'multiple updates consistent')
  t.end()
})

tape('several instances updated simultaneously', function (t) {
  const hash1 = Keccak(1088)
  const hash2 = Keccak(1088)
  const refHash = jsRef.create()

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

  const res = Buffer.from(jsRef.update(testBuf).digest()).toString('hex')
  const res1 = Keccak(1088).update(testBuf).digest('hex')
  const res2 = Keccak(1088).update(testBuf).digest('hex')

  t.equal(res, res1)
  t.equal(res1, res2)
  t.end()
})
