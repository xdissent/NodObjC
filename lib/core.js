
/**
 * This 'core' module is the `libffi` wrapper. All required native
 * functionality is instantiated and then exported in this module.
 *
 * ### References:
 *
 *   * [Objective-C Runtime Reference](http://developer.apple.com/library/mac/#documentation/Cocoa/Reference/ObjCRuntimeRef/Reference/reference.html)
 */

/*!
 * Module dependencies.
 */

var debug = require('debug')('NodObjC:core')
  , assert = require('assert')
  , ffi = require('ffi')
  , ref = require('ref')
  , Struct = require('ref-struct')

// typedefs
var uintptr_t = 'uint' + (ref.sizeof.pointer * 8)
  , voidPtr = ref.refType(ref.types.void)
  , POINTER = voidPtr
  , SEL = require('./sel')
  // TODO: turn these into *real* types
  , IMP = POINTER
  , Ivar = POINTER
  , Method = POINTER
  , Protocol = POINTER
  , Property = POINTER


/**
 * The `Class` type.
 */

var Class = Object.create(ref.types.CString || ref.types.Utf8String)
Class.name = 'Class'
Class.get = function get (buf, offset) {
  debug('Class Getter!!!')
  var ptr = buf.readPointer(offset)
  var rtn = null
  if (!ptr.isNull()) {
    rtn = require('./class').wrap(ptr)
  }
  return rtn
}
Class.set = function set (buf, offset, val) {
  debug('Class Setter!!!')
  var classPtr = ref.NULL
  if (val) {
    if (Buffer.isBuffer(val)) {
      // bad
      classPtr = val
    } else {
      // good
      classPtr = val.pointer
    }
  }
  assert(Buffer.isBuffer(classPtr))
  return buf.writePointer(classPtr, offset)
}

var id = Object.create(ref.types.CString || ref.types.Utf8String)
id.name = 'id'
id.get = function get (buf, offset) {
  debug('id getter!!!')
  if (offset !== 0) {
    debug('id#get() slicing to offset', offset)
    buf = buf.slice(offset)
  }
  var ptr = buf.readPointer()
  var rtn = null
  if (!ptr.isNull()) {
    rtn = require('./id').wrap(ptr)
  }
  return rtn
}
id.set = function set (buf, offset, val) {
  debug('id setter!!!')
  var ptr = ref.NULL
  if (val) {
    if (Buffer.isBuffer(val)) {
      // bad
      ptr = val
    } else {
      // good
      ptr = val.pointer
    }
  }
  assert(Buffer.isBuffer(ptr))
  return buf.writePointer(ptr, offset)
}

/**
 * The `objc_method_description` struct type.
 */

var objc_method_description = Struct({
    name: SEL
  , types: 'string'
})


