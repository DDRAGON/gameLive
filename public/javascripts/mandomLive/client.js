var socket = io.connect('http://'+hostAddress+'/mandom');
var easyMode = false;
var passWord = '';
var backgroundColor = 'camera';
var clockCount = 0;
var tableInfo = {};
var config = {
	canvasWidth:  640,
	canvasHeight: 360,
	originalCardWidth:  48,
	originalCardHeight: 64,
	displayCardWidth:  40,
	displayCardHeight: 64,
	space: 85,
	boardWidthSpace:  6,
	boardHeightSpace: 6,
	cardFontSize: 30,
	markFontSize: 30,
	markAdjust: 20,
	drawPlayerOneSideMany: 2,
	state: 'loading'
};
config.displayWidth = config.displayCardWidth*2;
config.displayHeight = Number(config.canvasHeight/config.drawPlayerOneSideMany);
config.boxWidth    = config.displayWidth;
config.boxHeight   = config.displayHeight-config.displayCardHeight-config.space;
config.boardWidth  = config.displayCardWidth*5 + config.boardWidthSpace*2;
config.boardHeight = config.cardFontSize + config.boardHeightSpace*2;
config.fontSize  = Number(config.boxHeight/2);
config.tieFontSize  = config.fontSize - 4;

var MARGIN_HAND_BETWEEN_DUNGEON = 60;

var monsters   = ['goblin','skeleton','ork','vampire','golem','lich','demon','dragon'];
var equipments = ['torch','holyGrail','vorpalSword','dragonLance','knightShield','plateArmor'];
var monstersShort   = ['gb','sk','or','va','go','li','de','dr'];
var equipmentsShort = ['to','ho','vo','dl','kn','pl'];
var options = ['pass', 'resetGame', 'nextGame'];
var optionsShort = ['pa', 'rg', 'ng'];
var imageName = monsters.concat(equipments).concat(['you']);
var images = {};

function sendImage(image) {
	var indexNum = monsters.indexOf(image);
	if (indexNum >= 0) {
		socket.emit('imageSend', monstersShort[indexNum]);
		sound();
		return;
	}
	var indexNum = equipments.indexOf(image);
	if (indexNum >= 0) {
		socket.emit('imageSend', equipmentsShort[indexNum]);
		sound();
	}
	var indexNum = options.indexOf(image);
	if (indexNum >= 0) {
		socket.emit('imageSend', optionsShort[indexNum]);
		sound();
	}
}

function keyUpPlayer(seatId) {
	var updateName = $('#inputPlayer'+seatId).val();
	socket.emit('updatePlayerName', {
		seatId: seatId,
		name: updateName
	});
}
function deletePlayer(seatId) {
	$('#inputPlayer'+seatId).val('');
	socket.emit('updatePlayerName', {
		seatId: seatId,
		name: ""
	});
}

$("#changeInputMode").change(function() {
	switch ($(this).val()) {
		case 'easy':
			easyMode = true;  break;
		case 'normal':
			easyMode = false; break;
		case 'qrCode':
			document.getElementById("inputArea").innerHTML = passWord;
			return;
	}
	document.getElementById("inputArea").innerHTML =
		'<input type="text" onkeydown="keyDown();" id="inputArea" class="form-control">';
});

$("#changeBackground").change(function(){
	backgroundColor = $(this).val();
});

function sound() {
	var str = "";
	str = str + "<EMBED id = 'id_sound'";
	str = str + " SRC=/music/cursor6.wav";
	str = str + " AUTOSTART='true'";
	str = str + " HIDDEN='true'>";
	document.getElementById("id_sound").innerHTML = str;
}

$(function(){
	var canvasForVideo = $('#canvasForVideo').get(0);
	var canvas = $('#canvas').get(0);
	config.ctxForVideo = canvasForVideo.getContext("2d");
	config.ctx = canvas.getContext("2d");
	load();
});

