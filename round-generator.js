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
    str += `(i64.shr_u (get_local $c_${i + 1 > 4 ? i - 4 : i + 1}) (i64.sub (get_local $w) (i64.const 1)))
(i64.shl (get_local $c_${i + 1 > 4 ? i - 4 : i + 1}) (i64.const 1))
(i64.or)
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

function rho () {
  str = ';; RHO\n\n'

  var x = 1
  var y = 0
  let _y = y

  for (let t = 0; t < 23; t++) {
    str += `(i64.shr_u (get_local $a_${(x + 5 * y) % 25}) (i64.sub (get_local $w) (i64.rem_u (i64.const ${(t + 1) * (t + 2) / 2}) (get_local $w))))
(i64.shl (get_local $a_${(x + 5 * y) % 25}) (i64.rem_u (i64.const ${(t + 1) * (t + 2) / 2}) (get_local $w)))
(i64.or)
(set_local $a_${(x + 5 * y) % 25})

`
    
    y = ((2 * x) + (3 * y)) % 5
    x = _y
    _y = y
  }

  return str
}

function pi () {
  let str = ';; PI\n\n'

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      var _x = y
      var _y = (2 * x + 3 * y) % 5

      str += `(set_local $a_${_x + 5 * _y} (get_local $a_${x + 5 * y}))\n`
    }
    str += '\n'
  }

  return str
}

function chi () {
  let str = ';; CHI\n\n'

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      str += `(set_local $a_${x + 5 * y} (i64.xor (i64.and (i64.xor (get_local $a_${(x + 1 + y * 5) % 25}) (i64.const -1)) (get_local $a_${(x + 2 + y * 5) % 25})) (get_local $a_${x + 5 * y})))\n`
    }
    str += '\n'
  }

  return str
}

function iota (i) {
return `;; IOTA\n
(set_local $lfsr (i64.const 1))
(set_local $shift (i64.const 0))
(set_local $j (i32.const 0))
(set_local $round_constant (i64.const 0))

(block $iota_end
    (loop $iota
        (i32.eq (get_local $j) (get_local $length))
        (br_if $iota_end)

        ;; count = j + 7 * i_r
        (get_local $j)
        (i64.const ${i})
        (i64.const 7)
        (i64.mul)
        (i64.add)
        (set_local $count)

        ;; j++
        (get_local $j)
        (i32.const 1)
        (i32.add)
        (set_local $j)

        ;; LFSR - polynomial: 101110001
        (block $inner_end
            (loop $inner
                (i64.eq (get_local $count) (i64.const 0))
                (br_if $inner_end)

                (get_local $count)
                (i64.const 1)
                (i64.sub)
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

  str += rho()
  str += pi()
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

var file = fs.createWriteStream('./output.txt', function (err) {
  if (err) console.err(err)
})

for (let i = 0; i < 25; i++) {
  file.write(round(i))
}

// loadFromState()

// for (let i = 0; i < 5; i ++) {
//   console.log(theta_3(i))
// }
