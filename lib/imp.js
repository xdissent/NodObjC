
/**
 * Represents a wrapped `IMP` (a.k.a. method implementation). `IMP`s are function pointers for methods. The first two arguments are always:
 *
 *   1. `self` - The object instance the method is being called on.
 *   2. `_cmd` - The `SEL` selector of the method being invoked.
 *
 * Any additional arguments that get passed are the actual arguments that get
 * passed along to the method.
 */

/*!
 * Module exports.
 */

exports.createWrapperPointer = createWrapperPointer
exports.createUnwrapperFunction = createUnwrapperFunction

/*!
 * Module dependencies.
 */

var debug = require('debug')('NodObjC:imp')
  , assert = require('assert')
  , ffi = require('ffi')
  , core = require('./core')
  , types = require('./types')

/**
 * Creates an ffi Function Pointer to the passed in 'func' Function. The
 * function gets wrapped in an "wrapper" function, which wraps the passed in
 * arguments, and unwraps the return value.
 *
 * @param {Function} A JS function to be converted to an ffi C function.
 * @param {Object|Array} A "type" object or Array containing the 'retval' and
 *                       'args' for the Function.
 * @api private
 */

function createWrapperPointer (func, type) {
  assert.equal('function', typeof func)
  if (func.pointer) {
    debug('detected an \'unwrapper\' function - returning original pointer')
    return func.pointer
  }
  var rtnType = type.retval || type[0] || 'v'
    , argTypes = type.args || type[1] || []
    , rtnFfiType = types.map(rtnType)
    , argFfiTypes = types.mapArray(argTypes)
    , ffiCb = ffi.Callback(rtnFfiType, argFfiTypes, func)
  //console.log('ffiCb:', ffiCb)
  return ffiCb
}

/**
 * Creates a JS Function from the passed in function pointer. When the returned
 * function is invoked, the passed in arguments are unwrapped before being
 * passed to the native function, and the return value is wrapped up before
 * being returned for real.
 *
 * @param {Pointer} The function pointer to create an unwrapper function around
 * @param {Object|Array} A "type" object or Array containing the 'retval' and
 *                       'args' for the Function.
 * @api private
 */

function createUnwrapperFunction (funcPtr, type) {
  var rtnType = type.retval || type[0] || 'v'
    , argTypes = type.args || type[1] || []
    , rtnFfiType = types.map(rtnType)
    , argFfiTypes = types.mapArray(argTypes)
  //console.error(rtnType, argTypes)
  //console.error(rtnFfiType, argFfiTypes)

  var func = ffi.ForeignFunction(funcPtr, rtnFfiType, argFfiTypes)
  func.retval = rtnType
  func.args = argTypes
  func.pointer = funcPtr
  //console.log(func)
  return func
}
