var b = require('../../lib/core')
  , ffi = require('ffi')
  , ref = require('ref')
  , assert = require('assert')
  , className = 'NSMutableArray'
  , free = require('../../lib/libc').free

var c = b.objc_getClass(className)

assert.ok(c)

var name = b.class_getName(c)
assert.equal(typeof name, 'string')
assert.equal(name, className)
//console.error('class_getName: %s', name)

var numMethods = ref.alloc(ref.types.uint32)
  , methods = b.class_copyMethodList(c, numMethods)
  , p = methods
numMethods = numMethods.deref()
assert.ok(numMethods > 0)

for (var i = 0; i < numMethods; i++) {
  var cur = p.readPointer(i * ref.sizeof.pointer)
    , name = b.sel_getName(b.method_getName(cur))
    , numArgs = b.method_getNumberOfArguments(cur)
    , r = b.method_copyReturnType(cur)
    , rtn = r.readCString()
  free(r)
  assert.equal(typeof rtn, 'string')
  assert.ok(numArgs >= 2)
  //console.error('  '+name)
  //console.error('    Returns: %s', rtn)
  // the first two args are always the id and the SEL
  for (var j = 2; j < numArgs; j++) {
    var a = b.method_copyArgumentType(cur, j)
      , s = a.readCString()
    free(a)
    assert.equal(typeof s, 'string')
    assert.ok(s.length > 0)
    //console.error('      Arg %d: %s', j-2, s)
  }
}
free(methods)


// Walk the inheritance chain
var superclass = c
  , i = 0
//console.error('\nWalking inheritance chain:')
//console.error('  %s', b.class_getName(superclass))
do {
  process.stderr.write('  ')
  i++
  superclass = b.class_getSuperclass(superclass)
  for (var j = 0; j < i; j++) {
    process.stderr.write('  ')
  }
  var name = b.class_getName(superclass)
  assert.equal(typeof name, 'string')
  assert.ok(name.length > 0)
  //console.error('↳ %s', name)

} while(superclass)
assert.ok(i > 0)
