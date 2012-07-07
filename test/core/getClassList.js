var b = require('../../lib/core')
  , ffi = require('ffi')
  , ref = require('ref')
  , assert = require('assert')

// load the "Foundation" framework
ffi.DynamicLibrary('/System/Library/Frameworks/Foundation.framework/Foundation')

// First get the number of classes
var numClasses = b.objc_getClassList(null, 0)
assert.ok(numClasses > 0)
//console.error('Number of classes: %d', numClasses)

var sizeofClass = ref.sizeof.pointer
  , classes = new Buffer(sizeofClass * numClasses)

b.objc_getClassList(classes, numClasses)

for (var i = 0; i < numClasses; i++) {
  var c = classes.readPointer(sizeofClass * i)
  var name = b.class_getName(c)
  assert.equal(typeof name, 'string')
  assert.ok(name.length > 0)
  //console.error(i, ':', name)
}
