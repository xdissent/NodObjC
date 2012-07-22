
var assert = require('assert')
var core = require('../../lib/core')
var Method = require('../../lib/method')

var NSObject = core.objc_getClass('NSObject')
assert.equal('function', typeof NSObject)

var alloc = core.class_getClassMethod(NSObject, 'alloc')
assert.ok(alloc instanceof Method)
assert.equal('alloc', core.method_getName(alloc))
