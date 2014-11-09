var async = require('async');
var request = require('request');
Config = require('../config');

var clients = {};
var FULL_EQUIPMENTS = ['dl', 'to', 'ho', 'vo', 'kn', 'pl'];
var MONSTERS = ['gb', 'sk', 'or', 'va', 'go', 'li', 'de', 'dr'];
var FULL_DECK_NUM   = 13;
var STATE_WAITING_VORPAL_SELECT = 'waitingVorpalSelect';


function connect(socket)
{
	var socketId = socket.id;
	if (!clients[socketId]) {
		clients[socketId] = {
			socket: socket
		}
		gotStart(socketId);
	}
	socket.emit('passWord', socketId);
}

function gotImage(socketId, image)
{
	if (clients[socketId].frontObj.state == 'start') {
		gotResetGame(socketId);
		clients[socketId].frontObj.state = 'gaming';
	}
	switch (image) {
		case 'pass': gotPass(socketId); break;
		case 'nextGame': gotNextGame(socketId); break;
		case 'resetGame': gotResetGame(socketId); break;
		default : gotCard(socketId, image); break;
	}
}

function updatePlayerName(socketId, seatId, name) {
	if (typeof clients[socketId].frontObj.players[seatId] == 'undefined') {
		clients[socketId].frontObj.players[seatId] = {
			seatId: seatId,
			hand: []
		};
	}
	clients[socketId].frontObj.players[seatId].name = name;
	if (name == "") {
		delete clients[socketId].frontObj.players[seatId];
	}
	sendTableInfo(socketId);
}

function disconnect(socketId) {
	delete clients[socketId];
}

module.exports = {
	connect: connect,
	gotImage: gotImage,
	updatePlayerName: updatePlayerName,
	disconnect: disconnect
};

// 以下エクスポートしない関数

// 初期化
// スタートカードを受け取った時の処理。
function gotStart(socketId) {
	clients[socketId].frontObj = {
		state: 'start',
		turnPlayer: 0,
		deckNum: FULL_DECK_NUM,
		dungeon: [],
		equipments: [].concat(FULL_EQUIPMENTS),
		players: [],
		gotCard: null,
		vorpalSelect: null
	};
	sendTableInfo(socketId);
}

// ネクストゲームカードを受け取った時の処理。
function gotNextGame(socketId) {
	moveTurnPlayer(socketId); // ターンプレイヤーの移動
	gotResetGame(socketId);
}

// リセットゲームカードを受け取った時の処理。
function gotResetGame(socketId) {
	if (!clients[socketId]) return;
	clients[socketId].frontObj.state = 'start';
	clients[socketId].frontObj.deckNum = FULL_DECK_NUM;
	clients[socketId].frontObj.dungeon = [];
	clients[socketId].frontObj.equipments = [].concat(FULL_EQUIPMENTS);
	clients[socketId].frontObj.gotCard = null;
	clients[socketId].frontObj.vorpalSelect = null;
	for (var key in clients[socketId].frontObj.players) {
		var player = clients[socketId].frontObj.players[key];
		if (!player) continue;
		var seatId = player.seatId;
		clients[socketId].frontObj.players[seatId].hand = [];
		clients[socketId].frontObj.players[seatId].isActive = true;
	}
	sendTableInfo(socketId);
}

// カードを受け取った時の処理。
function gotCard(socketId, card) {
	if (!clients[socketId]) return;
	if (clients[socketId].frontObj.state === STATE_WAITING_VORPAL_SELECT) {
		selectVorpal(socketId, card);
		return;
	}
	if (clients[socketId].frontObj.state != 'gaming') return;

	var checkingSeatId = clients[socketId].frontObj.turnPlayer;
	if (!clients[socketId].frontObj.players[checkingSeatId]) return;
	if (!clients[socketId].frontObj.gotCard && FULL_EQUIPMENTS.indexOf(card) >= 0) return;

	// プレイヤーがカードを受け取った
	if (!clients[socketId].frontObj.gotCard) {
		clients[socketId].frontObj.gotCard = card;
		clients[socketId].frontObj.deckNum -= 1;
		sendTableInfo(socketId);
		return;
	}

	// カードをダンジョンに置く
	if (clients[socketId].frontObj.gotCard == card) {
		clients[socketId].frontObj.dungeon.push(card);
		clients[socketId].frontObj.gotCard = null;
		moveActiveTurnPlayer(socketId); // アクティブターンプレイヤーの移動
		sendTableInfo(socketId);
		if (clients[socketId].frontObj.deckNum == 0) dungeonCheck(socketId);
		return;
	}

	// 装備カードを取り除く
	var indexNum = clients[socketId].frontObj.equipments.indexOf(card);
	console.log(indexNum);
	if (indexNum >= 0) {
		clients[socketId].frontObj.equipments.splice(indexNum, 1);
		clients[socketId].frontObj.players[checkingSeatId].hand.push(clients[socketId].frontObj.gotCard);
		clients[socketId].frontObj.players[checkingSeatId].hand.push(card);
		clients[socketId].frontObj.gotCard = null;
		moveActiveTurnPlayer(socketId); // アクティブターンプレイヤーの移動
		sendTableInfo(socketId);
		if (clients[socketId].frontObj.deckNum == 0) dungeonCheck(socketId);
	}
}

