let debugMode = false;

let backgroundMusic;

let highscore = 0; 
const HIGHSCORE_KEY = "mouseRunHighscore"; 

let lastTime = 0; 
const FPS_ADJUSTMENT = 120; 

let board;
let boardWidth = 750;
let boardHeight = 250;
let context;

let mouseWidth = 60;
let mouseHeight = 46;
let mouseX = 50;
let mouseY = boardHeight - mouseHeight;
let mouseImg;

let mouse = {
    x : mouseX,
    y : mouseY,
    width : mouseWidth,
    height : mouseHeight,
    
    hitboxOffsetX: 14,
    hitboxOffsetY: 25,
    hitboxWidth: 30,
    hitboxHeight: 16
};

let trapArray = [];

let trapWidth = 95.5;
let trapHeight = 30;
let trapX = 700;
let trapY = boardHeight - trapHeight;

let trapImg;
let cheeseImg; 
let cheeseWidth = 35;
let cheeseHeight = 25;
const CHEESE_Y_OFFSET = 40; 

let velocityX = -5.5;
let velocityY = 0;
let gravity = 0.37;

let gameOver = false;
let score = 0;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    
    context = board.getContext("2d");
    
    mouseImg = new Image();
    mouseImg.src = "Mouse.png";
    mouseImg.onload = function() {
        context.drawImage(mouseImg, mouse.x, mouse.y, mouse.width, mouse.height);
    };
    trapImg = new Image();
    trapImg.src = "trap.png";
    
    cheeseImg = new Image();
    cheeseImg.src = "Cheese.png"; 
    
    backgroundMusic = document.getElementById("background-music");
    
    const savedHighscore = localStorage.getItem(HIGHSCORE_KEY);
    if (savedHighscore !== null) {
        highscore = parseInt(savedHighscore);
    }
    
    requestAnimationFrame(update);
    setInterval(placeTrap, 650);
    
    // NYTT: Legg til støtte for trykk og klikk over hele dokumentet
    document.addEventListener("keydown", moveMouse);
    document.addEventListener("mousedown", moveMouse); // For museklikk
    document.addEventListener("touchstart", moveMouse); // For touch/berøring

    document.addEventListener("keydown", function(e) {
        if (e.shiftKey && e.code === "KeyD") {
            debugMode = !debugMode;
            console.log("Debug mode:", debugMode ? "ON" : "OFF");
        }
    });
};

function update(currentTime) { 
    
    // Beregn Delta Time
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    const timeScale = deltaTime / 1000;
    
    requestAnimationFrame(update);
    if (gameOver) {
        
        if (score > highscore) {
            highscore = score;
            localStorage.setItem(HIGHSCORE_KEY, highscore.toString());
        }
        
        context.fillStyle = "black";
        context.font = "30px Courier";
        context.fillText("GAME OVER", boardWidth / 2 - 80, boardHeight / 2);
        context.font = "20px Courier";
        context.fillText("SCORE: " + score, boardWidth / 2 - 50, boardHeight / 2 + 30);
        context.fillText("HI: " + highscore, boardWidth / 2 - 50, boardHeight / 2 + 60); 
        
        if (velocityY === -10) { 
            mouse.y = mouseY;
            trapArray = [];
            score = 0;
            gameOver = false;
            mouseImg.src = "Mouse.png";
        }
        return;
    }

    context.clearRect(0, 0, boardWidth, boardHeight); 
    
    // Oppdater og tegn mus
    velocityY += gravity * timeScale * FPS_ADJUSTMENT;
    mouse.y = Math.min(mouse.y + velocityY * timeScale * FPS_ADJUSTMENT, mouseY);
    context.drawImage(mouseImg, mouse.x, mouse.y, mouse.width, mouse.height);

    if (debugMode) {
        context.strokeStyle = "red";
        context.strokeRect(
            mouse.x + mouse.hitboxOffsetX,
            mouse.y + mouse.hitboxOffsetY,
            mouse.hitboxWidth,
            mouse.hitboxHeight
        );
    }

    // Oppdater og tegn feller og ost
    for (let i = 0; i < trapArray.length; i++) {
        let trap = trapArray[i]; 
        trap.x += velocityX * timeScale * FPS_ADJUSTMENT;
        context.drawImage(trap.img, trap.x, trap.y, trap.width, trap.height);
        
        if (detectCollision(mouse, trap)) {
            gameOver = true;
            mouseImg.src = "DeadMouse.png";
            break;
        }

        if (trap.cheese) {
            let cheese = trap.cheese;
            
            cheese.x = trap.x + (trap.width / 2) - (cheese.width / 2);

            context.drawImage(cheese.img, cheese.x, cheese.y, cheese.width, cheese.height);
            
            if (detectCollision(mouse, cheese)) {
                score += 1; 
                trap.cheese = null; 
            }
        }
        
        if (trap.x + trap.width < 0) {
            trapArray.splice(i, 1);
            i--; 
        }
    }
    
    // Vis poengsummen og Highscore
    context.fillStyle = "black";
    context.font = "24px Courier";
    context.fillText("SCORE: " + score, 5, 20); 
    
    context.font = "18px Courier"; 
    context.fillText("HI: " + highscore, 5, 45); 
}

function moveMouse(e){
    
    // Definerer hvilke hendelser som skal utløse hopp/restart
    const isJumpEvent = (
        e.type === "mousedown" ||
        e.type === "touchstart" ||
        e.code === "Space" || 
        e.code === "ArrowUp"
    );

    if (!isJumpEvent) {
        return;
    }
    
    // Hvis spillet er over, restart ved trykk/klikk
    if (gameOver) {
        // Vi bruker -10 som signal for restart
        velocityY = -10; 
        // Stopper standard touch-atferd (unngår scrolling på mobil)
        if (e.type === "touchstart") e.preventDefault();
        return;
    }
    
    // Utfør hopp
    if (mouse.y == mouseY) {
        velocityY = -8.65;
    }
    
    // Starter musikk på første interaksjon (viktig for mobil)
    if (backgroundMusic && backgroundMusic.paused) {
        backgroundMusic.play().catch(error => {
            console.log("Klarte ikke starte bakgrunnsmusikken automatisk.", error);
        });
    }
    
    // Stopper standard touch-atferd (unngår scrolling på mobil)
    if (e.type === "touchstart") e.preventDefault();
}

function placeTrap() {
    
    if (gameOver) {
        return;
    }

    let placeTrapChance = Math.random(); 

    if (placeTrapChance > 0.45) { 
        let trap = {
            img : trapImg, 
            x : trapX,
            y : trapY,
            width : trapWidth, 
            height : trapHeight
        };
        
        if (Math.random() < 0.20) {
            trap.cheese = {
                img : cheeseImg,
                x : 0, 
                y : trapY - trapHeight - CHEESE_Y_OFFSET, 
                width : cheeseWidth,
                height : cheeseHeight,
            };
        }
        
        trapArray.push(trap);
    }
}

function detectCollision(a, b) {
    const a_x = a.hitboxOffsetX !== undefined ? a.x + a.hitboxOffsetX : a.x;
    const a_y = a.hitboxOffsetY !== undefined ? a.y + a.hitboxOffsetY : a.y;
    const a_width = a.hitboxWidth !== undefined ? a.hitboxWidth : a.width;
    const a_height = a.hitboxHeight !== undefined ? a.hitboxHeight : a.height;
    
    const b_x = b.x;
    const b_y = b.y;
    const b_width = b.width;
    const b_height = b.height;

    return a_x < b_x + b_width &&
           a_x + a_width > b_x &&
           a_y < b_y + b_height &&
           a_y + a_height > b_y;
}