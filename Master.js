global.Util = require("./Util");
const mysql = require('promise-mysql');
const fs = require('fs')
const BiliBarrage = require("./BiliBarrage");
const https = require('https');

global.room_map = new Map();

function add_room_map(room) {
    if (!room_map.has(room.roomId)) {
        room_map.set(room.roomId, room);
    }
}

async function updateUserInfo(db, uid, uname, gold, silver) {
    let results = await db.query('SELECT * FROM users WHERE uid = ?', [uid]);

    if (gold != null && silver != null) {       //如果有金瓜子和银瓜子信息就更新数据
        if (results.length == 0) {
            try {
                results = await db.query('INSERT INTO users VALUES(?, ?, ?,?,NOW(),NOW())', [uid, uname, gold, silver]);
            }
            catch (e) {
                await db.query('UPDATE users SET uname = ?, gold = ?, silver = ?, updated_at = NOW() WHERE uid = ?', [uname, gold, silver, uid]);
            }
        } else {
            await db.query('UPDATE users SET uname = ?, gold = ?, silver = ?, updated_at = NOW() WHERE uid = ?', [uname, gold, silver, uid]);
        }
    } else {

        if (results.length == 0) {
            try {
                results = await db.query('INSERT INTO users VALUES(?,?,0,0,NOW(),NOW())', [uid, uname]);
            }
            catch (e) {
                await db.query('UPDATE users SET uname = ?, updated_at = NOW() WHERE uid = ?', [uname, uid]);
            }
        } else {
            await db.query('UPDATE users SET uname = ?, updated_at = NOW() WHERE uid = ?', [uname, uid]);
        }
    }
}

async function giftEventHandler(json, roomId) {
    uid = json.data.uid;
    giftId = json.data.giftId;
    uname = json.data.uname;
    giftname = json.data.giftName;
    coin_type = json.data.coin_type;
    total_coin = json.data.total_coin;
    gold = json.data.gold;
    silver = json.data.silver;
    num = json.data.num;

    let db = await pool.getConnection();

    if (coin_type != 'silver') {
        try {
            await db.query('INSERT INTO gifts VALUES(NULL,?,?,?,?,?,?,?,?,?,?,NOW());', [roomId, uid, giftId, uname, giftname, coin_type, total_coin, gold, silver, num]);
        }
        catch (e) {
            console.log(e);
        }
        await updateUserInfo(db, uid, uname, gold, silver);
    } else {
        await updateUserInfo(db, uid, uname, null, null);
    }

    await pool.releaseConnection(db);
}

async function danmuEventHandler(json, roomId) {

    uid = json.info[2][0];
    uname = json.info[2][1];
    text = json.info[1];
    is_admin = json.info[2][2];
    ship_member = json.info[7];


    let db = await pool.getConnection();

    // try {
    //     await db.query('INSERT INTO danmu VALUES(NULL,?,?,?,?,?,?,NOW());', [roomId, uid, uname, text, is_admin, ship_member]);
    // }
    // catch (e) {
    //     console.log(e);
    // }

    await updateUserInfo(db, uid, uname, null, null);

    await pool.releaseConnection(db);
}

async function guardBuyEventHandle(json, roomId) {

    uid = json.data.uid;
    giftId = json.data.gift_id;
    uname = json.data.username;
    giftname = json.data.gift_name;
    coin_type = 'gold';
    total_coin = json.data.price;
    gold = 0;
    silver = 0;
    super_gift_num = json.data.num;

    let db = await pool.getConnection();

    try {
        await db.query('INSERT INTO gifts VALUES(NULL,?,?,?,?,?,?,?,?,?,?,NOW());', [roomId, uid, giftId, uname, giftname, coin_type, total_coin, gold, silver, super_gift_num], function (err, result) { if (err != null) { console.log(err); } });

    } catch (e) {
        console.log(e)
    }

    if (coin_type != 'silver') {
        await updateUserInfo(db, uid, uname, null, null);
    } else {
        await updateUserInfo(db, uid, uname, null, null);
    }

    await pool.releaseConnection(db);
}