// TODO: Possibly replace these static ffi bindings
//       with native bindings for a speed boost
var objc = ffi.Library('libobjc', {
    class_addIvar: [ 'bool', [ Class, 'string', 'size_t', 'uint8', 'string' ] ]
  , class_addMethod: [ 'bool', [ Class, SEL, IMP, 'string' ] ]
  , class_addProtocol: [ 'bool', [ Class, Protocol ] ]
  , class_copyIvarList: [ 'pointer', [ Class, 'uint *' ] ]
  , class_copyMethodList: [ 'pointer', [ Class, 'uint *' ] ]
  , class_copyPropertyList: [ 'pointer', [ Class, 'uint *' ] ]
  , class_copyProtocolList: [ 'pointer', [ Class, 'uint *' ] ]
  , class_getClassMethod: [ Method, [ Class, SEL ] ]
  , class_getClassVariable: [ Ivar, [ Class, 'string' ] ]
  , class_getInstanceMethod: [ Method, [ Class, SEL ] ]
  , class_getInstanceSize: [ 'size_t', [ Class ] ]
  , class_getInstanceVariable: [ Ivar, [ Class, 'string' ] ]
  , class_getIvarLayout: [ 'string', [ Class ] ]
  , class_getName: [ 'string', [ Class ] ]
  , class_getProperty: [ Property, [ Class, 'string' ] ]
  , class_getSuperclass: [ Class, [ Class ] ]
  , class_getVersion: [ 'int', [ Class ] ]
  , class_getWeakIvarLayout: [ 'string', [ Class ] ]
  , class_isMetaClass: [ 'bool', [ Class ] ]
  , class_setIvarLayout: [ 'void', [ Class, 'string' ] ]
  , class_setSuperclass: [ Class, [ Class, Class ] ]
  , class_setVersion: [ 'void', [ Class, 'int' ] ]
  , class_setWeakIvarLayout: [ 'void', [ Class, 'string' ] ]
  , ivar_getName: [ 'string', [ Ivar ] ]
  , ivar_getOffset: [ 'int', [ Ivar ] ]
  , ivar_getTypeEncoding: [ 'string', [ Ivar ] ]
  , method_copyArgumentType: [ 'pointer', [ Method, 'uint' ] ]
  , method_copyReturnType: [ 'pointer', [ Method ] ]
  , method_exchangeImplementations: [ 'void', [ Method, Method ] ]
  , method_getImplementation: [ IMP, [ Method ] ]
  , method_getName: [ SEL, [ Method ] ]
  , method_getNumberOfArguments: [ 'uint', [ Method ] ]
  , method_getTypeEncoding: [ 'string', [ Method ] ]
  , method_setImplementation: [ IMP, [ Method, IMP ] ]
  , objc_allocateClassPair: [ Class, [ Class, 'string', 'size_t' ] ]
  , objc_copyProtocolList: [ 'pointer', [ 'pointer' ] ]
  , objc_getAssociatedObject: [ 'pointer', [ 'pointer', 'pointer' ] ]
  , objc_getClass: [ Class, [ 'string' ] ]
  , objc_getClassList: [ 'int', [ ref.refType(Class), 'int' ] ]
  , objc_getProtocol: [ Protocol, [ 'string' ] ]
  , objc_registerClassPair: [ 'void', [ Class ] ]
  , objc_removeAssociatedObjects: [ 'void', [ id ] ]
  , objc_setAssociatedObject: [ 'void', [ id, 'pointer', 'pointer', uintptr_t ] ]
  , object_getClass: [ Class, [ id ] ]
  , object_getClassName: [ 'string', [ id ] ]
  , object_getInstanceVariable: [ Ivar, [ id, 'string', 'pointer' ] ]
  , object_getIvar: [ 'pointer', [ id, Ivar ] ]
  , object_setClass: [ Class, [ id, Class ] ]
  , object_setInstanceVariable: [ Ivar, [ id, 'string', 'pointer' ] ]
  , object_setIvar: [ 'void', [ id, Ivar, 'pointer' ] ]
  , property_getAttributes: [ 'string', [ Property ] ]
  , property_getName: [ 'string', [ Property ] ]
  , protocol_conformsToProtocol: [ 'bool', [ Protocol, Protocol ] ]
  , protocol_copyMethodDescriptionList: [ 'pointer', [ Protocol, 'bool', 'bool', 'uint *' ] ]
  , protocol_copyPropertyList: [ 'pointer', [ Protocol, 'uint *' ] ]
  , protocol_copyProtocolList: [ 'pointer', [ Protocol, 'uint *' ] ]
  , protocol_getMethodDescription: [ objc_method_description, [ Protocol, SEL, 'bool', 'bool' ] ]
  , protocol_getName: [ 'string', [ Protocol ] ]
  , protocol_getProperty: [ Property, [ Protocol, 'string', 'bool', 'bool' ] ]
  , protocol_isEqual: [ 'bool', [ Protocol, Protocol ] ]

  // variadic function generators
  , objc_msgSend: [ id, [ id, SEL ], { varargs: true } ]
  , objc_msgSendSuper: [ id, [ id, SEL ], { varargs: true } ]
  //, objc_msgSend_stret: [ 'void', [ voidPtr, id, SEL ], { varargs: true } ]
  //, objc_msgSendSuper_stret: [ 'void', [ voidPtr, id, SEL ], { varargs: true } ]

  , sel_getName: [ 'string', [ SEL ] ]
  , sel_registerName: [ SEL, [ 'string' ] ]
})

// export the "objc" values. can't overwrite "module.exports"
// because of circular requires...
Object.keys(objc).forEach(function (key) {
  exports[key] = objc[key]
})


// create a DynamicLibrary instance for the main process
var _process = ffi.DynamicLibrary()

// FFI'd `free()` function
var free = exports.free = ffi.ForeignFunction(_process.get('free'), 'void', [ voidPtr ])

/**
 * Convienience function to return an Array of Strings of the names of every
 * class currently in the runtime. This gets used at the during the import
 * process get a name of the new classes that have been loaded.
 * TODO: Could be replaced with a native binding someday for speed. Not overly
 *       important as this function is only called during import()
 */
exports.getClassList = function getClassList () {
  // First get just the count
  var num = objc.objc_getClassList(null, 0)
  var rtn = []
  if (num > 0) {
    var s = ref.sizeof.pointer
      , c = null
      , classes = new Buffer(s * num)
      , cursor = classes
    objc.objc_getClassList(classes, num)
    for (var i = 0; i < num; i++) {
      c = cursor.readPointer(s * i)
      rtn.push(objc.class_getName(c))
    }
    // free() not needed since node allocated the Buffer,
    // and will free() with V8's GC
  }
  return rtn
}

/**
 * Gets a list of the currently loaded Protocols in the runtime.
 */
exports.copyProtocolList = function copyProtocolList () {
  var num = new Buffer(exports.TYPE_SIZE_MAP.uint32)
    , rtn = []
    , protos = objc.objc_copyProtocolList(num)
    , p = protos
    , count = num.readUInt32()
  for (var i=0; i<count; i++) {
    var cur = p.readPointer()
      , name = objc.protocol_getName(cur)
    rtn.push(name)
    p = p.seek(exports.TYPE_SIZE_MAP.pointer)
  }
  exports.free(protos)
  return rtn
}

/**
 * Copies and returns an Array of the instance variables defined by a given
 * Class pointer. To get class variables, call this function on a metaclass.
 */
