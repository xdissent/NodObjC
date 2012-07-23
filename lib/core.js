
/**
 * NodObjC actually has 2 "modes" of operation:
 *
 * ### "module-mode"
 *
 * "module-mode" is the default mode that happens by simply requiring the
 * `NodObjC` module and working with the returned exports. The name of the
 * variable throughout the examples is `$`.
 *
 * ``` js
 * var $ = require('NodObjC');
 *
 * $.import('Foundation');
 *
 * var obj = $.NSObject('alloc')('init');
 * …
 * ```
 *
 * ### "global-mode"
 *
 * "global-mode" is where the Objective-C symbols also get added to the global
 * scope of the current program, so that the `$` all the time is not
 * necessary. Global mode is usually a more pleasant environment to work in,
 * but it should only be used by end programs, and not by modules that depend
 * on NodObjC. To enable global mode you simply require `NodObjC/global`, and
 * after that all NodObjC symbols will be available globally.
 *
 * ``` js
 * require('NodObjC/global');
 *
 * framework('Foundation');
 *
 * var obj = NSObject('alloc')('init');
 * …
 * ```
 *
 * This "core" module loads all the native libobjc functions, and is the base
 * "global" exports of NodObjC.
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
  , Method = require('./method')
  , id = require('./id')
  , Class = require('./class')
  , Ivar = require('./ivar')
  // TODO: turn these into *real* types
  , IMP = POINTER
  , Protocol = POINTER
  , Property = POINTER


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

  // Class functions
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

  // Ivar functions
  , ivar_getName: [ 'string', [ Ivar ] ]
  , ivar_getOffset: [ 'int', [ Ivar ] ]
  , ivar_getTypeEncoding: [ 'string', [ Ivar ] ]

  // Method functions
  , method_copyArgumentType: [ 'pointer', [ Method, 'uint' ] ]
  , method_copyReturnType: [ 'pointer', [ Method ] ]
  , method_exchangeImplementations: [ 'void', [ Method, Method ] ]
  , method_getImplementation: [ IMP, [ Method ] ]
  , method_getName: [ SEL, [ Method ] ]
  , method_getNumberOfArguments: [ 'uint', [ Method ] ]
  , method_getTypeEncoding: [ 'string', [ Method ] ]
  , method_setImplementation: [ IMP, [ Method, IMP ] ]

  // Objective-C core functions
  , objc_allocateClassPair: [ Class, [ Class, 'string', 'size_t' ] ]
  , objc_copyProtocolList: [ 'pointer', [ 'pointer' ] ]
  , objc_getAssociatedObject: [ 'pointer', [ 'pointer', 'pointer' ] ]
  , objc_getClass: [ Class, [ 'string' ] ]
  , objc_getClassList: [ 'int', [ ref.refType(Class), 'int' ] ]
  , objc_getProtocol: [ Protocol, [ 'string' ] ]
  , objc_registerClassPair: [ 'void', [ Class ] ]
  , objc_removeAssociatedObjects: [ 'void', [ id ] ]
  , objc_setAssociatedObject: [ 'void', [ id, 'pointer', 'pointer', uintptr_t ] ]

  // id functions
  , object_getClass: [ Class, [ id ] ]
  , object_getClassName: [ 'string', [ id ] ]
  , object_getInstanceVariable: [ Ivar, [ id, 'string', 'pointer' ] ]
  , object_getIvar: [ 'pointer', [ id, Ivar ] ]
  , object_setClass: [ Class, [ id, Class ] ]
  , object_setInstanceVariable: [ Ivar, [ id, 'string', 'pointer' ] ]
  , object_setIvar: [ 'void', [ id, Ivar, 'pointer' ] ]

  // Property functions
  , property_getAttributes: [ 'string', [ Property ] ]
  , property_getName: [ 'string', [ Property ] ]

  // Protocol functions
  , protocol_conformsToProtocol: [ 'bool', [ Protocol, Protocol ] ]
  , protocol_copyMethodDescriptionList: [ 'pointer', [ Protocol, 'bool', 'bool', 'uint *' ] ]
  , protocol_copyPropertyList: [ 'pointer', [ Protocol, 'uint *' ] ]
  , protocol_copyProtocolList: [ 'pointer', [ Protocol, 'uint *' ] ]
  , protocol_getMethodDescription: [ objc_method_description, [ Protocol, SEL, 'bool', 'bool' ] ]
  , protocol_getName: [ 'string', [ Protocol ] ]
  , protocol_getProperty: [ Property, [ Protocol, 'string', 'bool', 'bool' ] ]
  , protocol_isEqual: [ 'bool', [ Protocol, Protocol ] ]


  // SEL functions
  , sel_getName: [ 'string', [ SEL ] ]
  , sel_registerName: [ SEL, [ 'string' ] ]

  // msgSend variadic function generators
  , objc_msgSend: [ id, [ id, SEL ], { varargs: true } ]
  , objc_msgSendSuper: [ id, [ id, SEL ], { varargs: true } ]
  //, objc_msgSend_stret: [ 'void', [ voidPtr, id, SEL ], { varargs: true } ]
  //, objc_msgSendSuper_stret: [ 'void', [ voidPtr, id, SEL ], { varargs: true } ]
})

// export the "objc" values. can't overwrite "module.exports"
// because of circular requires...
Object.keys(objc).forEach(function (key) {
  exports[key] = objc[key]
})


// FFI'd `free()` function
exports.free = ffi.ForeignFunction(ffi.DynamicLibrary().get('free'), 'void', [ 'void *' ])

// Deprecated...
exports.get_objc_msgSend = function (objcTypes) {
  var types = require('./types')
  var argTypes = []
    , rtnType = types.map(objcTypes[0])
    , args = objcTypes[1]
  for (var i = 2; i < args.length; i++) {
    argTypes.push(types.map(args[i]))
  }

  exports.objc_msgSend.returnType = rtnType
  return exports.objc_msgSend.apply(null, argTypes)
}


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
  var numMethods = ref.alloc('uint32')
    , rtn = []
    , methods = exports.class_copyMethodList(classPtr, numMethods)
    , count = numMethods.deref()
  for (var i = 0; i < count; i++) {
    var cur = methods.readPointer(i * ref.sizeof.pointer)
      , name = exports.method_getName(cur)
    rtn.push(name)
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
  for (var i = 2; i < num; i++) {
    rtn.push(getStringAndFree(objc.method_copyArgumentType(method, i)))
  }
  return rtn
}

exports.getStringAndFree = function getStringAndFree (ptr) {
  var str = ptr.readCString()
  exports.free(ptr)
  return str
}


/*!
 * Export the "import" functions
 */

var Import = require('./import')
exports.resolve = Import.resolve
exports.import  = Import.import
exports.framework = Import.import