socket.on('tableInfo', function(gotTableInfo) {
	tableInfo = gotTableInfo;
});

socket.on('passWord', function(getPassWord) {
	passWord = getPassWord;
});

// ビデオの描画
setInterval(function(){
	countClock();
	drawCtx(clockCount);

	if (backgroundColor === 'camera') {
		config.ctxForVideo.drawImage(video, 0, 0, config.canvasWidth, config.canvasHeight);
		return;
	}
	config.ctxForVideo.fillStyle = backgroundColor;
	config.ctxForVideo.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
}, 50);

// ここからフロント表示部分の関数
function drawCtx(clockCount) {
	var deckNum  = tableInfo.deckNum;
	drawBackGround();
	drawLoading(clockCount);
	drawPlayers(tableInfo.players, tableInfo.turnPlayer, tableInfo.state, tableInfo.gotCard);
	drawDungeon(tableInfo.dungeon, tableInfo.players);
	drawEquipments(tableInfo.equipments);
	drawActivePlayerMarker(tableInfo.turnPlayer);
	drawVorpalSelect(tableInfo.state, tableInfo.vorpalSelect);
}
function drawBackGround() {
	config.ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
}

function drawLoading(clockCount) {
	if (config.state != 'loading') return;
	var drawX = 100;
	var drawY = 200;
	var drawText = 'loading.';
	for (var i=0; i<(clockCount%5); i++) {
		drawText += '.';
	}
	setColorAndFont('black', 20);
	config.ctx.fillText(drawText, drawX, drawY);
}

function drawPlayers(players, turnPlayerNum, state, gotCard) {
	for (var key in players) {
		var player = players[key];
		if (!player) continue;
		drawBox(player.seatId);
		drawPlayerHands(player.seatId, player.hand, turnPlayerNum, gotCard);
		drawPlayerWinperAndName(player.seatId, player.name, player.isActive, state, turnPlayerNum);
	}
}

function drawBox(seatId) {
	var drawX = Math.floor(seatId/config.drawPlayerOneSideMany)*(config.canvasWidth-config.boxWidth);
	var drawY = Math.floor(seatId%config.drawPlayerOneSideMany)*config.displayHeight + config.displayCardHeight;
	var halfBoxHeight = Math.floor(config.boxHeight/2);
	setColorAndFont('black', 0);
	config.ctx.fillRect(drawX, drawY, config.boxWidth, halfBoxHeight);
	setColorAndFont('white', 0);
	drawY += halfBoxHeight;
	config.ctx.fillRect(drawX, drawY, config.boxWidth, halfBoxHeight);
}
function drawActivePlayerMarker(turnPlayer) {
	if (clockCount%25 > 22) return;
	var leftFlag = true;
	var drawX = config.boxWidth + 5;
	if (Math.floor(turnPlayer/config.drawPlayerOneSideMany) > 0) {
		leftFlag = false;
		drawX    = config.canvasWidth - config.boxWidth - 5;
	}
	var boxHeightHalf = parseInt(config.boxHeight/2);
	var drawY = Math.floor(turnPlayer%config.drawPlayerOneSideMany)*config.displayHeight + config.displayCardHeight + boxHeightHalf;
	/* 三角形を描く */
	setColorAndFont('red', 0);
	config.ctx.beginPath();
	config.ctx.moveTo(drawX, drawY);
	if (leftFlag === true) {
		config.ctx.lineTo(drawX+boxHeightHalf, drawY - boxHeightHalf);
		config.ctx.lineTo(drawX+boxHeightHalf, drawY + boxHeightHalf);
	} else {
		config.ctx.lineTo(drawX-boxHeightHalf, drawY - boxHeightHalf);
		config.ctx.lineTo(drawX-boxHeightHalf, drawY + boxHeightHalf);
	}
	config.ctx.closePath();
	/* 三角形を塗りつぶす */
	config.ctx.fill();
}

