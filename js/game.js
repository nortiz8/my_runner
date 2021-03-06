// const Phaser = require('phaser');

let game;

const gameOptions = {
  platformSpeedRange: [300, 300],
  donutSpeed: 80,
  spawnRange: [80, 300],
  platformSizeRange: [100, 350],
  platformHeightRange: [-8, 8],
  platformHeightScale: 15,
  platformVerticalLimit: [0.4, 0.8],
  playerGravity: 1000,
  jumpForce: 400,
  playerStartPosition: 200,
  jumps: 2,
  coinPercent: 100
};

window.onload = function() {
  const gameConfig = {
    type: Phaser.AUTO,
    width: 1334,
    height: 750,
    scene: [preloadGame, PlayGame],
    backgroundColor: 0x0c88c7,
    physics: {
      default: 'arcade'
    },
    parent: 'game-goes-here'
  };
  game = new Phaser.Game(gameConfig);
  window.focus();
  resize();
  window.addEventListener('resize', resize, false);
};

let score = 0;
let scoreText;
let highscore = 0;
let highscoreText;

class preloadGame extends Phaser.Scene {
  constructor() {
    super('PreloadGame');
  }
  preload() {
    this.load.image('platform', '../assets/ground.png');
    this.load.spritesheet('player', '../assets/playerRun2.png', {
      frameWidth: 624,
      frameHeight: 500
    });
    this.load.spritesheet('coin', '../assets/coin.png', {
      frameWidth: 20,
      frameHeight: 20
    });
    this.load.spritesheet('donut', '../assets/donuts.png', {
      frameWidth: 1250,
      frameHeight: 1250
    });
  }
  create() {
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 15 }),
      frameRate: 30,
      repeat: -1
    });
    this.anims.create({
      key: 'rotate',
      frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 5 }),
      frameRate: 15,
      yoyo: true,
      repeat: -1
    });
    this.scene.start('PlayGame');
  }
}