// パスを受け取った時の処理。
function gotPass(socketId) {
	var checkingSeatId = clients[socketId].frontObj.turnPlayer;
	clients[socketId].frontObj.players[checkingSeatId].isActive = false;
	moveActiveTurnPlayer(socketId); // アクティブターンプレイヤーの移動
	sendTableInfo(socketId);
	console.log(countActivePlayersNum(socketId));
	if (countActivePlayersNum(socketId) == 1) {
		dungeonCheck(socketId);
	}
}

// ダンジョンに挑むとなったときのチェック
function dungeonCheck(socketId) {
	if (clients[socketId].frontObj.equipments.indexOf('vo') >= 0) {
		clients[socketId].frontObj.state = STATE_WAITING_VORPAL_SELECT;
		sendTableInfo(socketId);
	} else {
		goToDungeon(socketId);
	}
}

function countActivePlayersNum(socketId) {
	var activePlayersNum = 0;
	for (var key in clients[socketId].frontObj.players) {
		var player = clients[socketId].frontObj.players[key];
		if (!player) continue;
		if (player.isActive === true) {
			activePlayersNum += 1;
		}
	}
	return activePlayersNum;
}

function sendTableInfo(socketId) {
	clients[socketId].socket.emit('tableInfo', clients[socketId].frontObj);
}

function moveTurnPlayer(socketId) {
	clients[socketId].frontObj.turnPlayer = findNextTurnPlayer(socketId, clients[socketId].frontObj.turnPlayer);
	sendTableInfo(socketId);
}

function findNextTurnPlayer(socketId, turnPlayer) {
	var firstSeatId = null;
	for (var key in clients[socketId].frontObj.players) {
		var player = clients[socketId].frontObj.players[key];
		if (!player) continue;
		if (firstSeatId === null) firstSeatId = player.seatId;
		if (player.seatId > turnPlayer) {
			return player.seatId
		}
	}
	return firstSeatId;
}

function moveActiveTurnPlayer(socketId) {
	clients[socketId].frontObj.turnPlayer = findNextActiveTurnPlayer(socketId, clients[socketId].frontObj.turnPlayer);
	sendTableInfo(socketId);
}

function findNextActiveTurnPlayer(socketId, turnPlayer) {
	var firstSeatId = null;
	for (var key in clients[socketId].frontObj.players) {
		var player = clients[socketId].frontObj.players[key];
		if (!player || player.isActive == false) continue;
		if (firstSeatId === null) firstSeatId = player.seatId;
		if (player.seatId > turnPlayer) {
			return player.seatId
		}
	}
	return firstSeatId;
}

function goToDungeon(socketId) {
	clients[socketId].frontObj.state = 'goToDungeon';
	var dungeon = [].concat(clients[socketId].frontObj.dungeon);

	// ヒットポイント計算と装備品の整理
	var hitPoint = 3;
	var indexNum = clients[socketId].frontObj.equipments.indexOf('kn');
	if (indexNum >= 0) {
		hitPoint += 3;
	}
	var indexNum = clients[socketId].frontObj.equipments.indexOf('pl');
	if (indexNum >= 0) {
		hitPoint += 5;
	}

	// 装備品を使ってダンジョンの整理
	// トーチ
	var indexNum = clients[socketId].frontObj.equipments.indexOf('to');
	if (indexNum >= 0) {
		for (var key in dungeon) {
			var monster = dungeon[key];
			if (monster == 'gb' || monster == 'sk' || monster == 'or') {
				dungeon.splice(key, 1);
			}
		}
	}
	// 聖杯
	var indexNum = clients[socketId].frontObj.equipments.indexOf('ho');
	if (indexNum >= 0) {
		for (var key in dungeon) {
			var monster = dungeon[key];
			if (monster == 'sk' || monster == 'va' || monster == 'li') {
				dungeon.splice(key, 1);
			}
		}
	}
	// ドランゴンランス
	var indexNum = clients[socketId].frontObj.equipments.indexOf('dl');
	if (indexNum >= 0) {
		for (var key in dungeon) {
			var monster = dungeon[key];
			if (monster == 'dl') {
				dungeon.splice(key, 1);
			}
		}
	}
	// ヴォーパルソード
	if (clients[socketId].frontObj.vorpalSelect) {
		for (var key in dungeon) {
			var monster = dungeon[key];
			if (monster == clients[socketId].frontObj.vorpalSelect) {
				dungeon.splice(key, 1);
			}
		}
	}

	//残ったモンスターでヒットポイント再計算
	for (var key in dungeon) {
		var monster = dungeon[key];
		switch (monster) {
			case 'gb': hitPoint -= 1; break;
			case 'sk': hitPoint -= 2; break;
			case 'or': hitPoint -= 3; break;
			case 'va': hitPoint -= 4; break;
			case 'go': hitPoint -= 5; break;
			case 'li': hitPoint -= 6; break;
			case 'de': hitPoint -= 7; break;
			case 'dr': hitPoint -= 9; break;
		}
	}

	// 勝敗判定
	if (hitPoint > 0) {
		clients[socketId].frontObj.state = 'win';
	} else {
		clients[socketId].frontObj.state = 'loose';
	}

	sendTableInfo(socketId);
}

function selectVorpal(socketId, card) {
	var indexNum = MONSTERS.indexOf(card);
	if (indexNum == -1) return;

	clients[socketId].frontObj.vorpalSelect = card;
	goToDungeon(socketId);
}
