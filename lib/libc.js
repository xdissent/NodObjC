
/**
 * Module dependencies.
 */

var ffi = require('ffi');

/**
 * Module exports.
 */

module.exports = ffi.Library('libc', {
  malloc: [ 'void*', [ 'size_t' ] ],
  free: [ 'void', [ 'void*' ] ]
});
