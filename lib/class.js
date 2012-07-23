
/**
 * The `Class` class is a subclass of `id`. Instances of `Class` wrap an
 * Objective C *"Class"* instance.
 *
 * You can retrieve `Class` instances by getting a reference to a global class
 * (i.e. `$.NSObject`), or by other methods/functions that return `Class`
 * instances normally, like `NSClassFromString`:
 *
 * ``` js
 * var NSObject = $.NSClassFromString($('NSObject'))
 * ```
 */

/*!
 * Module exports.
 */

exports.wrap = wrap

/*!
 * Module dependencies.
 */

var debug = require('debug')('NodObjC:class')
  , assert = require('assert')
  , ref = require('ref')

/*!
 * Comply with ref's "type" interface.
 */

exports.name = 'Class'
exports.indirection = 1
exports.size = ref.sizeof.pointer
exports.alignment = ref.alignof.pointer
exports.ffi_type = ffi.FFI_TYPES.pointer
exports.get = function get (buffer, offset) {
  var classPtr = buffer.readPointer(offset)
  return exports.wrap(classPtr)
}
exports.set = function set (buffer, offset, value) {
  var classPtr = ref.NULL
  if (value) {
    if (Buffer.isBuffer(value)) {
      classPtr = value
    } else { // instanceof Class
      classPtr = value.pointer
    }
  }
  assert(Buffer.isBuffer(classPtr))
  return buffer.writePointer(classPtr, offset)
}

/*!
 * More module dependencies.
 */

var id = require('./id')
  , proto = Object.create(id.proto)

Object.defineProperty(exports, 'proto', {
    enumerable: false
  , value: proto
})

var core = _global = require('./core')
  , types = require('./types')
  , IMP = require('./imp')

/**
 * Wraps the given *pointer*, which should be an Objective-C Class, and returns
 * a `Class` instance.
 *
 * @param {Pointer} pointer The Class pointer to wrap.
 * @param {String} className An optional class name to cache the Class wrapper with.
 * @return {Class} A `Class` instance wrapping the given *pointer*.
 * @api private
 */

function wrap (pointer) {
  debug('Class#wrap()', pointer)
  if (pointer.isNull()) {
    return null
  }
  var w = id.wrap(pointer)
  assert.equal('function', typeof w, 'expected a "function" to be returned from `id.wrap()`')
  w.__proto__ = proto
  pointer._type = '#'
  return w
}

// Flag used by id#msgSend()
proto.isClass = true

/**
 * Creates a subclass of this class with the given name and optionally a
 * number of extra bytes that will be allocated with each instance. The
 * returned `Class` instance should have `addMethod()` and `addIvar()` called on
 * it as needed before use, and then `register()` when you're ready to use it.
 */

proto.extend = function extend (className, extraBytes) {
  var c = core.objc_allocateClassPair(this, className, extraBytes || 0)
  if (!c) {
    throw new Error('new Class could not be allocated: ' + className)
  }
  return c
}

/**
 * Calls objc_registerClassPair() on the class pointer.
 * This must be called on the class *after* all 'addMethod()' and 'addIvar()'
 * calls are made, and *before* the newly created class is used for real.
 */

proto.register = function register () {
  core.objc_registerClassPair(this)
  _global[this.getName()] = this
  return this
}

/**
 * Adds a new Method to the Class. Instances of the class (even already existing
 * ones) will have the ability to invoke the method. This may be called at any
 * time on any class.
 */

proto.addMethod = function addMethod (selector, type, func) {
  var parsed = types.parse(type)
    , funcPtr = IMP.createWrapperPointer(func, parsed)
  // flatten the type
  var typeStr = parsed[0] + parsed[1].join('')
  if (!core.class_addMethod(this, selector, funcPtr, typeStr)) {
    throw new Error('method "' + selector + '" was NOT sucessfully added to Class: ' + this.getName())
  }
  return this
}

/**
 * Adds an Ivar to the Class. Instances of the class will contain the specified
 * instance variable. This MUST be called after `Class#extend()` but _before_
 * `Class#register()`.
 */

proto.addIvar = function addIvar (name, type, size, alignment) {
  if (!size) {
    // lookup the size of the type when needed
    var ffiType = types.map(type)
    size = ffiType.size
  }
  if (!alignment) {
    // also set the alignment when needed. This formula is from Apple's docs:
    //   For variables of any pointer type, pass log2(sizeof(pointer_type)).
    alignment = Math.log(size) / Math.log(2)
  }
  if (!core.class_addIvar(this, name, size, alignment, type)) {
    throw new Error('ivar "' + name + '" was NOT sucessfully added to Class: ' + this.getName())
  }
  return this
}