async function roomRankEventHandler(json, roomId) {
    let room_id = json.data.roomid;
    let uid = 0;
    let title = '#UNKNOWN';

    console.log(json);

    let db = await pool.getConnection();

    try {
        let results = await db.query('SELECT * FROM room WHERE room_id = ?', [room_id]);

        if (results.length == 0) {
            await db.query('INSERT INTO room VALUES(?,?,?);', [room_id, uid, title]);
        }

        if (!room_map.has(room_id)) {
            add_room_map(new BiliBarrage(room_id, cmtEventHandler));
        }
    }
    catch (e) {
        console.log(e);

    }


    await pool.releaseConnection(db);
}

async function cmtEventHandler(json, roomId) {

    switch (json.cmd) {
        case 'new_anchor_reward':
        case 'WELCOME':         //欢迎老爷进入房间xxoo
        case 'NOTICE_MSG':      //广播通知消息
        case 'ENTRY_EFFECT':    //舰长进入房间特效
        case 'SPECIAL_GIFT':    //特效礼物 SPECIAL_GIFT 
        case 'WISH_BOTTLE':     //心愿瓶变动消息


        case 'COMBO_SEND':      //礼物连击消息
        case 'COMBO_END':       //礼物连击结束
        case 'WELCOME_ACTIVITY':    //进入房间特效(排行榜人物)
        case 'GUARD_LOTTERY_START'://舰长抽奖
        case 'USER_TOAST_MSG':  //不知道
        case 'LIVE':        //开始直播了
        case 'PREPARING':   //缓存中（转圈）
        case 'ROOM_BLOCK_MSG':  //不知道是啥
        case 'ROOM_SILENT_ON':  //禁言开启低等级无法发言？
        case 'ROOM_SILENT_OFF': //禁言关闭? 直播结束？
        case 'WELCOME_GUARD':   //  { cmd: 'WELCOME_GUARD',data: { uid: 11510390, username: '熊熊今天也是高冷的呀', guard_level: 3 } }
        case 'CHANGE_ROOM_INFO':
        case 'RAFFLE_START':    //抽奖开始
        case 'RAFFLE_END':      //抽奖结束
        case 'WARNING':     //警告
        case 'CUT_OFF': //切掉
        case 'ACTIVITY_EVENT':  //活动信息
            //case 'HOUR_RANK_AWARDS':
            //console.log(json);
            break;
        case 'GUARD_MSG':       //不知道是什么 开通总督的横屏消息
        case 'SYS_MSG':         //系统消息 横屏消息
        case 'SYS_GIFT':        //节奏风暴20倍触发这个
        case 'HOUR_RANK_AWARDS':
            console.log(json);
            break;
        case 'ROOM_RANK':       //小时榜rank更新
            roomRankEventHandler(json, roomId);
            break;
        case 'SEND_GIFT':       //礼物消息
            await giftEventHandler(json, roomId);
            break;
        case 'DANMU_MSG':       //弹幕消息
            await danmuEventHandler(json, roomId);
            break;
        case 'GUARD_BUY':
            await guardBuyEventHandle(json, roomId);
            break;

        default:                //不晓得啥消息输出到控制台
            console.log(json);
            break;
    }
}

async function load_room_table() {
    let db = await pool.getConnection();


    let results = await db.query('SELECT * FROM room');

    for (let i in results) {
        let room_id = results[i]['room_id'];

        if (!room_map.has(room_id)) {
            add_room_map(new BiliBarrage(room_id, cmtEventHandler));
        }
    }

    await pool.releaseConnection(db);
}

async function parseRankResult(json) {
    if (json.code == 0) {
        for (let i in json.data.list) {
            let roomid = json.data.list[i].roomid;
            let uid = json.data.list[i].uid;
            let uname = json.data.list[i].uname;

            let db = await pool.getConnection();

            try {
                let results = await db.query('SELECT * FROM room WHERE room_id = ?', [roomid]);

                if (results.length == 0) {
                    await db.query('INSERT INTO room VALUES(?,?,?);', [roomid, uid, uname]);
                } else {
                    await db.query('UPDATE room SET title = ? ,uid = ? WHERE room_id = ?;', [uname, uid, roomid]);
                }

                if (!room_map.has(roomid)) {
                    add_room_map(new BiliBarrage(roomid, cmtEventHandler));
                }
            }
            catch (e) {
                console.log(e);
            }

            await pool.releaseConnection(db);
        }
    }
}

