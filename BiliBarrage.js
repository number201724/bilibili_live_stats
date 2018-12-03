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
        this.is_connected = false;
        this.start();
    }

    createSocket() {
        let sock = new Socket();

        sock.sendSocketData = (p1, p2, p3, p4, p5, p6) => {
            if (!sock.writable) {
                return;
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

            sock.write(bufferBuilder.buffer);
        }

        sock.sendHeartBeat = () => {
            sock.sendSocketData(16, 16, 1, 2);
        }

        sock.on('connect', () => {
            
            let buffer = Buffer.from(`{"roomid": ${this.roomId}, "uid": ${this.uid}}`);

            sock.sendSocketData(16 + buffer.length, 16, 1, 7, 1, buffer);
            sock.sendHeartBeat();
            sock.setTimeout(10000);     //30秒超时

            sock.heartbeat = setInterval(sock.sendHeartBeat, 10000);

            this.event_connected();
        });

        sock.on('close', () => {
            this.bufferReader.clear();
            this.packLen = -1;
            
            if(typeof sock.heartbeat != "undefined") {
                clearInterval(sock.heartbeat);
                sock.heartbeat = undefined;
            }

            this.event_disconnected();
        });

        sock.on('error', function () {
            this.destroy();
        });

        sock.on('timeout', function() {
            this.destroy();
        });
        
        sock.on('data', this.event_data.bind(this));

        return sock;
    }

    event_connected () {
        this.is_connected = true;
        console.log(`Room ${this.roomId} barrage server connected`);
    }

    event_disconnected() {
        if(this.is_connected) {
            console.log(`Room ${this.roomId} barrage server closed`);
        } else {
            console.log(`Connect ${this.roomId} barrage server failed`);
        }
        
        this.sock = undefined;
    }

    event_data(data) {
        this.bufferReader.addBuffer(data);
        this.parse_packet();
    }

    daemon_update() {
        if(typeof this.sock != "undefined") {
            return;
        }

        this.sock = this.createSocket();
        this.sock.connect(788, 'livecmt-2.bilibili.com');
    }

    start() {
        if(typeof this.daemon != "undefined") {
            return;
        }

        this.daemon = setInterval(this.daemon_update.bind(this), 3000);
        this.daemon_update();
    }

    stop() {
        if(typeof this.daemon != "undefined") {
            clearInterval(this.daemon);
            this.daemon = undefined;
        }

        if(typeof this.sock != "undefined") {
            this.sock.destroy();
            this.sock = undefined;
        }
    }

    on_packet(index, bufferReader) {
        if (index === 3 || index === 4) {
            try {
                let json = JSON.parse(bufferReader.readToEnd().toString());
                this.msgHandler(json, this.roomId);
            } catch (err) {
                console.log(err);
            }
        }
    }

    parse_packet() {
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
            this.on_packet(index, new BufferReader(this.bufferReader.readBuffer(this.packLen)));
            this.packLen = -1;
        }
        if (this.bufferReader.readableLen() === 0) this.bufferReader.clear();

        this.handling = false;
        if (this.reHandle || (this.packLen === -1 && this.bufferReader.readableLen() >= 4)) this.parse_packet();
    }
}

module.exports = BiliBarrage;