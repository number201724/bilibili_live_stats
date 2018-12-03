const net = require('net');
const Socket = net.Socket;
const BufferBuilder = require('./BufferBuilder');
const BufferReader = require('./BufferReader');

class BiliBarrage {
    constructor(roomId, msgHandler) {
        this.roomId = roomId;
        this.msgHandler = msgHandler || EmptyFun;
        this.uid = 1.0E14 + Number((2.0E14 * Math.random()).toFixed(0));

        this.packLen = -1;
        this.bufferReader = new BufferReader();
        this.sock = null;

        this.start();
    }

    start() {
        if (this.sock != null) {
            return;
        }

        this.sock = new Socket();

        this.sock.on('connect', () => {
            console.log(`Room ${this.roomId} barrage server connected`);
            let buffer = Buffer.from(`{"roomid": ${this.roomId}, "uid": ${this.uid}}`);
            this.sendSocketData(16 + buffer.length, 16, 1, 7, 1, buffer);
            this.sendHeartBeat();
        });

        this.sock.on('close', () => {
            console.log(`Room ${this.roomId} barrage server closed`);
            this.bufferReader.clear();
            this.packLen = -1;
            this.connect();
        });

        this.sock.on('error', () => {
            this.sock.end();
        });

        this.sock.on('data', this.onData.bind(this));
        this.interval = setInterval(this.sendHeartBeat.bind(this), 10000);

        this.connect()
    }

    stop() {
        if (this.sock == null) {
            return;
        }

        clearInterval(this.interval);
        this.interval = null;

        this.sock.destroy();
        this.sock = null;
    }

    connect() {
        if (this.sock != null) 
        {
            this.sock.connect(788, 'livecmt-2.bilibili.com');
            console.log("run connect");
        }
        else
        {
            console.log("bad socket")
        }
    }

    sendSocketData(p1, p2, p3, p4, p5, p6) {
        if (!this.sock.writable) {
            return console.log('cant write');
        }
        let bufferBuilder = new BufferBuilder();
        if (p5 === null) p5 = 1;
        bufferBuilder.writeInt(p1);
        bufferBuilder.writeShort(p2);
        bufferBuilder.writeShort(p3);
        bufferBuilder.writeInt(p4);
        bufferBuilder.writeInt(p5);
        if (!Util.isNullOrUndefined(p6))
            bufferBuilder.writeBuffer(p6);
        this.sock.write(bufferBuilder.buffer);
    }

    sendHeartBeat() {
        this.sendSocketData(16, 16, 1, 2);
    }

    onData(data) {
        this.bufferReader.addBuffer(data);
        this.packParser();
    }

    onPack(index, bufferReader) {
        if (index === 3 || index === 4) {
            try {
                let json = JSON.parse(bufferReader.readToEnd().toString());
                this.msgHandler(json, this.roomId);
            } catch (err) {
                this.sock.end();
            }
        }
    }

    packParser() {
        this.reHandle = this.handling;
        if (this.handling) return;
        this.handling = true;

        if (this.packLen === -1) this.packLen = this.bufferReader.readInt() - 4;
        if (this.bufferReader.readableLen() >= this.packLen) {
            let l4 = this.bufferReader.readShort();
            let l2 = this.bufferReader.readShort();
            let index = this.bufferReader.readInt() - 1;
            let l1 = this.bufferReader.readInt();
            this.packLen -= 12;
            this.onPack(index, new BufferReader(this.bufferReader.readBuffer(this.packLen)));
            this.packLen = -1;
        }
        if (this.bufferReader.readableLen() === 0) this.bufferReader.clear();

        this.handling = false;
        if (this.reHandle || (this.packLen === -1 && this.bufferReader.readableLen() >= 4)) this.packParser();
    }
}

module.exports = BiliBarrage;