async function getRank(area_id) {
    var options = {
        host: 'api.live.bilibili.com',
        port: 443,
        path: '/rankdb/v1/Rank2018/getTop?type=master_last_hour&type_id=areaid_hour&area_id='+area_id,
        method: 'GET'
    };

    var req = https.request(options, function (res) {
        var body = '';

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body = body + chunk;
        });

        res.on('end', function () {
            if (res.statusCode == 200)

                try {
                    let json = JSON.parse(body);
                    console.log(json)
                    parseRankResult(json);
                } catch (e) {

                }
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });


    req.end();

}


async function updateRank2018(){
    await getRank(1);
    await getRank(2);
    await getRank(3);
    await getRank(4);
    await getRank(5);
}

async function main() {
    global.pool = await mysql.createPool(JSON.parse(fs.readFileSync('db.json')));

    

    add_room_map(new BiliBarrage(82178, cmtEventHandler));        //猫不吃芒果め
    add_room_map(new BiliBarrage(271744, cmtEventHandler));       //某幻君
    add_room_map(new BiliBarrage(5441, cmtEventHandler));         //痒局长
    add_room_map(new BiliBarrage(1569975, cmtEventHandler));      //OldBa1
    add_room_map(new BiliBarrage(91137, cmtEventHandler));       //与山0v0
    add_room_map(new BiliBarrage(70270, cmtEventHandler));        //狐妖Mikan
    add_room_map(new BiliBarrage(151159, cmtEventHandler));       //波喵喵喵
    add_room_map(new BiliBarrage(10270514, cmtEventHandler));     //程笑哥哥
    add_room_map(new BiliBarrage(227311, cmtEventHandler));       //萌萌哒的白
    add_room_map(new BiliBarrage(3742025, cmtEventHandler));       //梦醒三生梦
    add_room_map(new BiliBarrage(48499, cmtEventHandler));       //扎双马尾的丧尸
    add_room_map(new BiliBarrage(35298, cmtEventHandler));       //迷路的牙刷
    add_room_map(new BiliBarrage(1015793, cmtEventHandler));       //刘明月阿
    add_room_map(new BiliBarrage(36250, cmtEventHandler));       //靖菌命
    add_room_map(new BiliBarrage(30493, cmtEventHandler));        //吴织亚切大忽悠
    add_room_map(new BiliBarrage(1329719, cmtEventHandler));       //被画画耽误的不二
    add_room_map(new BiliBarrage(48840, cmtEventHandler));       //凉风OvQ
    add_room_map(new BiliBarrage(5311231, cmtEventHandler));       //青衣才不是御姐呢
    add_room_map(new BiliBarrage(66251, cmtEventHandler));       //春去丶残秋
    add_room_map(new BiliBarrage(66688, cmtEventHandler));       //风竹教主解说
    add_room_map(new BiliBarrage(793902, cmtEventHandler));       //泡芙喵-PuFF
    add_room_map(new BiliBarrage(174691, cmtEventHandler));       //叽智机智
    add_room_map(new BiliBarrage(424902, cmtEventHandler));       //Tocci椭奇
    add_room_map(new BiliBarrage(64540, cmtEventHandler));       //抽风的小婳妹纸
    add_room_map(new BiliBarrage(394518, cmtEventHandler));       //一只小仙若
    add_room_map(new BiliBarrage(893125, cmtEventHandler));       //蘑菇mo_
    add_room_map(new BiliBarrage(1482339, cmtEventHandler));       //鳗鱼霏儿
    add_room_map(new BiliBarrage(314368, cmtEventHandler));       //miriちゃん
    add_room_map(new BiliBarrage(521429, cmtEventHandler));       //小野妹子w
    add_room_map(new BiliBarrage(274926, cmtEventHandler));       //蛋黄姬GAT-X105
    add_room_map(new BiliBarrage(10729306, cmtEventHandler));       //会飞的芽子
    add_room_map(new BiliBarrage(98631, cmtEventHandler));       //小葵葵葵葵Aoi
    add_room_map(new BiliBarrage(8695080, cmtEventHandler));       //-彤-子-
    add_room_map(new BiliBarrage(96136, cmtEventHandler));       //浅野菌子
    add_room_map(new BiliBarrage(5632028, cmtEventHandler));       //Elifaus

    await load_room_table();
    await updateRank2018();

    setInterval(() => {updateRank2018();}, 60000);
}

main();