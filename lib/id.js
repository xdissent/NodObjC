
/**
 * The 'id' function is essentially the "base class" for all Objective-C
 * objects that get passed around JS-land.
 */

/*!
 * Module exports.
 */

exports.wrap = wrap

/*!
 * Module dependencies.
 */

var assert = require('assert')
  , debug = require('debug')('NodObjC:id')
  , ref = require('ref')
  , ffi = require('ffi')
  , Struct = require('ref-struct')

/*!
 * Comply with ref's "type" interface.
 */

exports.name = 'id'
exports.indirection = 1
exports.size = ref.sizeof.pointer
exports.alignment = ref.alignof.pointer
exports.ffi_type = ffi.FFI_TYPES.pointer
exports.get = function get (buffer, offset) {
  var id = buffer.readPointer(offset)
  return exports.wrap(id)
}
exports.set = function set (buffer, offset, value) {
  var id = ref.NULL
  if (value) {
    if (Buffer.isBuffer(value)) {
      id = value
    } else { // instanceof id
      id = value.pointer
    }
  }
  assert(Buffer.isBuffer(id))
  return buffer.writePointer(id, offset)
}

/*!
 * Module dependencies.
 */

var proto = exports.proto = Object.create(Function.prototype)
  , core  = require('./core')
  , Class = require('./class')
  , types = require('./types')
  , SEL   = require('./sel')
  , exception = require('./exception')

/*!
 * An arbitrary "key" pointer we use for storing the JS-wrap instance reference
 * into the ObjC object's internal weak map via `objc_getAssociatedObject()`.
 */

var KEY = new Buffer(1)

/**
 * Wraps up a pointer that is expected to be a compatible Objective-C
 * object that can recieve messages. This function returns a cached version of the
 * wrapped function after the first time it is invoked on a given Pointer, using
 * Objective-C's internal association map for objects.
 *
 * @api private
 */

function wrap (pointer) {
  debug('id#wrap()', pointer)
  var rtn = null
  var p = core.objc_getAssociatedObject(pointer, KEY)
  if (p.isNull()) {
    debug('no associated function wrapper... creating')
    rtn = createFunctionWrapper(pointer)
    assert.equal('function', typeof rtn)
    // Store the wrapped instance internally
    var buf = ref.alloc('Object', rtn)
    // XXX: use node-weak to get a callback when the wrapper is GC'd
    core.objc_setAssociatedObject(pointer, KEY, buf, 0)
  } else {
    debug('returning cached associated instance')
    p.type = 'Object'
    rtn = p.deref()
    assert.equal('function', typeof rtn)
  }
  return rtn
}

/*!
 * The parseArgs() function is used by 'id()' and 'id.super()'.
 * You pass in an Array as the second parameter as a sort of "output variable"
 * It returns the selector that was requested.
 */

function parseArgs (argv, args) {
  var sel
  var argc = argv.length
  if (argc === 1) {
    var arg = argv[0]
    if (typeof arg === 'string') {
      // selector with no arguments
      sel = arg
    } else {
      // legacy API: an Object was passed in
      sel = []
      Object.keys(arg).forEach(function (s) {
        sel.push(s)
        args.push(arg[s])
      })
      sel.push('')
      sel = sel.join(':')
    }
  } else {
    // varargs API
    sel = []
    for (var i = 0; i < argc; i += 2) {
      sel.push(argv[i])
      args.push(argv[i + 1])
    }
    sel.push('')
    sel = sel.join(':')
  }
  return sel
}

/*!
 * Internal function that essentially "creates" a new Function instance wrapping
 * the given pointer. The function's implementation is the "id()" function below,
 *
 * XXX: Maybe use `Function.create()` from my `create` module here (benchmark)???
 *
 * @api private
 */

