class BufferReader {
    constructor(buffer) {
        this.buffer = buffer || Buffer.alloc(0)
        this.position = 0;
    }

    readableLen() {
        return this.buffer.length - this.position;
    }

    addBuffer(buffer) {
        this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + buffer.length);
    }

    readBuffer(len) {
        let data = this.buffer.slice(this.position, this.position + len);
        this.position += len;
        return data;
    }

    readInt() {
        let data = this.buffer.readInt32BE(this.position);
        this.position += 4;
        return data;
    }

    readShort() {
        let data = this.buffer.readInt16BE(this.position);
        this.position += 2;
        return data;
    }

    readToEnd() {
        return this.readBuffer(this.readableLen());
    }

    clear() {
        this.buffer = Buffer.alloc(0)
        this.position = 0;
    }
}

module.exports = BufferReader;