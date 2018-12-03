class BufferReader {
    constructor(buffer) 
    {
        this.buffer = buffer || Buffer.alloc(0)
    }

    readableLen() 
    {
        return this.buffer.length;
    }

    addBuffer(buffer) 
    {
        this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + buffer.length);
    }

    readBuffer(len) 
    {
        let data = this.buffer.slice(0, len);
        this.buffer = this.buffer.slice(len);
        return data;
    }

    readInt() 
    {
        let data = this.buffer.readInt32BE(0);
        this.buffer = this.buffer.slice(4);
        return data;
    }

    readShort() 
    {
        let data = this.buffer.readInt16BE(0);
        this.buffer = this.buffer.slice(2);
        return data;
    }

    readToEnd() 
    {
        return this.readBuffer(this.readableLen());
    }

    clear() 
    {
        this.buffer = Buffer.alloc(0)
    }
}

module.exports = BufferReader;