function createFunctionWrapper (pointer) {
  debug('createFunctionWrapper()', pointer)
  if (pointer.isNull()) {
    return null
  }

  // This 'id' function is syntax sugar around the msgSend function attached to
  // it. 'msgSend' is expecting the selector first, an Array of args second, so
  // this function just massages it into place and returns the result.
  function id () {
    var args = []
    var sel = parseArgs(arguments, args)
    return id.msgSend(sel, args)
  }

  // Save a reference to the pointer for use by the prototype functions
  id.pointer = pointer

  // Morph into a MUTANT FUNCTION FREAK!!1!
  id.__proto__ = proto
  return id
}


/**
 * A very important function that *does the message sending* between
 * Objective-C objects. When you do `array('addObject', anObject)`, this
 * `msgSend` function is the one that finally gets called to do the dirty work.
 *
 * This function accepts a String selector as the first argument, and an Array
 * of (wrapped) values that get passed to the the message. This function takes
 * care of unwrapping the passed in arguments and wrapping up the result value,
 * if necessary.
 */

proto.msgSend = function msgSend (sel, args) {
  debug('sending message:', sel, args)
  var types = this._getTypes(sel, args)
    , msgSendFunc = core.get_objc_msgSend(types)
    , fullArgs = [this, sel].concat(args)
    , rtn

  debug('msgSend: before', sel)
  try {
    rtn = msgSendFunc.apply(null, fullArgs)
  } catch (e) {
    if (Buffer.isBuffer(e)) {
      e = exception.wrap(e)
    }
    throw e
  }
  debug('msgSend: after', sel)
  return rtn
}

/**
 * Like regular message sending, but invokes the method implementation on the
 * object's "superclass" instead. This is the equivalent of what happens when the
 * Objective-C compiler encounters the `super` keyword:
 *
 * ``` objectivec
 * self = [super init];
 * ```
 *
 * To do the equivalent using NodObjC you call `super()`, as shown here:
 *
 * ``` js
 * self = self.super('init')
 * ```
 */

proto.super = function super_ () {
  var args = []
    , sel = parseArgs(arguments, args)
  return this.msgSendSuper(sel, args)
}

/*!
 * Struct used by msgSendSuper().
 */

var POINTER = ref.refType(ref.types.void)
var idType = POINTER
var ClassType = POINTER
var objc_super = Struct({
    'receiver': idType
  , 'class': ClassType
})

/**
 * Calls `objc_msgSendSuper()` on the underlying Objective-C object.
 */

proto.msgSendSuper = function msgSendSuper (sel, args) {
  debug('sending `super` message:', sel, args)

  var os = new objc_super
  os.receiver = this.pointer
  os.class = this.getClass().getSuperclass().pointer

  var types = this._getTypes(sel, args)
    , argTypes = types[1]
    , msgSendSuperFunc = core.get_objc_msgSendSuper(types)
    , unwrappedArgs = core.unwrapValues([os, sel].concat(args), argTypes)
    , rtn

  debug('msgSendSuper: before', sel)
  try {
    rtn = msgSendSuperFunc.apply(null, unwrappedArgs)
  } catch (e) {
    if (!e.hasOwnProperty('stack')) {
      e = exception.wrap(e)
    }
    throw e
  }
  debug('msgSendSuper: after', sel)
  // Process the return value into a wrapped value if needed
  return core.wrapValue(rtn, types[0])
}

/**
 * Accepts a SEL and queries the current object for the return type and
 * argument types for the given selector. If current object does not implment
 * that selector, then check the superclass, and repeat recursively until
 * a subclass that responds to the selector is found, or until the base class
 * is found.
 *
 * TODO: Just merge this logic with `msgSend()`? It's not used anywhere else...
 *
 * @api private
 */

proto._getTypes = function getTypes (sel, args) {
  var c = this.getClass()
  var t = c._getTypesClass(sel, this.isClass)
  if (!t) {
    // Unknown selector being send to object. This *may* still be valid, we
    // assume all args are type 'id' and return is 'id'.
    debug('unknown selector being sent:', sel)
    t = [ '@', [ '@', ':', ].concat(args.map(function () { return '@' })) ]
  }
  return t
}

