
/**
 * FFI'd `malloc()` and `free()` functions from libc
 */

var ffi = require('ffi')

module.exports = ffi.Library('libc', {
    'free': [ 'void', [ 'void *' ] ]
  , 'malloc': [ 'void *', [ 'size_t' ] ]
})
