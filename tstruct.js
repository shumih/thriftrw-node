// Copyright (c) 2015 Uber Technologies, Inc.
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
'use strict';

var bufrw = require('bufrw');
var TYPE = require('./TYPE');
var inherits = require('util').inherits;
var InvalidTypeidError = require('./errors').InvalidTypeidError;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function TStruct(fields) {
    if (!(this instanceof TStruct)) {
        return new TStruct(fields);
    }
    this.fields = fields || [];
    // each field is a list of [typeid, fieldid, val]
}

TStruct.RW = TStructRW;

function TStructRW(opts) {
    if (!(this instanceof TStructRW)) {
        return new TStructRW(opts);
    }
    this.ttypes = opts.ttypes;
}
inherits(TStructRW, bufrw.Base);

TStructRW.prototype.byteLength = function byteLength(struct) {
    var length = 1; // STOP byte
    var t;
    for (var i = 0; i < struct.fields.length; i++) {
        var field = struct.fields[i];
        var type = this.ttypes[field[0]];
        if (!type) {
            return LengthResult.error(InvalidTypeidError({
                typeid: field[0], name: 'field::type'}));
        }

        length += 3; // field header length

        t = type.byteLength(field[2]);
        if (t.err) {
            return t;
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

TStructRW.prototype.writeInto = function writeInto(struct, buffer, offset) {
    var t;
    for (var i = 0; i < struct.fields.length; i++) {
        var field = struct.fields[i];
        var type = this.ttypes[field[0]];
        if (!type) {
            return LengthResult.error(InvalidTypeidError({
                typeid: field[0], name: 'field::type'}));
        }

        t = bufrw.Int8.writeInto(field[0], buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;

        t = bufrw.Int16BE.writeInto(field[1], buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;

        t = type.writeInto(field[2], buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;
    }
    t = bufrw.Int8.writeInto(TYPE.STOP, buffer, offset);
    if (t.err) {
        return t;
    }
    offset = t.offset;
    return WriteResult.just(offset);
};

TStructRW.prototype.readFrom = function readFrom(buffer, offset) {
    /* eslint no-constant-condition:[0] */
    var struct = new TStruct();
    var t;
    while (true) {
        t = bufrw.Int8.readFrom(buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;
        var typeid = t.value;
        if (typeid === TYPE.STOP) {
            break;
        }
        var type = this.ttypes[typeid];
        if (!type) {
            return LengthResult.error(InvalidTypeidError({
                typeid: typeid, name: 'field::type'}));
        }

        t = bufrw.Int16BE.readFrom(buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;
        var id = t.value;

        t = type.readFrom(buffer, offset);
        if (t.err) {
            return t;
        }
        offset = t.offset;
        var val = t.value;
        struct.fields.push([typeid, id, val]);
    }
    return ReadResult.just(offset, struct);
};

module.exports = TStruct;