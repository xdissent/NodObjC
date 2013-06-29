var $ = require('../')
  , assert = require('assert')

describe('constants', function () {
  $.framework('Foundation')

  it('should be imported', function () {
    assert.ok($.NSDefaultRunLoopMode)
  })
})