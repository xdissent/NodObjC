var b = require('../../lib/core')
  , ref = require('ref')
  , assert = require('assert')


b.dlopen('/System/Library/Frameworks/Foundation.framework/Foundation')

// First get the number of classes
var numClasses = b.objc_getClassList(null, 0)
//console.error('Number of classes: %d', numClasses)
assert.ok(numClasses > 0)

if (numClasses > 0) {
  var sizeofClass = ref.sizeof.pointer
    , classes = new Buffer(sizeofClass * numClasses)
    , cursor = classes

  b.objc_getClassList(classes, numClasses)

  for (var i=0; i<numClasses; i++) {
    var c = cursor.readPointer(sizeofClass * i)
    var name = b.class_getName(c)
    assert.equal(typeof name, 'string')
    assert.ok(name.length > 0)
  }

}
