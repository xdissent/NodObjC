
var assert = require('assert')
var $ = require('../')

$.import('Foundation')
var pool = $.NSAutoreleasePool('alloc')('init');

var array = $.NSMutableArray('arrayWithCapacity', 2);
array('addObject', $.NSArray);

var nsarray = array('objectAtIndex', 0);

assert.equal(nsarray.pointer.address(), $.NSArray.pointer.address())
assert.strictEqual(nsarray, $.NSArray, 'fails strict equality test')
