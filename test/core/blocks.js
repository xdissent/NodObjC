var b = require('../../lib/core')
  , ref = require('ref')
  , ffi = require('ffi')
  , Struct = require('ref-struct')
  , assert = require('assert')

var NSMutableSet = b.objc_getClass('NSMutableSet')
  , NSAutoreleasePool = b.objc_getClass('NSAutoreleasePool')

var alloc = b.sel_registerName('alloc')
  , init = b.sel_registerName('init')
  , description = b.sel_registerName('description')
  , UTF8String = b.sel_registerName('UTF8String')
  , addObject = b.sel_registerName('addObject:')
  , objectsPassingTest = b.sel_registerName('objectsPassingTest:')

var msgSend = b.objc_msgSend()/*([ '@', [ '@', ':' ] ])*/
  , msgSend2 = b.get_objc_msgSend([ 'r*', [ '@', ':' ] ])
  , msgSend3 = b.get_objc_msgSend([ 'v', [ '@', ':', '^' ] ])
  , msgSend4 = b.get_objc_msgSend([ 'v', [ '@', ':', '@' ] ])

var pool = msgSend(msgSend(NSAutoreleasePool, alloc), init)

var set = msgSend(msgSend(NSMutableSet, alloc), init)

msgSend4(set, addObject, NSMutableSet)
//console.log(msgSend2(msgSend(set, description), UTF8String))


// types
var ulonglong = ref.types.ulonglong
  , int32 = ref.types.int32
  , POINTER = ref.refType(ref.types.void)

// We have to simulate what the llvm compiler does when it encounters a Block
// literal expression:
var __block_literal_1 = Struct({
    'isa':        POINTER
  , 'flags':      int32
  , 'reserved':   int32
  , 'invoke':     POINTER
  , 'descriptor': POINTER
})
//console.log(__block_literal_1.__structInfo__)
//console.log('sizeof __block_literal_1: %d', __block_literal_1.__structInfo__.size)

var __block_descriptor_1 = Struct({
    'reserved':   ulonglong
  , 'Block_size': ulonglong
})
//console.log('sizeof __block_descriptor_1: %d', __block_descriptor_1.__structInfo__.size)

// Enumerate using a block.
var gotCallback = false
var blockFunc = ffi.Callback('int8', [ POINTER, POINTER, POINTER ], function (block, obj, stopPtr) {
  //console.error('inside block!')
  //console.error("Enumerate: %d!", index)
  gotCallback = true
  return 7
})

var bl = new __block_literal_1
var bd = new __block_descriptor_1

// static
bd.reserved = 0
bd.Block_size = __block_literal_1.size

bl.isa = ffi.DynamicLibrary().get('_NSConcreteGlobalBlock')
//console.log('isa:', bl.isa)
bl.flags = (1<<29)
//console.log('flags:', bl.flags)
bl.reserved = 0
//console.log('reserved:', bl.reserved)
bl.invoke = blockFunc
//console.log('invoke:', bl.invoke)
bl.descriptor = bd.ref()
//console.log('descriptor:', bl.descriptor)


//console.log(bl.pointer)
//console.error(msgSend2(msgSend(bl.pointer, description), UTF8String))

msgSend3(set, objectsPassingTest, bl.ref())

process.on('exit', function () {
  assert.ok(gotCallback)
})
