class BufferBuilder {
    constructor(buffer) {
        this.buffer = Buffer.alloc(0) || buffer;
    }

    writeBuffer(buffer) {
        this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + buffer.length);
    }

    writeInt(number) {
        let tempBuffer = Buffer.alloc(4);
        tempBuffer.writeInt32BE(number, 0);
        this.writeBuffer(tempBuffer);
    }

    writeShort(number) {
        let tempBuffer = Buffer.alloc(2);
        tempBuffer.writeInt16BE(number, 0);
        this.writeBuffer(tempBuffer);
    }
}

module.exports = BufferBuilder;