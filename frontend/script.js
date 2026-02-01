// API設定 - Render用
// ローカル用をコメントアウト
// const API_URL = "http://127.0.0.1:8000";

// Render用を有効にする
const API_URL = "https://g51-fs-tamauoke.onrender.com";

// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const gameOverModal = document.getElementById('gameOverModal');
const overlay = document.getElementById('overlay');
const finalScoreElement = document.getElementById('finalScore');
const nameInput = document.getElementById('nameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const restartBtn = document.getElementById('restartBtn');
const leaderboardList = document.getElementById('leaderboardList');

// ゲーム変数
let gameRunning = false;
let score = 0;
let highScore = 0;
let player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 80,
    width: 40,
    height: 40,
    speed: 5,
    color: '#00ff00'
};
let obstacles = [];
let gameLoop = null;
let scoreInterval = null;
let obstacleInterval = null;

// 障害物クラス
class Obstacle {
    constructor() {
        this.width = Math.random() * 40 + 20;
        this.height = Math.random() * 30 + 15;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = Math.random() * 3 + 2;
        this.color = `hsl(${Math.random() * 60}, 100%, 50%)`; // 赤〜黄色の範囲
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 危険な感じを出すために境界線を追加
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// プレイヤー描画
function drawPlayer() {
    // プレイヤーの本体
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // プレイヤーの装飾（ロケットのような見た目）
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(player.x + 5, player.y + 5, 10, 10);
    ctx.fillRect(player.x + 25, player.y + 5, 10, 10);
    
    // エンジンの炎
    if (gameRunning) {
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(player.x + 10, player.y + player.height, 5, 5);
        ctx.fillRect(player.x + 25, player.y + player.height, 5, 5);
    }
}

// 衝突判定
function checkCollision(obstacle) {
    return player.x < obstacle.x + obstacle.width &&
           player.x + player.width > obstacle.x &&
           player.y < obstacle.y + obstacle.height &&
           player.y + player.height > obstacle.y;
}

// ゲーム更新
function updateGame() {
    if (!gameRunning) return;

    // キャンバスをクリア
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // プレイヤー描画
    drawPlayer();

    // 障害物更新
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.update();
        obstacle.draw();

        // 衝突判定
        if (checkCollision(obstacle)) {
            gameOver();
            return;
        }

        // 画面外に出た障害物を削除
        if (obstacle.y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }

    // 背景の星を描画
    drawStars();
}

// 背景の星
function drawStars() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 20; i++) {
        const x = (Date.now() / 100 * (i + 1)) % canvas.width;
        const y = (i * 30) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
}

// スコア更新
function updateScore() {
    if (!gameRunning) return;
    score++;
    scoreElement.textContent = score;
    
    // 難易度上昇
    if (score % 100 === 0) {
        obstacles.forEach(obs => obs.speed += 0.5);
    }
}

// ゲーム開始
function startGame() {
    gameRunning = true;
    score = 0;
    scoreElement.textContent = score;
    obstacles = [];
    player.x = canvas.width / 2 - 20;
    
    startBtn.style.display = 'none';
    
    // ゲームループ開始
    gameLoop = setInterval(updateGame, 1000 / 60); // 60 FPS
    scoreInterval = setInterval(updateScore, 100); // 0.1秒ごとにスコア更新
    obstacleInterval = setInterval(createObstacle, 800); // 0.8秒ごとに障害物生成
}

// 障害物生成
function createObstacle() {
    if (!gameRunning) return;
    obstacles.push(new Obstacle());
}

// ゲームオーバー
function gameOver() {
    gameRunning = false;
    
    // ゲームループ停止
    clearInterval(gameLoop);
    clearInterval(scoreInterval);
    clearInterval(obstacleInterval);
    
    // ハイスコア更新
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
    }
    
    // ゲームオーバーモーダル表示
    finalScoreElement.textContent = score;
    gameOverModal.classList.add('active');
    overlay.classList.add('active');
    
    startBtn.style.display = 'inline-block';
}

// スコア送信
async function submitScore() {
    const name = nameInput.value.trim();
    if (!name) {
        alert('名前を入力してください');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                score: score
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('スコア送信成功:', data);
            closeModal();
            loadLeaderboard();
        } else {
            console.error('スコア送信失敗');
            alert('スコア送信に失敗しました');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert('通信エラーが発生しました');
    }
}

// ランキング読み込み
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/rankings`);
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.rankings);
        } else {
            console.error('ランキング読み込み失敗');
            leaderboardList.innerHTML = '<li>ランキング読み込み失敗</li>';
        }
    } catch (error) {
        console.error('通信エラー:', error);
        leaderboardList.innerHTML = '<li>通信エラー</li>';
    }
}

// ランキング表示
function displayLeaderboard(rankings) {
    leaderboardList.innerHTML = '';
    
    if (rankings.length === 0) {
        leaderboardList.innerHTML = '<li>まだスコアがありません</li>';
        return;
    }
    
    rankings.forEach((entry, index) => {
        const li = document.createElement('li');
        const date = new Date(entry.created_at);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        li.innerHTML = `
            <strong>${index + 1}位:</strong> ${entry.name} - ${entry.score}点
            <br><small style="opacity: 0.7;">${formattedDate}</small>
        `;
        leaderboardList.appendChild(li);
    });
}

// モーダルを閉じる
function closeModal() {
    gameOverModal.classList.remove('active');
    overlay.classList.remove('active');
    nameInput.value = '';
}

// 再スタート
function restart() {
    closeModal();
    startGame();
}

// キーボード操作
let keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (!gameRunning) return;
    
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// マウス操作
canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    player.x = mouseX - player.width / 2;
    
    // プレイヤーが画面内に収まるように調整
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    }
});

// タッチ操作（モバイル対応）
canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    player.x = touchX - player.width / 2;
    
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    }
});

// イベントリスナー設定
startBtn.addEventListener('click', startGame);
submitScoreBtn.addEventListener('click', submitScore);
restartBtn.addEventListener('click', restart);
overlay.addEventListener('click', closeModal);

// Enterキーでスコア送信
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitScore();
    }
});

// 初期化
window.addEventListener('load', () => {
    loadLeaderboard();
    
    // キャンバスの初期描画
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawStars();
});
