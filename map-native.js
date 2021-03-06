// Copyright (c) 2020 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* eslint max-statements:[0, 99] */


var bufrw = require('@shumih/bufrw');
var inherits = require('util').inherits;
var errors = require('./errors');

// RW a thrift map to an Object

// ktype:1 vtype:1 length:4 (k... v...){length}

function MapNativeRW(ktype, vtype) {
    this.ktype = ktype;
    this.vtype = vtype;

    if (this.vtype.rw.width) {
        this.poolByteLength = this.mapVarFixbyteLength;
    }

    bufrw.Base.call(this);
}
inherits(MapNativeRW, bufrw.Base);

MapNativeRW.prototype.poolByteLength = function mapVarVarByteLength(destResult, map) {
    var keys = map && Array.from(map.keys());
    var len = 6; // static overhead

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = map.get(key);
        var res = this.ktype.rw.poolByteLength(destResult, key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;

        res = this.vtype.rw.poolByteLength(destResult, value);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return destResult.reset(null, len);
};

MapNativeRW.prototype.mapVarFixbyteLength = function mapVarFixByteLength(destResult, map) {
    var keys = map && Array.from(map.keys());
    var len = 6 + keys.length * this.vtype.rw.width;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var res = this.ktype.rw.poolByteLength(destResult, key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return destResult.reset(null, len);
};

MapNativeRW.prototype.poolWriteInto = function poolWriteInto(destResult, map, buffer, offset) {
    // ktype:1
    var res = bufrw.UInt8.poolWriteInto(destResult, this.ktype.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // vtype:1
    res = bufrw.UInt8.poolWriteInto(destResult, this.vtype.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // length:4
    var keys = map && Array.from(map.keys());
    res = bufrw.UInt32BE.poolWriteInto(destResult, keys.length, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // (k... v...){length}
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = map.get(key);

        // k...
        res = this.ktype.rw.poolWriteInto(destResult, key, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;

        // v...
        res = this.vtype.rw.poolWriteInto(destResult, value, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
    }

    return destResult.reset(null, offset);
};

MapNativeRW.prototype.poolReadFrom = function poolReadFrom(destResult, buffer, offset) {
    // ktype:1
    var res = bufrw.UInt8.poolReadFrom(destResult, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var ktypeid = res.value;

    if (ktypeid !== this.ktype.typeid) {
        return destResult.reset(errors.MapKeyTypeIdMismatch({
            encoded: ktypeid,
            expected: this.ktype.name,
            expectedId: this.ktype.typeid
        }), offset);
    }

    // vtype:1
    res = bufrw.UInt8.poolReadFrom(destResult, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var vtypeid = res.value;

    if (vtypeid !== this.vtype.typeid) {
        return destResult.reset(errors.MapValTypeIdMismatch({
            encoded: vtypeid,
            expected: this.vtype.name,
            expectedId: this.vtype.typeid
        }), offset);
    }

    // length:4
    res = bufrw.UInt32BE.poolReadFrom(destResult, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var length = res.value;

    // (k... v...){length}
    var result = new Map();
    for (var i = 0; i < length; i++) {

        // k...
        res = this.ktype.rw.poolReadFrom(destResult, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var key = res.value;

        // v...
        res = this.vtype.rw.poolReadFrom(destResult, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var val = res.value;

        result.set(key, val);
    }

    return destResult.reset(null, offset, result);
};

module.exports.MapNativeRW = MapNativeRW;
