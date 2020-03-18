const fs = require('fs')

function round (i) {
  return `;; ROUND ${i}
  `
}

function theta_1(i) {
  let str = ';; THETA\n\n'

  for (let i = 0; i < 5; i++) {
    str += `(set_local $c_${i} (get_local $a_${i}))\n`
  }
  str += '\n'
  return str
}


function theta_2() {
  let str = ''
  for (let i = 0; i < 5; i++) {
    for (let j = 1; j < 5; j++) {
      str += `(set_local $c_${i} (i64.xor (get_local $c_${i}) (get_local $a_${5*j + i})))\n`
    }
    str += i < 4 ? `\n` : ''
  }
  str += '\n'
  return str
}

function theta_3(i) {
  let str = ''
  for (let i = 0; i < 5; i++) {
    str += `(i64.rotl (get_local $c_${i + 1 > 4 ? i - 4 : i + 1}) (i64.const 1))
(get_local $c_${(i - 1) < 0 ? 4 + i : i - 1})
(i64.xor)
(set_local $d_${i})\n
`

    for (let j = 0; j < 5; j++) {
      str += `(set_local $a_${i + 5*j} (i64.xor (get_local $a_${i + 5*j}) (get_local $d_${i})))\n` 
    }
    str += '\n'
  }

  return str
}

function rho_pi () {
  str = ';; RHO & PI\n\n(set_local $b_0 (get_local $a_0))\n\n'

  var x = 1
  var y = 0
  let _y = y

  for (let t = 0; t < 24; t++) {
    str += (t + 1) * (t + 2) / 2 < 33
      ?`(i64.rotl (get_local $a_${(x + 5 * y) % 25}) (i64.const ${((t + 1) * (t + 2) / 2) % 64}))
(set_local $b_${(y + 5 * (((2 * x) + (y * 3)) % 5) % 25)})

`
      :`(i64.rotr (get_local $a_${(x + 5 * y) % 25}) (i64.const ${64 - (((t + 1) * (t + 2) / 2) % 64)}))
(set_local $b_${(y + 5 * (((2 * x) + (y * 3)) % 5) % 25)})

`
    
    y = ((2 * x) + (3 * y)) % 5
    x = _y
    _y = y
  }

  return str
}

function chi () {
  let str = ';; CHI\n\n'

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      str += `(set_local $a_${x + 5 * y} (i64.xor (i64.and (i64.xor (get_local $b_${((x + 1) % 5 + y * 5) % 25}) (i64.const -1)) (get_local $b_${((x + 2) % 5 + y * 5) % 25})) (get_local $b_${x + 5 * y})))\n`
    }
    str += '\n'
  }

  return str
}

function iota (i) {
  const rc = [
    '0x0000000000000001', '0x0000000000008082', '0x800000000000808A', '0x8000000080008000',
    '0x000000000000808B', '0x0000000080000001', '0x8000000080008081', '0x8000000000008009',
    '0x000000000000008A', '0x0000000000000088', '0x0000000080008009', '0x000000008000000A',
    '0x000000008000808B', '0x800000000000008B', '0x8000000000008089', '0x8000000000008003',
    '0x8000000000008002', '0x8000000000000080', '0x000000000000800A', '0x800000008000000A',
    '0x8000000080008081', '0x8000000000008080', '0x0000000080000001', '0x8000000080008008'
  ]
  return `;; IOTA\n
(get_local $a_0)
(i64.const ${rc[i]})
(i64.xor)
(set_local $a_0)\n\n`

return `;; IOTA\n
(set_local $lfsr (i64.const 0))
(set_local $shift (i64.const 1))
(set_local $round_constant (i64.const 0))

;; count = j + 7 * i_r
(i32.const ${i})
(i32.const 7)
(i32.mul)
(set_local $count)

(block $iota_end
    (loop $iota
        (i64.gt_u (get_local $shift) (get_local $length))
        (br_if $iota_end)

        ;; LFSR - polynomial: 101110001
        (block $inner_end
            (loop $inner
                (i32.eq (get_local $count) (i32.const 0))
                (br_if $inner_end)

                (get_local $count)
                (i32.const 1)
                (i32.sub)
                (set_local $count)

                ;; shift the registers by 1
                (get_local $lfsr)
                (i64.const 1)
                (i64.shr_u)
                (set_local $lfsr)

                ;; if high bit set, propogate by xor at positions 6, 5, 4, 1
                (if (i64.and (get_local $lfsr) (i64.const 0x100))
                    (then
                        (get_local $lfsr)
                        (i64.const 0x71)
                        (i64.xor)
                        (set_local $lfsr)))

                (br $inner)))

        ;; round_constant |= lfsr_bit << (shift - 1)
        (get_local $lfsr)
        (i64.const 0x1)
        (i64.and)
        (get_local $shift)
        (i64.const 1)
        (i64.sub)
        (i64.shr_u)
        (get_local $round_constant)
        (i32.xor)
        (set_local $round_constant)

        ;; shift = 2 ** j
        (i64.const 2)
        (get_local $shift)
        (i64.mul)
        (set_local $shift)

        ;; j++
        (get_local $count)
        (i32.const 1)
        (i32.add)

        (br $iota)))

(get_local $a_0)
(get_local $round_constant)
(i64.xor)
(set_local $a_0)\n\n`
}

function rc (t) {
  var lfsr = 1

  for (let i = 0; i < t; i++) {
    lfsr <<= 1
    if (lfsr & 0x100) {
      lfsr ^= 0x71
    }
    console.log(lfsr)
  }

  return lfsr & 0x1
}

function lsfr (l) {
  var RC = []

  for (let i = 0; i < 24; i++) {
    var result = 0x0n
    var shift = 1n
    
    for (let j = 0; j < 7; j++) {
      var bit = BigInt(rc(j + 7 * i))
      result |= bit << (shift - 1n)
      shift *= 2n
    }


    result = result < 0n ? result | 0x8000000000000000n : result
    console.log(result)
    RC.push(result.toString(16).padStart(16))
  }
  return RC
}

function round (i) {
  let str = `;; ROUND ${i}\n\n`

  str += theta_1()
  str += theta_2()
  str += theta_3()

  str += rho_pi()
  str += chi()
  str += iota(i)
  str += '\n'

  return str
}

function squeeze (n) {
  for (let i = 1; i < n; i++) {
    console.log(`(call $f_permute (get_local $state))

(get_local $output)
(get_local $state)
(i64.load)
(i64.store offset=${i*8})

`)
  }
}

function loadFromState () {
  for (let i = 0; i < 25; i++) {
    console.log(`(i64.load offset=${8*i} (get_local $state))
(set_local $a_${i})

`)
  }
}

function storeToState () {
  for (let i = 0; i < 25; i++) {
    console.log(`(get_local $state)
(get_local $a_${i})
(i64.store offset=${8*i})

`)
  }
}

function squeezeOutput () {
  for (let i = 0; i < 25; i++) {
    console.log(`(get_local $output)
(i64.load offset=${8*i} (get_local $state))
(i64.store offset=${8*i})
(set_local $i (i64.add (get_local $i) (i64.const 64)))
(i64.ge (get_local $i) (get_local $bits))
(br_if $squeeze_end)\n`)
  }
}

console.log(chi())
var file = fs.createWriteStream('./output.txt', function (err) {
  if (err) console.err(err)
})

squeezeOutput() 
for (let i = 0; i < 24; i++) {
  file.write(round(i))
}

// storeToState()
// loadFromState()

// for (let i = 0; i < 5; i ++) {
//   console.log(theta_3(i))
// }