function drawPlayerHands(playerId, playerHands, turnPlayerNum, gotCard) {
	var leftFlag = true;
	var drawX    = 0;
	if (Math.floor(playerId/config.drawPlayerOneSideMany) > 0) {
		leftFlag = false;
		drawX    = config.canvasWidth - config.displayCardWidth;
	}
	var drawY = Math.floor(playerId%config.drawPlayerOneSideMany)*config.displayHeight;
	for (var key in playerHands) {
		var playerHand = playerHands[key];
		var indexNum = monstersShort.indexOf(playerHand);
		if (indexNum >= 0) {
			config.ctx.drawImage(images[monsters[indexNum]],drawX,drawY,config.displayCardWidth,config.displayCardHeight);
		}
		var indexNum = equipmentsShort.indexOf(playerHand);
		if (indexNum >= 0) {
			config.ctx.drawImage(images[equipments[indexNum]],drawX,drawY,config.displayCardWidth,config.displayCardHeight);
		}
		if (leftFlag === true) {
			drawX += config.displayCardWidth;
		} else {
			drawX -= config.displayCardWidth;
		}
	}
	// カードを持っていて悩み中のときにの描画
	if (gotCard && playerId == turnPlayerNum && (clockCount%30) < 28) {
		var indexNum = monstersShort.indexOf(gotCard);
		if (indexNum >= 0) {
			config.ctx.drawImage(images[monsters[indexNum]],drawX,drawY,config.displayCardWidth,config.displayCardHeight);
		}
	}
}

function drawPlayerWinperAndName(seatId, playerName, isActive, state, turnPlayerNum) {
	setColorAndFont('white', config.fontSize);
	var drawX = Math.floor(seatId/config.drawPlayerOneSideMany)*(config.canvasWidth - config.boxWidth) + 3;
	var drawY = Math.floor(seatId%config.drawPlayerOneSideMany)*config.displayHeight + config.displayCardHeight + config.fontSize - 2;
	if (playerName) {
		config.ctx.fillText(playerName, drawX, drawY);
	}
	drawY += config.fontSize;
	if (typeof isActive == 'undefined') return;
	setColorAndFont('black', config.fontSize);
	if (isActive == false) {
		config.ctx.fillText('pass', drawX, drawY);
		return;
	}
	if (seatId == turnPlayerNum) {
		if (state == 'win') {
			setColorAndFont('red', config.fontSize);
			config.ctx.fillText('win', drawX, drawY);
		}
		if (state == 'loose') {
			setColorAndFont('blue', config.fontSize);
			config.ctx.fillText('loose', drawX, drawY);
		}
	}
}

function drawDungeon(dungeon, players) {
	setColorAndFont('black', 0);

	// 最も手札を持っているプレイヤーの手札数の計算
	var longestHandLeft  = 0;
	var longestHandRight = 2;
	for (var key in players) {
		var player = players[key];
		if (!player || !player.hand) continue;
		if (Math.floor(key/config.drawPlayerOneSideMany) > 0) {
			if (longestHandRight < player.hand.length) {
				longestHandRight = player.hand.length;
			}
		} else {
			if (longestHandLeft < player.hand.length) {
				longestHandLeft = player.hand.length;
			}
		}
	}
	// デフォルトX座標の計算
	var drawXDefault = config.displayCardWidth*2 + MARGIN_HAND_BETWEEN_DUNGEON;
	if (longestHandLeft > 2) {
		drawXDefault = config.displayCardWidth*longestHandLeft + MARGIN_HAND_BETWEEN_DUNGEON;
	}

	var drawX = drawXDefault;
	var drawY = 1;
	for (var key in dungeon) {
		var monsterShort = dungeon[key];
		var monster = monsters[monstersShort.indexOf(monsterShort)];
		if ((drawX + config.displayCardWidth) > (config.canvasWidth - config.displayCardWidth*longestHandRight - MARGIN_HAND_BETWEEN_DUNGEON)) {
			drawX = drawXDefault;
			drawY += config.displayCardHeight + 1;
		}
		config.ctx.fillRect(drawX-1, drawY-1, config.displayCardWidth+2, config.displayCardHeight+2);
		config.ctx.drawImage(images[monster],drawX,drawY,config.displayCardWidth, config.displayCardHeight);
		drawX += config.displayCardWidth + 1;
	}
}