class PlayGame extends Phaser.Scene {
  constructor() {
    super('PlayGame');
  }
  create() {
    scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      fill: '#fff'
    });
    highscoreText = this.add.text(500, 16, 'Highcore: 0', {
      fontSize: '32px',
      fill: '#fff'
    });
    // platforms
    this.addedPlatforms = 0;

    this.platformGroup = this.add.group({
      removeCallback: function(platform) {
        platform.scene.platformPool.add(platform);
      }
    });
    this.platformPool = this.add.group({
      removeCallback: function(platform) {
        platform.scene.platformGroup.add(platform);
      }
    });

    this.addPlatform(
      game.config.width,
      game.config.width / 2,
      game.config.height * gameOptions.platformVerticalLimit[1]
    );

    // coins
    this.coinGroup = this.add.group({
      removeCallback: function(coin) {
        coin.scene.coinPool.add(coin);
      }
    });
    this.coinPool = this.add.group({
      removeCallback: function(coin) {
        coin.scene.coinGroup.add(coin);
      }
    });

    // donuts
    this.donutGroup = this.add.group();
    this.addDonuts();

    // player
    this.playerJumps = 0;
    this.player = this.physics.add.sprite(
      gameOptions.playerStartPosition,
      game.config.height * 0.7,
      'player'
    );
    this.player.setGravityY(gameOptions.playerGravity);
    this.player.setScale(0.11);

    // player vs platform
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      function() {
        // play "run" animation if the player is on a platform
        if (!this.player.anims.isPlaying) {
          this.player.anims.play('run');
        }
      },
      null,
      this
    );
    // player vs coin
    this.physics.add.overlap(
      this.player,
      this.coinGroup,
      function(player, coin) {
        this.tweens.add({
          targets: coin,
          y: coin.y - 100,
          alpha: 0,
          duration: 800,
          ease: 'Cubic.easeOut',
          callbackScope: this,
          onComplete: function() {
            this.coinGroup.killAndHide(coin), this.coinGroup.remove(coin);
          }
        });
        this.addScore();
        coin.disableBody(true, false);
        // console.log(this.tweens);
      },
      null,
      this
    );

    //jump
    this.input.on('pointerdown', this.jump, this);
    this.input.keyboard.on('keydown-SPACE', this.jump, this);
    this.input.keyboard.addCapture('SPACE');
  }

  addScore() {
    score += 10;
    scoreText.setText('Score: ' + score);
  }

  // donuts
  addDonuts() {
    let rightmostDonut = this.getRightmostDonut();
    if (rightmostDonut < game.config.width * 2) {
      let donut = this.physics.add.sprite(
        rightmostDonut + Phaser.Math.Between(100, 350),
        game.config.height + Phaser.Math.Between(-100, 300),
        'donut'
      );
      donut.setOrigin(0.5, 1);
      donut.body.setVelocityX(gameOptions.donutSpeed * -1);
      this.donutGroup.add(donut);
      if (Phaser.Math.Between(0, 1)) {
        donut.setDepth(-1);
      }
      donut.setFrame(Phaser.Math.Between(0, 3));
      donut.setScale(0.4);
      this.addDonuts();
    }
  }
  getRightmostDonut() {
    let rightmostDonut = -200;
    this.donutGroup.getChildren().forEach(function(donut) {
      rightmostDonut = Math.max(rightmostDonut, donut.x);
    });
    return rightmostDonut;
  }

  addPlatform(platformWidth, posX, posY) {
    this.addedPlatforms++;
    let platform;
    if (this.platformPool.getLength()) {
      platform = this.platformPool.getFirst();
      platform.x = posX;
      platform.active = true;
      platform.visible = true;
      this.platformPool.remove(platform);
      //   let newRatio = platformWidth / platform.displayWidth;
      //   platform.displayWidth = platformWidth;
      //   platform.tileScaleX = 1 / platform.tileScaleX;
    } else {
      platform = this.physics.add.sprite(posX, posY, 'platform');
      platform.setImmovable(true);
      platform.setVelocityX(
        Phaser.Math.Between(
          gameOptions.platformSpeedRange[0],
          gameOptions.platformSpeedRange[1]
        ) * -1
      );
      platform.setDepth(2);
      this.platformGroup.add(platform);
    }
    platform.displayWidth = platformWidth;
    this.nextPlatformDistance = Phaser.Math.Between(
      gameOptions.spawnRange[0],
      gameOptions.spawnRange[1]
    );
    // coin on platform
    if (this.addedPlatforms > 1) {
      if (Phaser.Math.Between(1, 100) <= gameOptions.coinPercent) {
        if (this.coinPool.getLength()) {
          let coin = this.coinPool.getFirst();
          coin.x = posX;
          coin.y = posY - 96;
          coin.alpha = 1;
          coin.active = true;
          coin.visible = true;
          this.coinPool.remove(coin);
        } else {
          let coin = this.physics.add.sprite(posX, posY - 96, 'coin');
          coin.setImmovable(true);
          coin.setVelocityX(platform.body.velocity.x);
          coin.anims.play('rotate');
          this.coinGroup.add(coin);
        }
      }
    }
  }

  jump() {
    if (
      this.player.body.touching.down ||
      (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)
    ) {
      if (this.player.body.touching.down) {
        this.playerJumps = 0;
      }
      this.player.setVelocityY(gameOptions.jumpForce * -1);
      this.playerJumps++;
      this.player.anims.stop();
    }
  }

  update() {
    // check for game over
    if (this.player.y > game.config.height) {
      this.scene.start('PlayGame');
      score = 0;
    }
    this.player.x = gameOptions.playerStartPosition;

    // reuse platforms
    let minDistance = game.config.width;
    let rightmostPlatformHeight = 0;
    this.platformGroup.getChildren().forEach(function(platform) {
      let platformDistance =
        game.config.width - platform.x - platform.displayWidth / 2;
      if (platformDistance < minDistance) {
        minDistance = platformDistance;
        rightmostPlatformHeight = platform.y;
      }
      if (platform.x < -platform.displayWidth / 2) {
        this.platformGroup.killAndHide(platform);
        this.platformGroup.remove(platform);
      }
    }, this);

    // reuse coins
    this.coinGroup.getChildren().forEach(function(coin) {
      if (coin.x < -coin.displayWidth / 2) {
        this.coinGroup.killAndHide(coin);
        this.coinGroup.remove(coin);
      }
    }, this);

    // reuse donut
    this.donutGroup.getChildren().forEach(function(donut) {
      if (donut.x < -donut.displayWidth) {
        let rightmostDonut = this.getRightmostDonut();
        donut.x = rightmostDonut + Phaser.Math.Between(100, 350);
        donut.y = game.config.height + Phaser.Math.Between(0, 100);
        donut.setFrame(Phaser.Math.Between(0, 3));
        if (Phaser.Math.Between(0, 1)) {
          donut.setDepth(-1);
        }
      }
    }, this);

    // new platform
    if (minDistance > this.nextPlatformDistance) {
      let nextPlatformWidth = Phaser.Math.Between(
        gameOptions.platformSizeRange[0],
        gameOptions.platformSizeRange[1]
      );
      let platformRandomHeight =
        gameOptions.platformHeightScale *
        Phaser.Math.Between(
          gameOptions.platformHeightRange[0],
          gameOptions.platformHeightRange[1]
        );
      let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
      let minPlatformHeight =
        game.config.height * gameOptions.platformVerticalLimit[0];
      let maxPlatformHeight =
        game.config.height * gameOptions.platformVerticalLimit[1];
      let nextPlatformHeight = Phaser.Math.Clamp(
        nextPlatformGap,
        minPlatformHeight,
        maxPlatformHeight
      );

      this.addPlatform(
        nextPlatformWidth,
        game.config.width + nextPlatformWidth / 2,
        nextPlatformHeight
      );
    }
    highscoreText.text =
      'Your High Score: ' + localStorage.getItem('runnerHighScore');
    if (score > localStorage.getItem('runnerHighScore')) {
      localStorage.setItem('runnerHighScore', score);
    }
  }
}
function resize() {
  let canvas = document.querySelector('canvas');
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight;
  let windowRatio = windowWidth / windowHeight;
  let gameRatio = game.config.width / game.config.height;
  if (windowRatio < gameRatio) {
    canvas.style.width = windowWidth + 'px';
    canvas.style.height = windowWidth / gameRatio + 'px';
  } else {
    canvas.style.width = windowHeight * gameRatio + 'px';
    canvas.style.height = windowHeight + 'px';
  }
}
