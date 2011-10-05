/**
 * Logic for translating a given Objective-C "type" encoding into a node-ffi
 * type.
 *
 * Reference: http://developer.apple.com/library/mac/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Articles/ocrtTypeEncodings.html
 * node-ffi Type List: https://github.com/rbranson/node-ffi/wiki/Node-FFI-Tutorial#wiki-type-list
 */

exports.map = map
exports.mapArray = mapArray
exports.parse = parse

var struct = require('./struct')

var typeEncodings = {
    'c': 'char'
  , 'i': 'int32'
  , 's': 'short'
  , 'l': 'long'
  , 'q': 'longlong'
  , 'C': 'uchar'
  , 'I': 'uint32'
  , 'S': 'ushort'
  , 'L': 'ulong'
  , 'Q': 'ulonglong'
  , 'f': 'float'
  , 'd': 'double'
  , 'B': 'int8'
  , 'v': 'void'
  , '*': 'string'   // String
  , '@': 'pointer'  // id
  , '#': 'pointer'  // Class
  , ':': 'pointer'  // SEL
  , '?': 'pointer'  // Unknown, used for function pointers
}

var methodEncodings = {
    'r': 'const'
  , 'n': 'in'
  , 'N': 'inout'
  , 'o': 'out'
  , 'O': 'bycopy'
  , 'R': 'byref'
  , 'V': 'oneway'
}

/**
 * Maps a single Obj-C 'type' into a valid node-ffi type.
 * This mapping logic is kind of a mess...
 */
function map (type) {
  if (!type) throw new Error('got falsey "type" to map ('+type+'). this should NOT happen!');
  if (type.type) type = type.type
  if (struct.isStruct(type)) return struct.getStruct(type);
  var rtn = typeEncodings[type];
  if (rtn) return rtn;
  if (type[0] === '^') return 'pointer';
  rtn = typeEncodings[type[type.length-1]];
  if (rtn) return rtn;
  if (type[0] == '[')
    throw new Error('Array types not yet supported: ' + type);
  if (type[0] == '(')
    throw new Error('Union types not yet supported: ' + type);
  if (type[0] == 'b')
    throw new Error('Bit field types not yet supported: ' + type);
  throw new Error('Could not convert type: ' + type);
}

/**
 * Accepts an Array of ObjC return type and argument types (i.e. the result of
 * parse() below), and returns a new Array with the values mapped to valid ffi
 * types.
 */
function mapArray (types) {
  return types.map(function (type) {
    return Array.isArray(type) ? exports.mapArray(type) : exports.map(type);
  });
}

/**
 * Parses a "types string" (i.e. "v@:") and returns a "types Array", where the
 * return type is the first array value, and an Array of argument types is the
 * array second value.
 */
function parse (types) {
  if (types[1] !== '@' || types[2] !== ':')
    throw new Error('Invalid types string: '+types)
  return [ types[0], types.substring(1).split('') ]
}
