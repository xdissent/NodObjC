
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

var ref = require('ref');
var Struct = require('ref-struct');
var debug = require('debug')('NodObjC:id')
  , proto = exports.proto = Object.create(Function.prototype)
  , core  = require('./core')
  , Class = require('./class')
  , types = require('./types')
  , SEL   = require('./sel')
  , exception = require('./exception')
  , assert = require('assert')

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

 var wrapCache = {}

function wrap (pointer) {
  debug('id#wrap(%j)', pointer.address())
  var rtn = null
    , p = core.objc_getAssociatedObject(pointer, KEY)
  if (p.isNull()) {
    rtn = createFunctionWrapper(pointer)
    // Store the wrapped instance internally
    var r = ref.alloc('Object')
    // don't call free() automatically when ref gets GC'd
    // TODO: we're gonna have to free this pointer someday!
    // XXX: use node-weak to get a callback when the wrapper is GC'd
    r.free = false
    r.writeObject(rtn, 0)
    core.objc_setAssociatedObject(pointer, KEY, r, 0)
    wrapCache[pointer.address()] = r
  } else {
    debug('returning cached associated instance')
    rtn = p.readObject(0)
  }
  assert.equal(rtn.pointer.address(), pointer.address())
  return rtn
}

/*!
 * The parseArgs() function is used by 'id()' and 'id.super()'.
 * You pass in an Array as the second parameter as a sort of "output variable"
 * It returns the selector that was requested.
 */

function parseArgs (argv, args) {
  var argc = argv.length
    , sel
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
    for (var i=0; i<argc; i+=2) {
      sel.push(argv[i])
      args.push(argv[i+1])
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
  debug('createFunctionWrapper(%j)', pointer.address())

  // This 'id' function is syntax sugar around the msgSend function attached to
  // it. 'msgSend' is expecting the selector first, an Array of args second, so
  // this function just massages it into place and returns the result.
  function id () {
    var args = []
      , sel = parseArgs(arguments, args)
    return id.msgSend(sel, args)
  }

  // Set the "type" on the pointer. This is used by 'ref()' and 'unref()'.
  pointer._type = '@'
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
    , argTypes = types[1]
    , msgSendFunc = core.get_objc_msgSend(types)
    , unwrappedArgs = core.unwrapValues([this, sel].concat(args), argTypes)
    , rtn

  debug('msgSend: before', sel)
  try {
    rtn = msgSendFunc.apply(null, unwrappedArgs)
  } catch (e) {
    var err = e
    if (!e.hasOwnProperty('stack')) {
      err = exception.wrap(e)
    }
    throw err
  }
  debug('msgSend: after', sel)
  // Process the return value into a wrapped value if needed
  return core.wrapValue(rtn, types[0])
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

var objc_super = Struct({
  'receiver': 'pointer',
  'class': 'pointer'
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
    var err = e
    if (!e.hasOwnProperty('stack')) {
      err = exception.wrap(e)
    }
    throw err
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
 * @api private
 */

proto._getTypes = function getTypes (sel, args) {
  var c = this.getClass()
    , t = c._getTypesClass(sel, this.isClass)
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
 *
 * @return {Class} Class instance for this object.
 * @api public
 */

proto.getClass = function getClass () {
  return Class.wrap(core.object_getClass(this.pointer))
}

/**
 * Calls 'object_getClassName()' on this object.
 *
 * @return {String} The class name as a String.
 * @api public
 */

proto.getClassName = function getClassName () {
  return core.object_getClassName(this.pointer)
}

/**
 * Dynamically changes the object's Class.
 */

proto.setClass = function setClass (newClass) {
  return Class.wrap(core.object_setClass(this.pointer, newClass.pointer))
}

/**
 * Walks up the inheritance chain and returns an Array of Strings of
 * superclasses.
 */

proto.ancestors = function ancestors () {
  var rtn = []
    , c = this.getClass()
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
    debug('setting ivar: %j', name)
    var ivar = this.isClass
             ? this.getClassVariable(name)
             : this.getClass().getInstanceVariable(name)
      , unwrapped = core.unwrapValue(value, ivar.getTypeEncoding())
    return core.object_setIvar(this.pointer, ivar.pointer, unwrapped)
  } else {
    // getter
    debug('getting ivar: %j', name)
    var ptr = new Buffer(ref.sizeof.pointer)
      , ivar = core.object_getInstanceVariable(this.pointer, name, ptr)
    return core.wrapValue(ptr.readPointer(0), core.ivar_getTypeEncoding(ivar))
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
      , i = is.length
    while (i--) {
      if (!~rtn.indexOf(is[i])) rtn.push(is[i])
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
      , i = ms.length
    while (i--) {
      if (!~rtn.indexOf(ms[i])) rtn.push(ms[i])
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

proto.ref = function ref () {
  debug('id#ref()')
  var ptr = this.pointer.ref()
  return ptr
}

/**
 * The overidden `toString()` function proxies up to the real Objective-C object's
 * `description` method. In Objective-C, this is equivalent to:
 *
 * ``` objectivec
 * [[id description] UTF8String]
 * ```
 */

proto.toString = function toString () {
  return this('description')('UTF8String')
}

/*!
 * Custom inspect() function for `util.inspect()`.
 */

proto.inspect = function inspect () {
  return this.toString()
}