function drawEquipments(equipments) {
	if (!equipments) return;
	var cardWidthHalf = parseInt(config.displayCardWidth/2);
	var centerX       = parseInt(config.canvasWidth/2);
	// you
	config.ctx.drawImage(images['you'],centerX-cardWidthHalf,config.canvasHeight-config.displayCardHeight,config.displayCardWidth, config.displayCardHeight);
	// knightShield
	if (equipments.indexOf('kn') >= 0) {
		config.ctx.drawImage(images['knightShield'],centerX-cardWidthHalf*3,config.canvasHeight-config.displayCardHeight,config.displayCardWidth, config.displayCardHeight);
	}
	// plateArmor
	if (equipments.indexOf('pl') >= 0) {
		config.ctx.drawImage(images['plateArmor'],centerX+cardWidthHalf,config.canvasHeight-config.displayCardHeight,config.displayCardWidth, config.displayCardHeight);
	}
	// torch
	if (equipments.indexOf('to') >= 0) {
		config.ctx.drawImage(images['torch'],centerX-cardWidthHalf*4,config.canvasHeight-config.displayCardHeight*2,config.displayCardWidth, config.displayCardHeight);
	}
	// holyGrail
	if (equipments.indexOf('ho') >= 0) {
		config.ctx.drawImage(images['holyGrail'],centerX-cardWidthHalf*2,config.canvasHeight-config.displayCardHeight*2,config.displayCardWidth, config.displayCardHeight);
	}
	// dragonLance
	if (equipments.indexOf('dl') >= 0) {
		config.ctx.drawImage(images['dragonLance'],centerX,config.canvasHeight-config.displayCardHeight*2,config.displayCardWidth, config.displayCardHeight);
	}
	// vopalSword
	if (equipments.indexOf('vo') >= 0) {
		config.ctx.drawImage(images['vorpalSword'],centerX+cardWidthHalf*2,config.canvasHeight-config.displayCardHeight*2,config.displayCardWidth, config.displayCardHeight);
	}
}

function drawVorpalSelect(state, vorpalSelect) {
	var drawX = parseInt(config.canvasWidth/2) + config.displayCardWidth*2;
	var drawY = config.canvasHeight - parseInt(config.displayCardHeight/2);
	setColorAndFont('red', config.fontSize);
	if (vorpalSelect) {
		config.ctx.fillText('Vorpal select: ' + vorpalSelect, drawX, drawY);
		return;
	}
	if (state == 'waitingVorpalSelect') {
		var drawText = 'Selecting Vorpal  target.';
		for (var i=0; i<clockCount%5; i++) drawText += '.';
		config.ctx.fillText(drawText, drawX, drawY);
	}
}

function load() {
	//ロードします
	var count = imageName.length;
	var loadedCount = 0;
	var checkLoad = function() {
		loadedCount += 1;
		if (loadedCount == imageName.length)
			config.state = 'loaded';
	}
	for(var i=0; i<imageName.length; i++) {
		var image = document.createElement("img");
		image.src = "/image/mandom/" + imageName[i] + '.JPG';
		image.onload = function(){
			checkLoad();
		}
		images[imageName[i]] = image;
	}
}

function countClock() {
	clockCount += 1;
	if (clockCount > 10000) clockCount = 0;
}

function setColorAndFont(color, size) {
	config.ctx.fillStyle = color;
	config.ctx.font = "bold "+size+"px \'ITC HIGHLANDER\'";
}
