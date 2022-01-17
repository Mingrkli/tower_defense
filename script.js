const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 600;

// global variables ====================================================================================================
const cellSize = 100;
const cellGap = 3;
let numberOfResources = 300;
// was 600
let enemiesInterval = 100;
let frame = 0;
let gameOver = false;
let score = 0;
const winningScore = 1000;

const gameGrid = [];
const defenders = [];
const enemies = [];
const enemyPositions = [];
const projectiles = [];
const resources = [];

// mouse
const mouse = {
    x: 10,
    y: 10,
    width: 0.1,
    height: 0.1,
}
let canvasPosition = canvas.getBoundingClientRect();
canvas.addEventListener('mousemove', function(e){
    // with this, it will show the right mouse coordinate when hover over canvas
    mouse.x = e.x - canvasPosition.left;
    mouse.y = e.y - canvasPosition.top;
});
canvas.addEventListener('mouseleave', function(){
    mouse.y = undefined;
    mouse.y = undefined;
});

// game board
const controlsBar = {
    width: canvas.width,
    height: cellSize,
}
class Cell {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.width = cellSize;
        this.height = cellSize;
    }
    draw(){
        if (mouse.x && mouse.y && collision(this, mouse)){
            ctx.strokeStyle = 'black';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}
function createGrid(){
    // with the following two for loops, it will create a 100x100 space form the top left (not including the toolbar)
    // to the bottom right with this loop to cover the canvas with cell objects
    for (let y = cellSize; y < canvas.height; y += cellSize){
        for (let x = 0; x < canvas.width; x += cellSize){
            gameGrid.push(new Cell(x, y));
        }
    }
}
createGrid();
// going through each cell and drawing each one
function handleGameGrid(){
    // i is all the cell objects in the game grid array create by the two for loops above
    for (let i = 0; i < gameGrid.length; i++){
        gameGrid[i].draw();
    }
}
// projectiles =========================================================================================================
class Projectile {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.power = 20;
        this.speed = 5;
    }
    update(){
        this.x += this.speed;
    }
    draw(){
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();
    }
}
function handleProjectiles(){
    for (let i = 0; i < projectiles.length; i++){
        projectiles[i].update();
        projectiles[i].draw();

        for (let j = 0; j < enemies.length; j++){
            // check collision of the projectile and the enemy
            if (enemies[j] && projectiles[i] && collision(projectiles[i], enemies[j])){
                // enemy health minus the projectile power
                enemies[j].health -= projectiles[i].power;
                // removes the projectile when hit an enemy
                projectiles.splice(i, 1);
                i--;
            }
        }

        // projectiles stop at the end so that it doesn't hit new enemies coming in
        if (projectiles[i] && projectiles[i].x > canvas.width - cellSize){
            projectiles.splice(i, 1);
            i--;
        }
    }
}

// defenders ===========================================================================================================
// this is a blueprint so when we make a new defender we call this
class Defender {
    constructor(x, y){
        this.x = x;
        this.y = y;
        // makes the defender smaller a bit because it will take damage on the corner touches it
        this.width = cellSize - cellGap * 2;
        this.height = cellSize - cellGap * 2;
        this.shooting = false;
        this.health = 100;
        this.projectiles = [];
        this.timer = 0;
    }
    draw(){
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'gold';
        ctx.font = '30px Orbitron';
        ctx.fillText(Math.floor(this.health), this.x + 15, this.y + 30);
    }
    update(){
        if (this.shooting){
            this.timer++;
            // each defender has their own timer so that they don't shoot at the same time
            if (this.timer % 1 === 0){
                projectiles.push(new Projectile(this.x + 70, this.y + 50));
            }
        } else {
            this.timer = 0;
        }
    }
}
canvas.addEventListener('click', function(){
    // for example if mouse position is 250 and cell is 100 so 250 % 100 is 50
    // with that 50 it's will be 250 - 50 = 200 so the cell would be the closest to 200
    const gridPositionX = mouse.x  - (mouse.x % cellSize) + cellGap;
    const gridPositionY = mouse.y - (mouse.y % cellSize) + cellGap;
    // this will make no defenders placed on the toolbar
    if (gridPositionY < cellSize) return;
    // the following will see if there is a defender in that spot, if there is no new defender is placed
    for (let i = 0; i < defenders.length; i++){
        // same grid position
        if (defenders[i].x === gridPositionX && defenders[i].y === gridPositionY) return;
    }
    // let variable so that it can be changed depending on the type of defender we choose
    let defenderCost = 100;
    if (numberOfResources >= defenderCost){
        defenders.push(new Defender(gridPositionX, gridPositionY));
        numberOfResources -= defenderCost;
    }
});
function handleDefenders(){
    for (let i = 0; i < defenders.length; i++){
        defenders[i].draw();
        defenders[i].update();
        // with indexOf and not -1, it means that it didn't find anything form this value in this array
        if (enemyPositions.indexOf(defenders[i].y) !== -1){
            defenders[i].shooting = true;
        } else {
            defenders[i].shooting = false;
        }
        for (let j = 0; j < enemies.length; j++){
            // checks of the defenders and enemies touch, if so make defender take damage
            // put defenders[i] in front so that the error goes away as we want to check of there is a defender there
            // and collision
            if (defenders[i] && collision(defenders[i], enemies[j])){
                // removes element form array
                // i = position of defender of health less than 0 in the defenders array
                // 1 = removes 1 element in this index
                enemies[j].movement = 0;
                // Damage taken
                defenders[i].health -= 1;
            }
            if (defenders[i] && defenders[i].health <= 0){
                defenders.splice(i, 1);
                // makes it so that next element doesn't get skipped
                i--;
                enemies[j].movement = enemies[j].speed;
            }
        }
    }
}
// enemies =============================================================================================================
class Enemy {
    constructor(verticalPosition){
        this.x = canvas.width;
        this.y = verticalPosition;
        // the following two made it so that the defender will shoot as the cell matches the condition to shoot
        this.width = cellSize - cellGap * 2;
        this.height = cellSize - cellGap * 2;
        //         this.speed = Math.random() * 0.2 + 0.4;
        this.speed = Math.random() * 0.2 + 2;
        this.movement = this.speed;
        this.health = 100;
        // this here make it possible to change the reward depending on their max health
        this.maxHealth = this.health;
    }
    update(){
        this.x -= this.movement;
    }
    draw(){
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.font = '30px Orbitron';
        ctx.fillText(Math.floor(this.health), this.x + 15, this.y + 30);
    }
}
function handleEnemies(){
    for (let i = 0; i < enemies.length; i++){
        enemies[i].update();
        enemies[i].draw();
        if (enemies[i].x < 0){
            gameOver = true;
        }
        // removes enemy if health is 0
        if (enemies[i].health <= 0){
            // gain resources depending on enemy max health / 10
            let gainedResources = enemies[i].maxHealth/10;
            numberOfResources += gainedResources;
            // score by the amount gained form enemy defeat
            score += gainedResources;
            // when enemy is defeated, it is removed form enemy array
            const findThisIndex = enemyPositions.indexOf(enemies[i].y);
            enemyPositions.splice(findThisIndex, 1);
            enemies.splice(i, 1);
            i--;
        }
    }
    // every enemiesInterval % frames which equals to zero will spawn new enemies
    if (frame % enemiesInterval === 0 && score < winningScore){
        let verticalPosition = Math.floor(Math.random() * 5 + 1) * cellSize + cellGap;
        enemies.push(new Enemy(verticalPosition));
        enemyPositions.push(verticalPosition);
        // everytime new enemies spawn enemiesInterval lower by 50 frames so the wave comes faster and faster
        // if (enemiesInterval > 120) enemiesInterval -= 50;
        if (enemiesInterval > 1) enemiesInterval -= 99;
    }
}

