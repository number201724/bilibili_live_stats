global.Util = require("./Util");
const mysql = require('promise-mysql');
const fs = require('fs')
const BiliBarrage = require("./BiliBarrage");


function twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
}

Date.prototype.toMysqlFormat = function () {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

async function updateUserInfo(db, uid, uname, gold, silver) {
        let results = await db.query('SELECT * FROM users WHERE uid = ?', [uid]);

        if (gold != null && silver != null) {       //如果有金瓜子和银瓜子信息就更新数据
            if(results.length == 0) {
                try {
                    results = await db.query('INSERT INTO users VALUES(?, ?, ?,?,?,?)', [uid, uname, gold, silver, new Date().toMysqlFormat(), new Date().toMysqlFormat()]);
                }
                catch(e){
                    await db.query('UPDATE users SET uname = ?, gold = ?, silver = ?, updated_at = ? WHERE uid = ?', [uname, gold, silver, new Date().toMysqlFormat(), uid]);
                }
            } else {
                await db.query('UPDATE users SET uname = ?, gold = ?, silver = ?, updated_at = ? WHERE uid = ?', [uname, gold, silver, new Date().toMysqlFormat(), uid]);
            }
        } else {
    
            if(results.length == 0) {
                try {
                    results = await db.query('INSERT INTO users VALUES(?,?,0,0,?,?)', [uid, uname, new Date().toMysqlFormat(), new Date().toMysqlFormat()]);
                }
                catch(e){
                    await db.query('UPDATE users SET uname = ?, updated_at = ? WHERE uid = ?', [uname, new Date().toMysqlFormat(), uid]);
                }
            } else {
                await db.query('UPDATE users SET uname = ?, updated_at = ? WHERE uid = ?', [uname, new Date().toMysqlFormat(), uid]);
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
    time = new Date().toMysqlFormat();

    let db = await pool.getConnection();

    if (coin_type != 'silver') {
        try {
            await db.query('INSERT INTO gifts VALUES(NULL,?,?,?,?,?,?,?,?,?,?,?);', [roomId, uid, giftId, uname, giftname, coin_type, total_coin, gold, silver, num, time]);
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
    time = new Date().toMysqlFormat();


    let db = await pool.getConnection();

    try {
        await db.query('INSERT INTO danmu VALUES(NULL,?,?,?,?,?,?,?);', [roomId, uid, uname, text, is_admin, ship_member, time]);
    }
    catch (e) {
        console.log(e);
    }

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
    time = new Date().toMysqlFormat();

    let db = await pool.getConnection();

    try {
        await db.query('INSERT INTO gifts VALUES(NULL,?,?,?,?,?,?,?,?,?,?,?);', [roomId, uid, giftId, uname, giftname, coin_type, total_coin, gold, silver, super_gift_num, time], function (err, result) { if (err != null) { console.log(err); } });

    }catch(e){
        console.log(e)
    }
    
    if (coin_type != 'silver') {
        await updateUserInfo(db, uid, uname, null, null);
    } else {
        await updateUserInfo(db, uid, uname, null, null);
    }

    await pool.releaseConnection(db);
}

async function cmtEventHandler(json, roomId) {

    switch (json.cmd) {
        case 'ROOM_RANK':       //小时榜rank更新
        case 'WELCOME':         //欢迎老爷进入房间xxoo
        case 'NOTICE_MSG':      //广播通知消息
        case 'ENTRY_EFFECT':    //舰长进入房间特效
        case 'SPECIAL_GIFT':    //特效礼物 SPECIAL_GIFT 
        case 'WISH_BOTTLE':     //心愿瓶变动消息
        case 'SYS_MSG':         //系统消息 横屏消息
        case 'SYS_GIFT':        //节奏风暴20倍触发这个
        case 'GUARD_MSG':       //不知道是什么 开通总督的横屏消息
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
async function main() {
    global.pool = await mysql.createPool(JSON.parse(fs.readFileSync('db.json')));
    
    new BiliBarrage(82178, cmtEventHandler);        //猫不吃芒果め
    new BiliBarrage(271744, cmtEventHandler);       //某幻君
    new BiliBarrage(5441, cmtEventHandler);         //痒局长
    new BiliBarrage(1569975, cmtEventHandler);      //OldBa1
    new BiliBarrage(91137, cmtEventHandler);       //与山0v0
    new BiliBarrage(70270, cmtEventHandler);        //狐妖Mikan
    new BiliBarrage(151159, cmtEventHandler);       //波喵喵喵
    new BiliBarrage(10270514, cmtEventHandler);     //程笑哥哥
    new BiliBarrage(227311, cmtEventHandler);       //萌萌哒的白
    new BiliBarrage(3742025, cmtEventHandler);       //梦醒三生梦
    new BiliBarrage(48499, cmtEventHandler);       //扎双马尾的丧尸
    new BiliBarrage(35298, cmtEventHandler);       //迷路的牙刷
    new BiliBarrage(1015793, cmtEventHandler);       //刘明月阿
    new BiliBarrage(36250, cmtEventHandler);       //靖菌命
    new BiliBarrage(30493, cmtEventHandler);        //吴织亚切大忽悠
    new BiliBarrage(1329719, cmtEventHandler);       //被画画耽误的不二
    new BiliBarrage(48840, cmtEventHandler);       //凉风OvQ
    new BiliBarrage(5311231, cmtEventHandler);       //青衣才不是御姐呢
    new BiliBarrage(66251, cmtEventHandler);       //春去丶残秋
    new BiliBarrage(66688, cmtEventHandler);       //风竹教主解说
    new BiliBarrage(793902, cmtEventHandler);       //泡芙喵-PuFF
    new BiliBarrage(174691, cmtEventHandler);       //叽智机智
    new BiliBarrage(424902, cmtEventHandler);       //Tocci椭奇
    new BiliBarrage(64540, cmtEventHandler);       //抽风的小婳妹纸
    new BiliBarrage(394518, cmtEventHandler);       //一只小仙若
    new BiliBarrage(893125, cmtEventHandler);       //蘑菇mo_
    new BiliBarrage(1482339, cmtEventHandler);       //鳗鱼霏儿
    new BiliBarrage(314368, cmtEventHandler);       //miriちゃん
    new BiliBarrage(521429, cmtEventHandler);       //小野妹子w
    new BiliBarrage(274926, cmtEventHandler);       //蛋黄姬GAT-X105
    new BiliBarrage(10729306, cmtEventHandler);       //会飞的芽子
    new BiliBarrage(98631, cmtEventHandler);       //小葵葵葵葵Aoi
    new BiliBarrage(8695080, cmtEventHandler);       //-彤-子-
    new BiliBarrage(96136, cmtEventHandler);       //浅野菌子
    new BiliBarrage(5632028, cmtEventHandler);       //Elifaus
}

main();