exports.copyIvarList = function copyIvarList (classPtr) {
  var numIvars = ref.alloc('uint32')
    , rtn = []
    , ivars = exports.class_copyIvarList(classPtr, numIvars)
    , p = ivars
    , count = numIvars.getUInt32()
  for (var i=0; i<count; i++) {
    var cur = p.readPointer()
      , name = exports.ivar_getName(cur)
    rtn.push(name)
    p = p.seek(exports.TYPE_SIZE_MAP.pointer)
  }
  exports.free(ivars)
  return rtn
}

/**
 * Copies and returns an Array of the instance methods the given Class pointer
 * implements. To get class methods, call this function with a metaclass.
 */
exports.copyMethodList = function copyMethodList (classPtr) {
  var numMethods = new ffi.Pointer(exports.TYPE_SIZE_MAP.uint32)
    , rtn = []
    , methods = exports.class_copyMethodList(classPtr, numMethods)
    , p = methods
    , count = numMethods.getUInt32()
  for (var i = 0; i < count; i++) {
    var cur = p.getPointer()
      , name = SEL.toString(exports.method_getName(cur))
    rtn.push(name)
    p = p.seek(exports.TYPE_SIZE_MAP.pointer)
  }
  exports.free(methods)
  return rtn
}

/**
 * Iterates over the Methods defined by a Protocol.
 */
exports.copyMethodDescriptionList = function copyMethodDescriptionList (protocolPtr, required, instance) {
  var numMethods = ref.alloc('uint')
    , methods = exports.protocol_copyMethodDescriptionList(protocolPtr, required, instance, numMethods)
    , rtn = []
    , p = methods
    , count = numMethods.deref()
  for (var i = 0; i < count; i++) {
    var cur = new objc_method_description(p)
    rtn.push(SEL.toString(cur.name))
    p = p.seek(objc_method_description.size)
  }
  exports.free(methods)
  return rtn
}

/**
 * Convienience function to get the String return type of a Method pointer.
 * Takes care of free()ing the returned pointer, as is required.
 */
exports.getMethodReturnType = function getMethodReturnType (method) {
  return getStringAndFree(objc.method_copyReturnType(method))
}

exports.getMethodArgTypes = function getMethodArgTypes (method) {
  var num = objc.method_getNumberOfArguments(method)
    , rtn = []
  for (var i=2; i<num; i++) {
    rtn.push(getStringAndFree(objc.method_copyArgumentType(method, i)))
  }
  return rtn
}

exports.getStringAndFree = function getStringAndFree (ptr) {
  var str = ptr.readCString()
  exports.free(ptr)
  return str
}


/**
 * Wraps up a node-ffi pointer if needed (not needed for Numbers, etc.)
 */
exports.wrapValue = function wrapValue (val, type) {
  debug('wrapValue():', type)
  if (val === null || (val.isNull && val.isNull())) return null
  var rtn = val
  if (type.function_pointer) {
    if (type.type == '@?') {
      return block.createBlock(val, type)
    } else {
      return IMP.createUnwrapperFunction(val, type)
    }
  }
  // get the raw type from Type objects
  if (type.type) type = type.type
  if (type == '@') {
    rtn = id.wrap(val)
  } else if (type == '#') {
    rtn = Class.wrap(val)
  } else if (type == ':') {
    rtn = SEL.toString(val)
  } else if (type == 'B') {
    rtn = val ? true : false
  }
  if (rtn)
    rtn._type = type
  return rtn
}

/**
 * Accepts an Array of raw objc pointers and other values, and an array of ObjC
 * types, and returns an array of wrapped values where appropriate.
 */
exports.wrapValues = function wrapValues (values, types) {
  var len = values.length
    , rtn = []
  for (var i=0; i<len; i++) {
    rtn.push(exports.wrapValue(values[i], types[i]))
  }
  return rtn
}

/**
 * Unwraps a previously wrapped NodObjC object.
 */
exports.unwrapValue = function unwrapValue (val, type) {
  debug('unwrapValue():', type)
  var rtn = val
  if (type.function_pointer) {
    if (type.type == '@?') {
      return block.getPointer(val, type)
    } else {
      return IMP.createWrapperPointer(val, type)
    }
  }
  // get the raw type from Type objects
  if (type.type) type = type.type
  if (type == '@' || type == '#') {
    if (!val) return null
    rtn = val.pointer
  } else if (type == ':') {
    rtn = SEL.toSEL(val)
  }
  if (rtn)
    rtn._type = type
  return rtn
}

/**
 * Accepts an Array of wrapped NodObjC objects and other values, and an array
 * of their cooresponding ObjC types, and returns an array of unwrapped values.
 */
exports.unwrapValues = function unwrapValues (values, types) {
  debug('unwrapValues():', types)
  var len = values.length
    , rtn = []
  for (var i=0; i<len; i++) {
    rtn.push(exports.unwrapValue(values[i], types[i]))
  }
  return rtn
}

/*var types = require('./types')
  , SEL = require('./sel')
  , id = require('./id')
  , Class = require('./class')
  , IMP = require('./imp')
  , block = require('./block')*/