// resources ===========================================================================================================
const amounts = [20, 30, 40];
class Resource {
    constructor(){
        // stops the resources form spawning too much to the right
        this.x = Math.random() * (canvas.width - cellSize);
        // which row it spawns on, can set it to spawn on anywhere but, it will be a problem with sprites
        this.y = (Math.floor(Math.random() * 5) + 1) * cellSize + 25;
        this.width = cellSize * 0.6;
        this.height = cellSize * 0.6;
        this.amount = amounts[Math.floor(Math.random() * amounts.length)];
    }
    draw(){
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Orbitron';
        ctx.fillText(this.amount, this.x + 15, this.y + 25);
    }
}
function handleResources(){
    // stops enemy spawning when you win
    if (frame % 500 === 0 && score < winningScore){
        resources.push(new Resource());
    }
    for (let i = 0; i < resources.length; i++){
        resources[i].draw();
        // if mouse hit resource, gain that amount
        if (resources[i] && mouse.x && mouse.y && collision(resources[i], mouse)){
            numberOfResources += resources[i].amount;
            resources.splice(i, 1);
            i--;
        }
    }
}

// utilities ===========================================================================================================
function handleGameStatus(){
    ctx.fillStyle = 'gold';
    ctx.font = '30px Orbitron';
    ctx.fillText('Score: ' + score, 20, 40);
    ctx.fillText('Resources: ' + numberOfResources, 20, 80);
    if (gameOver){
        ctx.fillStyle = 'black';
        ctx.font = '90px Orbitron';
        ctx.fillText('GAME OVER', 135, 330);
    }
    if (score >= winningScore && enemies.length === 0){
        ctx.fillStyle = 'black';
        ctx.font = '60px Orbitron';
        ctx.fillText('LEVEL COMPLETE', 130, 300);
        ctx.font = '30px Orbitron';
        ctx.fillText('You win with ' + score + ' points!', 134, 340);
    }
}

function animate(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    // fill the rectangle since it is where all canvas and drawing methods are stored
    ctx.fillRect(0,0,controlsBar.width, controlsBar.height);
    // this makes it so that animate will run whatever code is in it and requestAnimationFrame() will request the
    // animate function again so, basically it's a loop (In programmer it is called recursion)
    // draw each cell by placing handleGameGrid() inside the animate loop
    handleGameGrid();
    handleDefenders();
    handleResources();
    handleProjectiles();
    handleEnemies();
    handleGameStatus();
    frame++;
    if (!gameOver) requestAnimationFrame(animate);
}
// need to call animate to kick off animation loop
animate();

// reusable collision detection
function collision(first, second){
    if (    !(  first.x > second.x + second.width ||
        first.x + first.width < second.x ||
        first.y > second.y + second.height ||
        first.y + first.height < second.y)
    ) {
        return true;
    }
}

// makes it so that the mouse position will be fixed when changing window size
window.addEventListener('resize', function(){
    canvasPosition = canvas.getBoundingClientRect();
})