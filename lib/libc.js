
/**
 * FFI'd `malloc()` and `free()` functions from libc
 */

var ffi = require('ffi')

exports = module.exports = ffi.Library('libc', {
    'free': [ 'void', [ 'void *' ] ]
  , 'malloc': [ 'void *', [ 'size_t' ] ]
})

// XXX: remove this once node-ffi has a better mechanism for it
exports.malloc = (function (malloc) {
  return function (size) {
    return malloc(size).reinterpret(size)
  }
})(exports.malloc)