/**
 * Retrieves the wrapped Class instance for this object.
 */

proto.getClass = function getClass () {
  return core.object_getClass(this)
}

/**
 * Calls 'object_getClassName()' on this object.
 */

proto.getClassName = function getClassName () {
  return core.object_getClassName(this)
}

/**
 * Dynamically changes the object's Class.
 */

proto.setClass = function setClass (newClass) {
  return core.object_setClass(this, newClass)
}

/**
 * Walks up the inheritance chain and returns an Array of Strings of
 * superclasses.
 */

proto.ancestors = function ancestors () {
  var rtn = []
  var c = this.getClass()
  while (c) {
    rtn.push(c.getName())
    c = c.getSuperclass()
  }
  return rtn
}

/**
 * Getter/setter function for instance variables (ivars) of the object,
 * If just a name is passed in, then this function gets the ivar current value.
 * If a name and a new value are passed in, then this function sets the ivar.
 */

proto.ivar = function ivar (name, value) {
  // TODO: Add support for passing in a wrapped Ivar instance as the `name`
  if (arguments.length > 1) {
    // setter
    debug('setting ivar:', name, value)
    var ivar = this.isClass
             ? this.getClassVariable(name)
             : this.getClass().getInstanceVariable(name)
    var unwrapped = core.unwrapValue(value, ivar.getTypeEncoding())
    return core.object_setIvar(this, ivar, unwrapped)
  } else {
    // getter
    debug('getting ivar:', name)
    var ptr = ref.alloc('pointer')
    var ivar = core.object_getInstanceVariable(this, name, ptr)
    return core.wrapValue(ptr.readPointer(), core.ivar_getTypeEncoding(ivar))
  }
}

/**
 * Returns an Array of Strings of the names of the ivars that the current object
 * contains. This function can iterate through the object's superclasses
 * recursively, if you specify a `maxDepth` argument.
 */

proto.ivars = function ivars (maxDepth, sort) {
  var rtn = []
    , c = this.getClass()
    , md = maxDepth || 1
    , depth = 0
  while (c && depth++ < md) {
    var is = c.getInstanceVariables()
    var i = is.length
    while (i--) {
      if (!~rtn.indexOf(is[i])) {
        rtn.push(is[i])
      }
    }
    c = c.getSuperclass()
  }
  return sort === false ? rtn : rtn.sort()
}

/**
 * Returns an Array of Strings of the names of methods that the current object
 * will respond to. This function can iterate through the object's superclasses
 * recursively, if you specify a `maxDepth` number argument.
 */

proto.methods = function methods (maxDepth, sort) {
  var rtn = []
    , c = this.getClass()
    , md = maxDepth || 1
    , depth = 0
  while (c && depth++ < md) {
    var ms = c.getInstanceMethods()
    var i = ms.length
    while (i--) {
      if (!~rtn.indexOf(ms[i])) {
        rtn.push(ms[i])
      }
    }
    c = c.getSuperclass()
  }
  return sort === false ? rtn : rtn.sort()
}

/**
 * Returns a **node-ffi** pointer pointing to this object. This is a convenience
 * function for methods that take pointers to objects (i.e. `NSError**`).
 *
 * @return {Pointer} A pointer to this object.
 */

/*proto.ref = function ref () {
  debug('id#ref()')
  return this.pointer.ref()
}*/

/**
 * The overidden `toString()` function proxies up to the real Objective-C object's
 * `description` method. In Objective-C, this is equivalent to:
 *
 * ``` objectivec
 * [[id description] UTF8String]
 * ```
 */

/*proto.toString = function toString () {
  return this('description')('UTF8String')
}*/

/*!
 * Custom inspect() function for `util.inspect()`.
 */

/*proto.inspect = function inspect () {
  return this.toString()
}*/
