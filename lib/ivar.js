
/**
 * Represents an Objective-C class "ivar", or instance variable.
 */

/*!
 * Module exports.
 */

exports = module.exports = Ivar
exports.wrap = wrap

/*!
 * Module dependencies.
 */

var debug = require('debug')('NodObjC:ivar')
  , assert = require('assert')
  , ref = require('ref')
  , ffi = require('ffi')

/*!
 * Comply with ref's "type" interface.
 */

exports.name = 'Ivar'
exports.indirection = 1
exports.size = ref.sizeof.pointer
exports.alignment = ref.alignof.pointer
exports.ffi_type = ffi.FFI_TYPES.pointer
exports.get = function get (buffer, offset) {
  var ptr = buffer.readPointer(offset)
  return exports.wrap(ptr)
}
exports.set = function set (buffer, offset, value) {
  var ptr = ref.NULL
  if (value) {
    if (Buffer.isBuffer(value)) {
      ptr = value
    } else { // instanceof Ivar
      ptr = value.pointer
    }
  }
  assert(Buffer.isBuffer(ptr))
  return buffer.writePointer(ptr, offset)
}

/*!
 * Module dependencies.
 */

var core = require('./core')
  , proto = Ivar.prototype

/**
 * Wraps a `Pointer` that should be an Objective-C `ivar` (instance variable),
 * and returns a new `Ivar` instance.
 *
 * @param {Buffer} pointer The ivar "pointer" buffer to wrap.
 * @return {Ivar} A wrapper `Ivar` instance around the given ivar *pointer*.
 * @api private
 */

function wrap (pointer) {
  if (pointer.isNull()) {
    return null
  }
  return new Ivar(pointer)
}

/**
 * The `Ivar` Class. Wrapper around an Objective-C `ivar` pointer.
 *
 * @param {Pointer} pointer The ivar *pointer* to wrap.
 * @api private
 */

function Ivar (pointer) {
  this.pointer = pointer
}

/**
 * Returns the name of the `Ivar`.
 *
 * @return {String} The name of this `Ivar`.
 */

proto.getName = function getName () {
  return core.ivar_getName(this)
}

/**
 * Returns the offset of the `Ivar`. This is the offset in bytes that the instance
 * variable resides in the object's layout in memory.
 *
 * @return {Number} The offset number of bytes of this `Ivar`.
 */

proto.getOffset = function getOffset () {
  return core.ivar_getOffset(this)
}

/**
 * Returns the "type encoding" of the `Ivar`.
 *
 * @return {String} The "type encoding" the this `Ivar`.
 */

proto.getTypeEncoding = function getTypeEncoding () {
  return core.ivar_getTypeEncoding(this)
}

if (!debug.enabled) {

  /*!
   * `toString()` override.
   */

  proto.toString = function toString () {
    return '[Ivar: ' + [ this.getName()
                       , this.getTypeEncoding()
                       , this.getOffset()].join(', ') +']'
  }

  proto.inspect = function inspect () {
    // red
    return '\033[31m' + this.toString() + '\033[39m'
  }

}
