
var assert = require('assert')
var SEL = require('../lib/sel')

// cache should be empty
assert.equal(0, Object.keys(SEL.cache).length)

var sel = 'stringWithUTF8String:'
var swus = SEL.toSEL(sel)

// cache should have 1 entry
assert.equal(1, Object.keys(SEL.cache).length)

// should return a cached reference
assert.strictEqual(swus, SEL.toSEL(sel))

// should match the input string when "toJsString()" is called
assert.equal(sel, SEL.toJsString(swus))