/**
 * Adds a `Protocol` to the list of protocols that this class "conforms to"
 * (a.k.a "implements"). Usually, an implementation object is passed in that
 * defines the Protocol's defined methods onto the class.
 *
 * TODO: implement me!
 */

proto.addProtocol = function addProtocol (protocolName, impl) {
  var informal = require('./bridgesupport').informal_protocols[protocolName]
    , formal = core.objc_getProtocol(protocolName)

  console.error(core.copyMethodDescriptionList(formal, 1, 1))
  console.error(core.copyMethodDescriptionList(formal, 0, 0))
  console.error(core.copyMethodDescriptionList(formal, 1, 0))
  console.error(core.copyMethodDescriptionList(formal, 0, 1))
}

/**
 * Gets the Class' superclass. If the current class is the
 * base class, then this will return `null`.
 */

proto.getSuperclass = function getSuperclass () {
  return core.class_getSuperclass(this)
}

/**
 * Gets the name of the Class.
 */

proto.getName = function getName () {
  return core.class_getName(this)
}

proto.isMetaClass = function isMetaClass () {
  return core.class_isMetaClass(this)
}

proto.getInstanceSize = function getInstanceSize () {
  return core.class_getInstanceSize(this)
}

proto.getIvarLayout = function getIvarLayout () {
  return core.class_getIvarLayout(this)
}

proto.setIvarLayout = function setIvarLayout (layout) {
  return core.class_setIvarLayout(this, layout)
}

proto.setSuperclass = function setSuperclass (superclass) {
  return core.class_setSuperclass(this, superclass)
}

proto.getInstanceVariable = function getInstanceVariable (name) {
  return core.class_getInstanceVariable(this, name)
}

proto.getClassVariable = function getClassVariable (name) {
  return core.class_getClassVariable(this, name)
}

proto.getInstanceMethod = function getInstanceMethod (sel) {
  return core.class_getInstanceMethod(this, sel)
}

proto.getClassMethod = function getClassMethod (sel) {
  return core.class_getClassMethod(this, sel)
}

/**
 * Used internally by `id.msgSend()`...
 */

proto._getTypesClass = function getTypesClass (sel, isClass) {
  debug('_getTypesClass: %s, isClass: %s', sel, isClass)
  var method = this['get' + (isClass ? 'Class' : 'Instance') + 'Method'](sel)
  return method ? method.getTypes() : null
}

/**
 * Returns the "version" of this Class.
 */

proto.getVersion = function getVersion () {
  return core.class_getVersion(this)
}

/**
 * Sets the "version" of this Class.
 */

proto.setVersion = function setVersion (version) {
  return core.class_setVersion(this, version)
}

/**
 * Returns an Array of the class variables this Class has. Superclass variables
 * are not included.
 */

proto.getClassVariables = function getClassVariables () {
  // getClass() on a Class actually gets a Class object to the "metaclass"
  return core.copyIvarList(this.getClass())
}

/**
 * Returns an Array of the instance variables this Class has. Superclass
 * variables are not included.
 */

proto.getInstanceVariables = function getInstanceVariables () {
  return core.copyIvarList(this)
}

/**
 * Returns an Array of all the class methods this Class responds to.
 * This function returns the raw, unsorted result of copyMethodList().
 */

proto.getClassMethods = function getClassMethods () {
  // getClass() on a Class actually gets a Class object to the "metaclass"
  return core.copyMethodList(this.getClass())
}

/**
 * Returns an Array of all the instance methods an instance of this Class will
 * respond to.
 * This function returns the raw, unsorted result of copyMethodList().
 */

proto.getInstanceMethods = function getInstanceMethods () {
  return core.copyMethodList(this)
}

/**
 * Allocates a new pointer to this type. The pointer points to `nil` initially.
 * This is meant for creating a pointer to hold an NSError*, and pass a ref()
 * to it into a method that accepts an 'error' double pointer.
 *
 * XXX: Tentative API - name will probably change
 */

proto.alloc = function alloc () {
  var ptr = ref.alloc('pointer', ref.NULL)
  return ptr
}

if (!debug.enabled) {

  /*!
   * `toString()` override.
   */

  proto.toString = function toString () {
    return '[Class: ' + this.getName() + (this.isMetaClass() ? ' ៣ ' : '') + ']'
  }

  /*!
   * `inspect()` override.
   */

  proto.inspect = function inspect () {
    // yellow
    return '\033[33m' + this.toString() + '\033[39m'
  }

}
