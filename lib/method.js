
/**
 * Represents an Objective-C "Method" instance. These do not respond to regular
 * messages, so it does not inherit from `id`.
 */

/*!
 * Module exports.
 */

exports = module.exports = Method
exports.wrap = wrap

/*!
 * Module dependencies.
 */

var assert = require('assert')
  , ref = require('ref')
  , ffi = require('ffi')

/*!
 * Comply with ref's "type" interface.
 */

exports.name = 'Method'
exports.indirection = 1
exports.size = ref.sizeof.pointer
exports.alignment = ref.alignof.pointer
exports.ffi_type = ffi.FFI_TYPES.pointer
exports.get = function get (buffer, offset) {
  var method = buffer.readPointer(offset)
  return wrap(method)
}
exports.set = function set (buffer, offset, value) {
  var method = ref.NULL
  if (value) {
    if (Buffer.isBuffer(value)) {
      method = value
    } else { // instanceof Method
      method = value.pointer
    }
  }
  assert(Buffer.isBuffer(method))
  return buffer.writePointer(method, offset)
}

/**
 * Lazy dependencies.
 */

var core = require('./core')
  , IMP = require('./imp')
  , proto = Method.prototype

/**
 * Returns a new `Method` instance wrapping the given `pointer`.
 * Returns JS `null` if "pointer" is the NULL pointer.
 *
 * @param {Buffer} pointer The "pointer" Buffer to wrap.
 * @return {Method} The new `Method` instance.
 * @api private
 */

function wrap (pointer) {
  if (pointer.isNull()) {
    return null
  }
  return new Method(pointer)
}

/**
 * `Method` wrapper class constructor.
 *
 * @param {Buffer} pointer The "pointer" Buffer to wrap.
 * @return {Method} A new `Method` instance.
 * @api private
 */

function Method (pointer) {
  this.pointer = pointer
}

/**
 * Returns the "argument type" string, for the given argument `index`.
 *
 * @param {Number} index The argument index to lookup.
 * @return {String} The "type encoding" of the given argument index.
 */

proto.getArgumentType = function getArgumentType (index) {
  var ptr = core.method_copyArgumentType(this, index)
    , str = core.getStringAndFree(ptr)
  return str
}

/**
 * Returns an Array of all "argument types" for this method.
 *
 * @return {Array} An Array of all the method arguments' "type encodings".
 */

proto.getArgumentTypes = function getArgumentTypes () {
  var rtn = []
    , len = this.getNumberOfArguments()
  for (var i = 0; i < len; i++) {
    rtn.push(this.getArgumentType(i))
  }
  return rtn
}

/**
 * Returns the "type encoding" of the method's return value.
 *
 * @return {String} The "type encoding" of the return value.
 */

proto.getReturnType = function getReturnType () {
  var ptr = core.method_copyReturnType(this)
    , str = core.getStringAndFree(ptr)
  return str
}

/**
 * Returns an Array of "type encodings". The array has a `length` of `2`. The
 * first element is the method return type. The second element is an Array of all
 * the method's argument types.
 *
 * @return {Array} An Array of the Method's "types".
 */

proto.getTypes = function getTypes () {
  return [ this.getReturnType(), this.getArgumentTypes() ]
}

/**
 * Exchanges the method's implementation function with another `Method` instance.
 * This is the preferred way to "swizzle" methods in Objective-C.
 *
 * @param {Method} other The other `Method` instance to swap implementations with.
 */
proto.exchangeImplementations = function exchangeImplementations (other) {
  return core.method_exchangeImplementations(this, other)
}

/**
 * Returns the function implementation of this `Method`. Also known as the `IMP`
 * of the method. The returned object is a regular JavaScript Function which may
 * be invoked directly, when given valid *"self"* and *"_sel"* arguments.
 *
 * @return {Function} The `IMP` of this `Method`.
 */

proto.getImplementation = function getImplementation () {
  return IMP.createUnwrapperFunction(core.method_getImplementation(this), this.getTypes())
}

/**
 * Returns the name of this `Method`.
 *
 * @return {String} The name of the Method.
 */

proto.getName = function getName () {
  return core.method_getName(this)
}

/**
 * Returns the number of defined arguments this `Method` accepts.
 *
 * @return {Number} The number of defined arguments.
 */

proto.getNumberOfArguments = function getNumberOfArguments () {
  return core.method_getNumberOfArguments(this)
}

/**
 * Returns the overall "type encoding" of this `Method`. This is a
 * compacted/stringified version of `getTypes()`, so usually you will use that
 * over this function.
 *
 * @return {String} The "type encoding" of the Method.
 */

proto.getTypeEncoding = function getTypeEncoding () {
  return core.method_getTypeEncoding(this)
}

/**
 * Set's this `Method`'s implementation function. The `IMP` function may be
 * a regular JavaScript function or another function IMP retreived from a previous
 * call to `Method#getImplementation()`.
 *
 * @param {Function} func The new `IMP` function for this `Method`.
 * @return {Function} Returns the previous `IMP` function.
 */

proto.setImplementation = function setImplementation (func) {
  var types = this.getTypes()
    , wrapperPtr = IMP.createWrapperPointer(func, types)
    , oldFuncPointer = core.method_setImplementation(this, wrapperPtr)
  return IMP.createUnwrapperFunction(oldFuncPointer, types)
}

/*!
 * toString() override.
 */

/*proto.toString = function toString () {
  return '[Method: '+this.getName()+' '+this.getReturnType()+'('+this.getArgumentTypes()+') ]'
}

proto.inspect = function inspect () {
  // magenta
  return '\033[35m' + this.toString() + '\033[39m'
}*/
