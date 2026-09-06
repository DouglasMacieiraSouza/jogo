/* =========================================================
   NÓS DOIS
   Jogo para Nina
   script.js
========================================================= */

"use strict";

/* =========================================================
   DOM
========================================================= */

const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");
const ending = document.getElementById("ending");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const endingCanvas = document.getElementById("endingCanvas");
const endingCtx = endingCanvas
    ? endingCanvas.getContext("2d")
    : null;

const hudChapter = document.getElementById("hudChapter");
const objectiveText = document.getElementById("objectiveText");
const connectionFill = document.getElementById("connectionFill");

const chapterCard = document.getElementById("chapterCard");
const chapterNumber = document.getElementById("chapterNumber");
const chapterTitle = document.getElementById("chapterTitle");
const chapterSubtitle = document.getElementById("chapterSubtitle");

const dialogueBox = document.getElementById("dialogueBox");
const dialogueName = document.getElementById("dialogueName");
const dialogueText = document.getElementById("dialogueText");
const dialoguePortrait = document.getElementById("dialoguePortrait");

const fade = document.getElementById("fade");


/* =========================================================
   CANVAS
========================================================= */

ctx.imageSmoothingEnabled = false;

if (endingCtx) {
    endingCtx.imageSmoothingEnabled = false;
}


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const WORLD_WIDTH = 5200;
const WORLD_HEIGHT = 2200;

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;


/*
    NOVAS SPRITESHEETS

    7 colunas
    8 linhas
    128 x 128 por frame

    Linha 0 = idle baixo
    Linha 1 = andando baixo
    Linha 2 = idle esquerda
    Linha 3 = andando esquerda
    Linha 4 = idle direita
    Linha 5 = andando direita
    Linha 6 = idle cima
    Linha 7 = andando cima
*/

const SPRITE_CONFIG = {
    columns: 7,
    rows: 8,

    rowsMap: {
        idleDown: 0,
        walkDown: 1,

        idleLeft: 2,
        walkLeft: 3,

        idleRight: 4,
        walkRight: 5,

        idleUp: 6,
        walkUp: 7
    }
};


/* =========================================================
   GAME STATE
========================================================= */

const Game = {

    running: false,

    chapter: 0,

    chapterCompleted: false,

    dialogueActive: false,

    meetingTriggered: false,

    time: 0,

    lastTime: 0,

    keys: new Set(),

    particles: [],

    rain: [],

    fireflies: [],

    trees: [],

    obstacles: [],

    goal: null,

    monster: null,

    darknessProgress: 0,

    stormProgress: 0
};


/* =========================================================
   CAPÍTULOS
========================================================= */

const chapters = [

    {
        number: "CAPÍTULO I",

        hud: "I — O ENCONTRO",

        title: "O Encontro",

        subtitle:
            "Toda aventura precisa começar em algum lugar.",

        objective:
            "Encontre Nina",

        type:
            "meeting"
    },


    {
        number: "CAPÍTULO II",

        hud: "II — A CHUVA",

        title: "A Chuva",

        subtitle:
            "Algumas tempestades ficam mais fáceis quando não atravessamos sozinhos.",

        objective:
            "Atravessem a floresta juntos",

        type:
            "rain"
    },


    {
        number: "CAPÍTULO III",

        hud: "III — A ESCURIDÃO",

        title: "A Escuridão",

        subtitle:
            "Quando tudo fica escuro, duas pessoas ainda podem ser luz uma para a outra.",

        objective:
            "Encontre o caminho junto de Nina",

        type:
            "dark"
    },


    {
        number: "CAPÍTULO IV",

        hud: "IV — O PESO",

        title: "O Peso",

        subtitle:
            "Algumas coisas são pesadas demais para carregar sozinho.",

        objective:
            "Superem os obstáculos juntos",

        type:
            "weight"
    },


    {
        number: "CAPÍTULO V",

        hud: "V — A TEMPESTADE",

        title: "A Tempestade",

        subtitle:
            "Quando o pior aparece, permanecer lado a lado também é uma forma de lutar.",

        objective:
            "Enfrentem a tempestade juntos",

        type:
            "storm"
    }

];


/* =========================================================
   IMAGE LOADER
========================================================= */

function loadImage(src) {

    return new Promise((resolve, reject) => {

        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error(
                    `Não foi possível carregar: ${src}`
                )
            );
        };

        image.src = src;
    });
}


/* =========================================================
   SPRITE ANIMATOR
========================================================= */

class SpriteAnimator {

    constructor({
        image,
        columns,
        rows
    }) {

        this.image = image;

        this.columns = columns;
        this.rows = rows;

        this.frameWidth =
            image.width / columns;

        this.frameHeight =
            image.height / rows;

        this.row = 0;
        this.frame = 0;

        this.frames = 1;
        this.fps = 7;

        this.timer = 0;

        this.animationKey = "";
    }


    setAnimation(
        key,
        row,
        frames = 1,
        fps = 7
    ) {

        /*
            Não reinicia a animação
            a cada frame do jogo.
        */

        if (this.animationKey !== key) {

            this.animationKey = key;

            this.row = row;

            this.frame = 0;

            this.timer = 0;
        }

        this.frames = frames;
        this.fps = fps;
    }


    update(delta) {

        if (this.frames <= 1) {

            this.frame = 0;

            return;
        }

        this.timer += delta;

        const frameDuration =
            1 / this.fps;

        while (
            this.timer >= frameDuration
        ) {

            this.timer -= frameDuration;

            this.frame++;

            if (
                this.frame >= this.frames
            ) {

                this.frame = 0;
            }
        }
    }


    draw(
        context,
        x,
        y,
        width,
        height
    ) {

        const sx =
            Math.floor(
                this.frame *
                this.frameWidth
            );

        const sy =
            Math.floor(
                this.row *
                this.frameHeight
            );

        const sw =
            Math.floor(
                this.frameWidth
            );

        const sh =
            Math.floor(
                this.frameHeight
            );

        /*
            Pixel snapping.

            Evita tremor causado
            por subpixels.
        */

        x = Math.round(x);
        y = Math.round(y);

        width = Math.round(width);
        height = Math.round(height);

        context.save();

        context.imageSmoothingEnabled =
            false;

        context.drawImage(
            this.image,

            sx,
            sy,

            sw,
            sh,

            Math.round(
                x - width / 2
            ),

            Math.round(
                y - height
            ),

            width,
            height
        );

        context.restore();
    }
}


/* =========================================================
   CHARACTER
========================================================= */

class Character {

    constructor({
        name,
        x,
        y,
        sprite,
        speed,
        isNina = false,
        scale = 1
    }) {

        this.name = name;

        this.x = x;
        this.y = y;

        this.sprite = sprite;

        this.speed = speed;

        this.isNina = isNina;

        this.direction = "down";

        this.moving = false;

        /*
            O radius continua independente da escala visual.

            Isso significa que diminuir a Nina NÃO altera
            movimentação, proximidade ou mecânicas.
        */

        this.radius = 28;


        /*
            ESCALA VISUAL INDEPENDENTE

            Douglas e Nina agora podem ter tamanhos
            visuais diferentes sem alterar a lógica
            interna do jogo.
        */

        const BASE_SIZE = 112;

        this.scale = scale;

        this.drawWidth =
            BASE_SIZE * scale;

        this.drawHeight =
            BASE_SIZE * scale;
    }


    updateAnimation(delta) {

        const rows =
            SPRITE_CONFIG.rowsMap;


        /* =========================
           PARADO
        ========================= */

        if (!this.moving) {

            switch (
                this.direction
            ) {

                case "up":

                    this.sprite.setAnimation(
                        "idle_up",
                        rows.idleUp,
                        1,
                        1
                    );

                    break;


                case "left":

                    this.sprite.setAnimation(
                        "idle_left",
                        rows.idleLeft,
                        1,
                        1
                    );

                    break;


                case "right":

                    this.sprite.setAnimation(
                        "idle_right",
                        rows.idleRight,
                        1,
                        1
                    );

                    break;


                default:

                    this.sprite.setAnimation(
                        "idle_down",
                        rows.idleDown,
                        1,
                        1
                    );
            }
        }


        /* =========================
           ANDANDO
        ========================= */

        else {

            switch (
                this.direction
            ) {

                case "up":

                    this.sprite.setAnimation(
                        "walk_up",
                        rows.walkUp,
                        7,
                        8
                    );

                    break;


                case "left":

                    this.sprite.setAnimation(
                        "walk_left",
                        rows.walkLeft,
                        7,
                        8
                    );

                    break;


                case "right":

                    this.sprite.setAnimation(
                        "walk_right",
                        rows.walkRight,
                        7,
                        8
                    );

                    break;


                default:

                    this.sprite.setAnimation(
                        "walk_down",
                        rows.walkDown,
                        7,
                        8
                    );
            }
        }


        this.sprite.update(
            delta
        );
    }


    draw(
        context,
        camera
    ) {

        const screenX =
            Math.round(
                this.x -
                camera.x +
                SCREEN_WIDTH / 2
            );

        const screenY =
            Math.round(
                this.y -
                camera.y +
                SCREEN_HEIGHT / 2
            );


        /*
            SOMBRA
        */

        context.save();

        context.fillStyle =
            "rgba(0,0,0,.32)";

        context.beginPath();

        context.ellipse(
            screenX,
            screenY + 1,
            27,
            9,
            0,
            0,
            Math.PI * 2
        );

        context.fill();

        context.restore();


        /*
            PERSONAGEM
        */

        this.sprite.draw(
            context,

            screenX,
            screenY,

            this.drawWidth,
            this.drawHeight
        );


        /*
            NOME
        */

        context.save();

        context.textAlign =
            "center";

        context.font =
            "10px 'Courier New', monospace";

        context.fillStyle =
            this.isNina
                ? "rgba(255,190,210,.92)"
                : "rgba(255,255,255,.78)";

        context.fillText(
            this.name.toUpperCase(),

            screenX,

            screenY -
            this.drawHeight -
            10
        );

        context.restore();
    }
}


/* =========================================================
   CAMERA
========================================================= */

class Camera {

    constructor() {

        this.x = 0;
        this.y = 0;
    }


    update(
        player,
        nina,
        delta
    ) {

        /*
            Enquanto Nina estiver muito
            distante no primeiro capítulo,
            a câmera prioriza Douglas.

            Depois do encontro, passa a
            enquadrar os dois.
        */

        let targetX;
        let targetY;


        if (
            Game.chapter === 0 &&
            !Game.meetingTriggered
        ) {

            targetX = player.x;
            targetY = player.y;
        }

        else {

            targetX =
                (
                    player.x +
                    nina.x
                ) / 2;

            targetY =
                (
                    player.y +
                    nina.y
                ) / 2;
        }


        const smoothing =
            Math.min(
                1,
                4 * delta
            );


        this.x +=
            (
                targetX -
                this.x
            ) *
            smoothing;


        this.y +=
            (
                targetY -
                this.y
            ) *
            smoothing;


        /*
            Arredondamento também
            estabiliza os sprites.
        */

        this.x =
            Math.round(
                clamp(
                    this.x,
                    SCREEN_WIDTH / 2,
                    WORLD_WIDTH -
                    SCREEN_WIDTH / 2
                )
            );


        this.y =
            Math.round(
                clamp(
                    this.y,
                    SCREEN_HEIGHT / 2,
                    WORLD_HEIGHT -
                    SCREEN_HEIGHT / 2
                )
            );
    }
}


/* =========================================================
   PERSONAGENS
========================================================= */

let player = null;
let nina = null;

const camera =
    new Camera();


/* =========================================================
   RESIZE
========================================================= */

function resizeCanvas() {

    SCREEN_WIDTH =
        window.innerWidth;

    SCREEN_HEIGHT =
        window.innerHeight;


    const ratio =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );


    canvas.width =
        Math.round(
            SCREEN_WIDTH * ratio
        );

    canvas.height =
        Math.round(
            SCREEN_HEIGHT * ratio
        );


    canvas.style.width =
        `${SCREEN_WIDTH}px`;

    canvas.style.height =
        `${SCREEN_HEIGHT}px`;


    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    ctx.imageSmoothingEnabled =
        false;


    if (
        endingCanvas &&
        endingCtx
    ) {

        endingCanvas.width =
            Math.round(
                SCREEN_WIDTH * ratio
            );

        endingCanvas.height =
            Math.round(
                SCREEN_HEIGHT * ratio
            );


        endingCanvas.style.width =
            `${SCREEN_WIDTH}px`;

        endingCanvas.style.height =
            `${SCREEN_HEIGHT}px`;


        endingCtx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );


        endingCtx.imageSmoothingEnabled =
            false;
    }
}


window.addEventListener(
    "resize",
    resizeCanvas
);


/* =========================================================
   TECLADO
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        const key =
            normalizeKey(
                event.key
            );


        Game.keys.add(
            key
        );


        if (
            key.startsWith(
                "Arrow"
            )
        ) {

            event.preventDefault();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        Game.keys.delete(
            normalizeKey(
                event.key
            )
        );
    }
);


function normalizeKey(key) {

    const map = {

        w: "ArrowUp",
        W: "ArrowUp",

        a: "ArrowLeft",
        A: "ArrowLeft",

        s: "ArrowDown",
        S: "ArrowDown",

        d: "ArrowRight",
        D: "ArrowRight"
    };


    return map[key] || key;
}


/* =========================================================
   CONTROLES MOBILE
========================================================= */

document
    .querySelectorAll(
        ".mobile-key"
    )
    .forEach(button => {

        const key =
            button.dataset.key;


        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                Game.keys.add(
                    key
                );
            }
        );


        const release = () => {

            Game.keys.delete(
                key
            );
        };


        button.addEventListener(
            "pointerup",
            release
        );

        button.addEventListener(
            "pointercancel",
            release
        );

        button.addEventListener(
            "pointerleave",
            release
        );
    });


/* =========================================================
   INICIAR
========================================================= */

if (startButton) {

    startButton.addEventListener(
        "click",
        startGame
    );
}


async function startGame() {

    startButton.disabled =
        true;


    try {

        const [
            playerImage,
            ninaImage
        ] =
            await Promise.all([

                loadImage(
                    "assets/sprites/player_sheet.png"
                ),

                loadImage(
                    "assets/sprites/nina_sheet.png"
                )
            ]);


        console.log(
            "Douglas:",
            playerImage.width,
            "x",
            playerImage.height
        );

        console.log(
            "Nina:",
            ninaImage.width,
            "x",
            ninaImage.height
        );


        const playerSprite =
            new SpriteAnimator({

                image:
                    playerImage,

                columns:
                    7,

                rows:
                    8
            });


        const ninaSprite =
            new SpriteAnimator({

                image:
                    ninaImage,

                columns:
                    7,

                rows:
                    8
            });


        /*
            DOUGLAS

            1.00 = tamanho-base de 112px.
        */

        player =
            new Character({

                name:
                    "Douglas",

                x:
                    500,

                y:
                    1200,

                speed:
                    310,

                sprite:
                    playerSprite,

                scale:
                    1.00
            });


        /*
            NINA

            0.82 = 82% do tamanho-base.

            Isso corrige a diferença visual entre
            as duas spritesheets sem mexer na
            movimentação ou nas mecânicas.
        */

        nina =
            new Character({

                name:
                    "Nina",

                x:
                    1700,

                y:
                    1200,

                speed:
                    285,

                sprite:
                    ninaSprite,

                isNina:
                    true,

                scale:
                    0.82
            });


        camera.x =
            player.x;

        camera.y =
            player.y;


        resizeCanvas();


        if (menu) {

            menu.classList.remove(
                "active"
            );
        }


        gameScreen.classList.add(
            "active"
        );


        Game.running =
            true;

        Game.chapter =
            0;

        Game.time =
            0;

        Game.lastTime =
            performance.now();


        loadChapter(
            0
        );


        requestAnimationFrame(
            gameLoop
        );
    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Erro ao carregar os sprites. Confira se player_sheet.png e nina_sheet.png estão dentro de assets/sprites."
        );


        startButton.disabled =
            false;
    }
}
/* =========================================================
   CARREGAR CAPÍTULO
========================================================= */

function loadChapter(index) {

    Game.chapter =
        index;

    Game.chapterCompleted =
        false;

    Game.meetingTriggered =
        false;

    Game.darknessProgress =
        0;

    Game.stormProgress =
        0;

    Game.particles =
        [];

    Game.rain =
        [];

    Game.fireflies =
        [];

    Game.obstacles =
        [];

    Game.goal =
        null;

    Game.monster =
        null;


    const chapter =
        chapters[index];


    if (hudChapter) {

        hudChapter.textContent =
            chapter.hud;
    }


    if (objectiveText) {

        objectiveText.textContent =
            chapter.objective;
    }


    if (chapterNumber) {

        chapterNumber.textContent =
            chapter.number;
    }


    if (chapterTitle) {

        chapterTitle.textContent =
            chapter.title;
    }


    if (chapterSubtitle) {

        chapterSubtitle.textContent =
            chapter.subtitle;
    }


    if (chapterCard) {

        chapterCard.classList.remove(
            "show"
        );

        void chapterCard.offsetWidth;

        chapterCard.classList.add(
            "show"
        );
    }


    setupWorld(
        chapter.type
    );


    /*
        O primeiro capítulo não abre
        diálogo imediatamente.

        Douglas precisa encontrar Nina.
    */

    if (index !== 0) {

        setTimeout(
            () => {

                startDialogueForChapter(
                    index
                );
            },
            900
        );
    }
}


/* =========================================================
   WORLD
========================================================= */

function setupWorld(type) {

    Game.trees =
        [];


    /*
        Árvores pseudoaleatórias.
    */

    for (
        let i = 0;
        i < 95;
        i++
    ) {

        Game.trees.push({

            x:
                random(
                    100,
                    WORLD_WIDTH - 100
                ),

            y:
                random(
                    260,
                    WORLD_HEIGHT - 200
                ),

            size:
                random(
                    55,
                    105
                )
        });
    }


    /*
        Douglas sempre começa
        à esquerda.
    */

    player.x =
        500;

    player.y =
        1200;

    player.direction =
        "right";

    player.moving =
        false;


    /*
        Nina.
    */

    nina.x =
        type === "meeting"
            ? 1700
            : 720;

    nina.y =
        1200;

    nina.direction =
        "left";

    nina.moving =
        false;


    camera.x =
        player.x;

    camera.y =
        player.y;


    /* =========================
       ENCONTRO
    ========================= */

    if (type === "meeting") {

        Game.goal = {

            x:
                nina.x,

            y:
                nina.y,

            radius:
                110
        };
    }


    /* =========================
       CHUVA
    ========================= */

    if (type === "rain") {

        createRain();


        Game.goal = {

            x:
                4400,

            y:
                1150,

            radius:
                125
        };
    }


    /* =========================
       ESCURIDÃO
    ========================= */

    if (type === "dark") {

        createFireflies();


        Game.goal = {

            x:
                4300,

            y:
                1080,

            radius:
                120
        };
    }


    /* =========================
       PESO
    ========================= */

    if (type === "weight") {

        Game.obstacles = [

            createHeavyObject(
                1550,
                1070
            ),

            createHeavyObject(
                2600,
                1210
            ),

            createHeavyObject(
                3600,
                1020
            )
        ];
    }


    /* =========================
       TEMPESTADE
    ========================= */

    if (type === "storm") {

        createRain();


        Game.monster = {

            x:
                3800,

            y:
                1100,

            radius:
                160,

            health:
                100
        };
    }
}


/* =========================================================
   OBJETO PESADO
========================================================= */

function createHeavyObject(
    x,
    y
) {

    return {

        x,
        y,

        width:
            170,

        height:
            130,

        progress:
            0
    };
}


/* =========================================================
   DIÁLOGOS
========================================================= */

let dialogueQueue = [];
let dialogueIndex = 0;


function openDialogue(lines) {

    if (
        !lines ||
        lines.length === 0
    ) {

        return;
    }


    dialogueQueue =
        lines;

    dialogueIndex =
        0;

    Game.dialogueActive =
        true;


    renderDialogue();
}


function renderDialogue() {

    if (
        dialogueIndex >=
        dialogueQueue.length
    ) {

        closeDialogue();

        return;
    }


    const line =
        dialogueQueue[
            dialogueIndex
        ];


    if (dialogueName) {

        dialogueName.textContent =
            line.name;
    }


    if (dialogueText) {

        dialogueText.textContent =
            line.text;
    }


    if (dialoguePortrait) {

        dialoguePortrait.style.background =
            line.name === "NINA"
                ? "#ff7fa9"
                : "#d0b4ff";
    }


    if (dialogueBox) {

        dialogueBox.classList.add(
            "show"
        );
    }
}


if (dialogueBox) {

    dialogueBox.addEventListener(
        "click",
        () => {

            if (
                !Game.dialogueActive
            ) {

                return;
            }


            dialogueIndex++;

            renderDialogue();
        }
    );
}


function closeDialogue() {

    Game.dialogueActive =
        false;


    if (dialogueBox) {

        dialogueBox.classList.remove(
            "show"
        );
    }
}


/* =========================================================
   DIÁLOGOS DOS CAPÍTULOS
========================================================= */

function startDialogueForChapter(
    index
) {

    const dialogues = {

        1: [

            {
                name:
                    "NINA",

                text:
                    "Começou a chover..."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Então vem. A gente atravessa junto."
            },

            {
                name:
                    "NINA",

                text:
                    "Eu ia dizer exatamente isso."
            }
        ],


        2: [

            {
                name:
                    "NINA",

                text:
                    "Douglas... eu não consigo enxergar nada."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Então fica perto de mim."
            },

            {
                name:
                    "NINA",

                text:
                    "Espera... olha."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Quanto mais perto ficamos, mais claro fica."
            },

            {
                name:
                    "NINA",

                text:
                    "Então acho melhor você não se afastar."
            }
        ],


        3: [

            {
                name:
                    "NINA",

                text:
                    "Isso parece pesado demais."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Para uma pessoa."
            },

            {
                name:
                    "NINA",

                text:
                    "Mas somos dois."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Exatamente."
            }
        ],


        4: [

            {
                name:
                    "NINA",

                text:
                    "Douglas..."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Eu estou aqui."
            },

            {
                name:
                    "NINA",

                text:
                    "Aquilo é enorme."
            },

            {
                name:
                    "DOUGLAS",

                text:
                    "Então ainda bem que não estamos sozinhos."
            }
        ]
    };


    if (dialogues[index]) {

        openDialogue(
            dialogues[index]
        );
    }
}


/* =========================================================
   LOOP PRINCIPAL
========================================================= */

function gameLoop(now) {

    if (!Game.running) {

        return;
    }


    const delta =
        Math.min(
            (
                now -
                Game.lastTime
            ) / 1000,
            0.04
        );


    Game.lastTime =
        now;

    Game.time +=
        delta;


    update(
        delta
    );


    draw();


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   UPDATE
========================================================= */

function update(delta) {

    updatePlayer(
        delta
    );


    updateNina(
        delta
    );


    player.updateAnimation(
        delta
    );


    nina.updateAnimation(
        delta
    );


    camera.update(
        player,
        nina,
        delta
    );


    updateConnection();


    updateChapter(
        delta
    );


    updateParticles(
        delta
    );


    updateRain(
        delta
    );
}


/* =========================================================
   MOVIMENTO DOUGLAS
========================================================= */

function updatePlayer(delta) {

    if (
        Game.dialogueActive ||
        Game.chapterCompleted
    ) {

        player.moving =
            false;

        return;
    }


    let dx = 0;
    let dy = 0;


    if (
        Game.keys.has(
            "ArrowLeft"
        )
    ) {

        dx--;

        player.direction =
            "left";
    }


    if (
        Game.keys.has(
            "ArrowRight"
        )
    ) {

        dx++;

        player.direction =
            "right";
    }


    if (
        Game.keys.has(
            "ArrowUp"
        )
    ) {

        dy--;

        player.direction =
            "up";
    }


    if (
        Game.keys.has(
            "ArrowDown"
        )
    ) {

        dy++;

        player.direction =
            "down";
    }


    player.moving =
        dx !== 0 ||
        dy !== 0;


    if (!player.moving) {

        return;
    }


    const length =
        Math.hypot(
            dx,
            dy
        );


    dx /= length;
    dy /= length;


    player.x +=
        dx *
        player.speed *
        delta;


    player.y +=
        dy *
        player.speed *
        delta;


    player.x =
        clamp(
            player.x,
            90,
            WORLD_WIDTH - 90
        );


    player.y =
        clamp(
            player.y,
            300,
            WORLD_HEIGHT - 180
        );
}


/* =========================================================
   NINA AI
========================================================= */

function updateNina(delta) {

    if (
        Game.dialogueActive ||
        Game.chapterCompleted
    ) {

        nina.moving =
            false;

        return;
    }


    /*
        No primeiro capítulo,
        Nina espera Douglas.
    */

    if (
        Game.chapter === 0
    ) {

        nina.moving =
            false;

        return;
    }


    const distance =
        distanceBetween(
            player,
            nina
        );


    /*
        Distância confortável.

        Ela não fica grudada no Douglas
        o tempo inteiro.
    */

    const followDistance =
        105;


    nina.moving =
        false;


    if (
        distance >
        followDistance
    ) {

        const dx =
            player.x -
            nina.x;

        const dy =
            player.y -
            nina.y;


        const length =
            Math.hypot(
                dx,
                dy
            );


        if (length > 0) {

            const speedMultiplier =
                distance > 400
                    ? 1.25
                    : 1;


            nina.x +=
                (
                    dx / length
                ) *
                nina.speed *
                speedMultiplier *
                delta;


            nina.y +=
                (
                    dy / length
                ) *
                nina.speed *
                speedMultiplier *
                delta;


            nina.moving =
                true;


            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {

                nina.direction =
                    dx > 0
                        ? "right"
                        : "left";
            }

            else {

                nina.direction =
                    dy > 0
                        ? "down"
                        : "up";
            }
        }
    }


    nina.x =
        clamp(
            nina.x,
            90,
            WORLD_WIDTH - 90
        );


    nina.y =
        clamp(
            nina.y,
            300,
            WORLD_HEIGHT - 180
        );
}


/* =========================================================
   CONEXÃO
========================================================= */

function updateConnection() {

    if (
        !player ||
        !nina
    ) {

        return;
    }


    const distance =
        distanceBetween(
            player,
            nina
        );


    /*
        Quanto mais próximos,
        maior a conexão.
    */

    const value =
        clamp(
            100 -
            distance / 4,
            0,
            100
        );


    if (connectionFill) {

        connectionFill.style.width =
            `${value}%`;
    }
}
/* =========================================================
   LÓGICA DOS CAPÍTULOS
========================================================= */

function updateChapter(delta) {

    if (
        Game.chapterCompleted
    ) {

        return;
    }


    const type =
        chapters[
            Game.chapter
        ].type;


    /* =====================================================
       CAPÍTULO I
       ENCONTRO
    ===================================================== */

    if (type === "meeting") {

        const distance =
            distanceBetween(
                player,
                nina
            );


        if (
            distance < 135 &&
            !Game.meetingTriggered
        ) {

            Game.meetingTriggered =
                true;


            player.moving =
                false;

            nina.moving =
                false;


            player.direction =
                "right";

            nina.direction =
                "left";


            if (objectiveText) {

                objectiveText.textContent =
                    "Você encontrou Nina ♥";
            }


            openDialogue([

                {
                    name:
                        "NINA",

                    text:
                        "Você demorou..."
                },

                {
                    name:
                        "DOUGLAS",

                    text:
                        "Eu estava procurando você."
                },

                {
                    name:
                        "NINA",

                    text:
                        "Então vamos juntos?"
                },

                {
                    name:
                        "DOUGLAS",

                    text:
                        "Até o fim."
                }
            ]);
        }


        if (
            Game.meetingTriggered &&
            !Game.dialogueActive
        ) {

            completeChapter();
        }
    }


    /* =====================================================
       CAPÍTULO II
       CHUVA
    ===================================================== */

    else if (
        type === "rain"
    ) {

        if (
            Game.goal &&
            distanceBetween(
                player,
                Game.goal
            ) < 150 &&
            distanceBetween(
                nina,
                Game.goal
            ) < 210
        ) {

            completeChapter();
        }
    }


    /* =====================================================
       CAPÍTULO III
       ESCURIDÃO
    ===================================================== */

    else if (
        type === "dark"
    ) {

        const together =
            distanceBetween(
                player,
                nina
            );


        /*
            Permanecer juntos também
            fortalece a luz.
        */

        if (together < 170) {

            Game.darknessProgress +=
                delta * 8;
        }

        else {

            Game.darknessProgress -=
                delta * 4;
        }


        Game.darknessProgress =
            clamp(
                Game.darknessProgress,
                0,
                100
            );


        if (
            Game.goal &&
            distanceBetween(
                player,
                Game.goal
            ) < 150 &&
            distanceBetween(
                nina,
                Game.goal
            ) < 200
        ) {

            completeChapter();
        }
    }


    /* =====================================================
       CAPÍTULO IV
       PESO
    ===================================================== */

    else if (
        type === "weight"
    ) {

        let finished =
            true;


        Game.obstacles.forEach(
            object => {

                const playerDistance =
                    distanceToRectangle(
                        player,
                        object
                    );


                const ninaDistance =
                    distanceToRectangle(
                        nina,
                        object
                    );


                /*
                    O obstáculo só cede
                    se os dois estiverem
                    próximos.
                */

                if (
                    playerDistance < 145 &&
                    ninaDistance < 175 &&
                    distanceBetween(
                        player,
                        nina
                    ) < 190
                ) {

                    object.progress +=
                        delta * 32;


                    if (
                        Math.random() < 0.12
                    ) {

                        createParticle(
                            object.x +
                            object.width / 2,

                            object.y,

                            "gold"
                        );
                    }
                }


                object.progress =
                    clamp(
                        object.progress,
                        0,
                        100
                    );


                if (
                    object.progress < 100
                ) {

                    finished =
                        false;
                }
            }
        );


        if (finished) {

            completeChapter();
        }
    }


    /* =====================================================
       CAPÍTULO V
       TEMPESTADE
    ===================================================== */

    else if (
        type === "storm" &&
        Game.monster
    ) {

        const distanceToMonster =
            distanceBetween(
                player,
                Game.monster
            );


        const together =
            distanceBetween(
                player,
                nina
            );


        /*
            Separados não causam dano.

            Juntos, a conexão enfraquece
            a tempestade.
        */

        if (
            distanceToMonster < 650 &&
            together < 150
        ) {

            Game.monster.health -=
                delta * 20;


            Game.stormProgress +=
                delta * 20;


            if (
                Math.random() < 0.35
            ) {

                createParticle(
                    Game.monster.x +
                    random(
                        -90,
                        90
                    ),

                    Game.monster.y +
                    random(
                        -90,
                        90
                    ),

                    "pink"
                );
            }
        }


        Game.monster.health =
            Math.max(
                0,
                Game.monster.health
            );


        if (
            Game.monster.health <= 0
        ) {

            completeChapter();
        }
    }
}


/* =========================================================
   COMPLETAR CAPÍTULO
========================================================= */

function completeChapter() {

    if (
        Game.chapterCompleted
    ) {

        return;
    }


    Game.chapterCompleted =
        true;


    player.moving =
        false;

    nina.moving =
        false;


    if (objectiveText) {

        objectiveText.textContent =
            "Juntos. ♥";
    }


    createHeartExplosion(
        (
            player.x +
            nina.x
        ) / 2,

        (
            player.y +
            nina.y
        ) / 2
    );


    setTimeout(
        nextChapter,
        2200
    );
}


/* =========================================================
   PRÓXIMO CAPÍTULO
========================================================= */

function nextChapter() {

    if (fade) {

        fade.classList.add(
            "active"
        );
    }


    setTimeout(
        () => {

            if (
                Game.chapter <
                chapters.length - 1
            ) {

                loadChapter(
                    Game.chapter + 1
                );


                if (fade) {

                    fade.classList.remove(
                        "active"
                    );
                }
            }

            else {

                showEnding();
            }
        },
        900
    );
}


/* =========================================================
   DRAW
========================================================= */

function draw() {

    ctx.imageSmoothingEnabled =
        false;


    ctx.clearRect(
        0,
        0,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );


    drawBackground();

    drawGround();

    drawForest();

    drawFireflies();

    drawGoal();

    drawHeavyObjects();

    drawMonster();


    /*
        Linha de conexão atrás
        dos personagens.
    */

    drawConnectionLine();


    player.draw(
        ctx,
        camera
    );


    nina.draw(
        ctx,
        camera
    );


    drawParticles();

    drawRain();


    /*
        A escuridão precisa ser
        desenhada DEPOIS do cenário
        e dos personagens.
    */

    drawDarkness();
}


/* =========================================================
   BACKGROUND
========================================================= */

function drawBackground() {

    const type =
        chapters[
            Game.chapter
        ].type;


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            SCREEN_HEIGHT
        );


    if (
        type === "storm"
    ) {

        gradient.addColorStop(
            0,
            "#24152f"
        );

        gradient.addColorStop(
            1,
            "#06070e"
        );
    }

    else if (
        type === "dark"
    ) {

        gradient.addColorStop(
            0,
            "#090d18"
        );

        gradient.addColorStop(
            1,
            "#020307"
        );
    }

    else {

        gradient.addColorStop(
            0,
            "#14282c"
        );

        gradient.addColorStop(
            1,
            "#071011"
        );
    }


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );
}


/* =========================================================
   CHÃO
========================================================= */

function drawGround() {

    ctx.save();


    ctx.translate(
        Math.round(
            SCREEN_WIDTH / 2 -
            camera.x
        ),

        Math.round(
            SCREEN_HEIGHT / 2 -
            camera.y
        )
    );


    ctx.fillStyle =
        "#101d1c";


    ctx.fillRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    /*
        Caminho.
    */

    ctx.fillStyle =
        "rgba(120,105,95,.20)";


    ctx.beginPath();


    ctx.moveTo(
        0,
        1080
    );


    ctx.bezierCurveTo(
        1400,
        1000,
        3100,
        1280,
        WORLD_WIDTH,
        1080
    );


    ctx.lineTo(
        WORLD_WIDTH,
        1380
    );


    ctx.bezierCurveTo(
        3200,
        1480,
        1400,
        1260,
        0,
        1380
    );


    ctx.closePath();

    ctx.fill();


    ctx.restore();
}


/* =========================================================
   FLORESTA
========================================================= */

function drawForest() {

    ctx.save();


    ctx.translate(
        Math.round(
            SCREEN_WIDTH / 2 -
            camera.x
        ),

        Math.round(
            SCREEN_HEIGHT / 2 -
            camera.y
        )
    );


    const sortedTrees =
        [...Game.trees].sort(
            (a, b) =>
                a.y - b.y
        );


    sortedTrees.forEach(
        tree => {

            drawTree(
                tree
            );
        }
    );


    ctx.restore();
}


/* =========================================================
   ÁRVORE
========================================================= */

function drawTree(tree) {

    const size =
        tree.size;


    /*
        Sombra
    */

    ctx.fillStyle =
        "rgba(0,0,0,.36)";


    ctx.beginPath();


    ctx.ellipse(
        tree.x,
        tree.y + size * 0.6,

        size * 0.6,
        size * 0.17,

        0,
        0,
        Math.PI * 2
    );


    ctx.fill();


    /*
        Tronco
    */

    ctx.fillStyle =
        "#352d2d";


    ctx.fillRect(
        tree.x -
        size * 0.1,

        tree.y,

        size * 0.2,

        size * 0.7
    );


    /*
        Copa
    */

    ctx.fillStyle =
        "#17302c";


    ctx.beginPath();


    ctx.arc(
        tree.x,
        tree.y -
        size * 0.35,

        size * 0.55,

        0,
        Math.PI * 2
    );


    ctx.fill();


    /*
        Luz da copa
    */

    ctx.fillStyle =
        "rgba(120,165,140,.10)";


    ctx.beginPath();


    ctx.arc(
        tree.x -
        size * 0.18,

        tree.y -
        size * 0.46,

        size * 0.24,

        0,
        Math.PI * 2
    );


    ctx.fill();
}
/* =========================================================
   DESTINO
========================================================= */

function drawGoal() {

    if (
        !Game.goal ||
        Game.chapter === 0
    ) {

        return;
    }


    const x =
        Math.round(
            Game.goal.x -
            camera.x +
            SCREEN_WIDTH / 2
        );


    const y =
        Math.round(
            Game.goal.y -
            camera.y +
            SCREEN_HEIGHT / 2
        );


    const pulse =
        Math.sin(
            Game.time * 3
        ) * 7;


    ctx.save();


    ctx.shadowBlur =
        28;

    ctx.shadowColor =
        "#ff7fa9";

    ctx.strokeStyle =
        "rgba(255,127,169,.45)";

    ctx.lineWidth =
        2;


    ctx.beginPath();


    ctx.arc(
        x,
        y,

        Game.goal.radius +
        pulse,

        0,
        Math.PI * 2
    );


    ctx.stroke();


    ctx.restore();
}


/* =========================================================
   OBJETOS PESADOS
========================================================= */

function drawHeavyObjects() {

    Game.obstacles.forEach(
        object => {

            const x =
                Math.round(
                    object.x -
                    camera.x +
                    SCREEN_WIDTH / 2
                );


            const y =
                Math.round(
                    object.y -
                    camera.y +
                    SCREEN_HEIGHT / 2
                );


            /*
                Rocha / bloco.
            */

            ctx.fillStyle =
                "#514958";


            ctx.fillRect(
                x,
                y,
                object.width,
                object.height
            );


            ctx.strokeStyle =
                "rgba(255,255,255,.10)";


            ctx.strokeRect(
                x,
                y,
                object.width,
                object.height
            );


            /*
                Barra de progresso.
            */

            ctx.fillStyle =
                "rgba(0,0,0,.5)";


            ctx.fillRect(
                x,
                y - 15,
                object.width,
                6
            );


            ctx.fillStyle =
                "#ff7fa9";


            ctx.fillRect(
                x,
                y - 15,

                object.width *
                (
                    object.progress /
                    100
                ),

                6
            );
        }
    );
}


/* =========================================================
   TEMPESTADE / MONSTRO
========================================================= */

function drawMonster() {

    const monster =
        Game.monster;


    if (!monster) {

        return;
    }


    const x =
        monster.x -
        camera.x +
        SCREEN_WIDTH / 2;


    const y =
        monster.y -
        camera.y +
        SCREEN_HEIGHT / 2;


    const pulse =
        Math.sin(
            Game.time * 3
        ) * 12;


    ctx.save();


    /*
        Aura
    */

    const aura =
        ctx.createRadialGradient(
            x,
            y,
            20,

            x,
            y,
            monster.radius * 1.8
        );


    aura.addColorStop(
        0,
        "rgba(126,35,157,.5)"
    );

    aura.addColorStop(
        1,
        "rgba(30,0,50,0)"
    );


    ctx.fillStyle =
        aura;


    ctx.beginPath();


    ctx.arc(
        x,
        y,
        monster.radius * 1.8,
        0,
        Math.PI * 2
    );


    ctx.fill();


    /*
        Corpo
    */

    ctx.shadowBlur =
        65;

    ctx.shadowColor =
        "#b64cff";

    ctx.fillStyle =
        "#28152f";


    ctx.beginPath();


    ctx.arc(
        x,
        y,

        monster.radius +
        pulse,

        0,
        Math.PI * 2
    );


    ctx.fill();


    /*
        Olhos
    */

    ctx.shadowBlur =
        20;

    ctx.shadowColor =
        "#ff5f9d";

    ctx.fillStyle =
        "#ff5f9d";


    ctx.beginPath();


    ctx.arc(
        x - 38,
        y - 20,
        9,
        0,
        Math.PI * 2
    );


    ctx.arc(
        x + 38,
        y - 20,
        9,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.shadowBlur =
        0;


    /*
        Vida
    */

    ctx.fillStyle =
        "rgba(0,0,0,.6)";


    ctx.fillRect(
        x - 100,
        y - 205,
        200,
        7
    );


    ctx.fillStyle =
        "#ff5f9d";


    ctx.fillRect(
        x - 100,
        y - 205,

        200 *
        (
            monster.health /
            100
        ),

        7
    );


    ctx.restore();
}


/* =========================================================
   LINHA DE CONEXÃO
========================================================= */

function drawConnectionLine() {

    const distance =
        distanceBetween(
            player,
            nina
        );


    if (
        distance > 300
    ) {

        return;
    }


    const px =
        player.x -
        camera.x +
        SCREEN_WIDTH / 2;


    const py =
        player.y -
        camera.y +
        SCREEN_HEIGHT / 2;


    const nx =
        nina.x -
        camera.x +
        SCREEN_WIDTH / 2;


    const ny =
        nina.y -
        camera.y +
        SCREEN_HEIGHT / 2;


    const alpha =
        clamp(
            1 -
            distance / 300,
            0,
            1
        );


    ctx.save();


    ctx.strokeStyle =
        `rgba(
            255,
            127,
            169,
            ${alpha * 0.48}
        )`;


    ctx.lineWidth =
        2;


    ctx.setLineDash(
        [5, 9]
    );


    ctx.beginPath();


    ctx.moveTo(
        px,
        py - 45
    );


    ctx.lineTo(
        nx,
        ny - 45
    );


    ctx.stroke();


    ctx.setLineDash([]);

    ctx.restore();
}


/* =========================================================
   ESCURIDÃO

   O cenário fica realmente escuro,
   mas existe luz individual em volta
   de cada personagem.

   Quando Douglas e Nina ficam próximos,
   as duas luzes se unem.
========================================================= */

function drawDarkness() {

    if (
        chapters[
            Game.chapter
        ].type !== "dark"
    ) {

        return;
    }


    const px =
        Math.round(
            player.x -
            camera.x +
            SCREEN_WIDTH / 2 -
            0
        );


    const py =
        Math.round(
            player.y -
            camera.y +
            SCREEN_HEIGHT / 2 -
            45
        );


    const nx =
        Math.round(
            nina.x -
            camera.x +
            SCREEN_WIDTH / 2
        );


    const ny =
        Math.round(
            nina.y -
            camera.y +
            SCREEN_HEIGHT / 2 -
            45
        );


    const distance =
        distanceBetween(
            player,
            nina
        );


    /*
        0 = muito longe
        1 = praticamente juntos
    */

    const closeness =
        clamp(
            1 -
            distance / 400,
            0,
            1
        );


    /*
        Camada separada para
        controlar a escuridão.
    */

    const darkness =
        document.createElement(
            "canvas"
        );


    darkness.width =
        Math.ceil(
            SCREEN_WIDTH
        );


    darkness.height =
        Math.ceil(
            SCREEN_HEIGHT
        );


    const dctx =
        darkness.getContext(
            "2d"
        );


    /*
        ESCURIDÃO TOTAL
    */

    dctx.fillStyle =
        "rgba(0,0,8,.94)";


    dctx.fillRect(
        0,
        0,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );


    /*
        Recorta a luz.
    */

    dctx.globalCompositeOperation =
        "destination-out";


    /*
        LUZ DO DOUGLAS
    */

    cutLight(
        dctx,
        px,
        py,
        105 +
        closeness * 70,
        0.80
    );


    /*
        LUZ DA NINA
    */

    cutLight(
        dctx,
        nx,
        ny,
        105 +
        closeness * 70,
        0.80
    );


    /*
        Luz conjunta.
    */

    if (
        closeness > 0.15
    ) {

        const centerX =
            (
                px +
                nx
            ) / 2;


        const centerY =
            (
                py +
                ny
            ) / 2;


        const combinedRadius =
            120 +
            closeness * 380;


        cutLight(
            dctx,
            centerX,
            centerY,
            combinedRadius,
            0.98
        );
    }


    dctx.globalCompositeOperation =
        "source-over";


    ctx.drawImage(
        darkness,
        0,
        0
    );


    /*
        Glow visível.
    */

    drawCharacterGlow(
        px,
        py,
        110,
        "rgba(210,200,255,.12)"
    );


    drawCharacterGlow(
        nx,
        ny,
        110,
        "rgba(255,160,195,.14)"
    );


    /*
        Luz conjunta.
    */

    if (
        closeness > 0.12
    ) {

        const centerX =
            (
                px +
                nx
            ) / 2;


        const centerY =
            (
                py +
                ny
            ) / 2;


        const radius =
            130 +
            closeness * 330;


        const gradient =
            ctx.createRadialGradient(
                centerX,
                centerY,
                0,

                centerX,
                centerY,
                radius
            );


        gradient.addColorStop(
            0,
            `rgba(
                255,
                215,
                225,
                ${
                    0.08 +
                    closeness * 0.20
                }
            )`
        );


        gradient.addColorStop(
            0.35,
            `rgba(
                255,
                130,
                175,
                ${
                    0.04 +
                    closeness * 0.10
                }
            )`
        );


        gradient.addColorStop(
            1,
            "rgba(255,120,170,0)"
        );


        ctx.save();


        ctx.globalCompositeOperation =
            "screen";


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.arc(
            centerX,
            centerY,
            radius,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();


        /*
            Coração quando estão
            realmente próximos.
        */

        if (
            closeness > 0.72
        ) {

            const opacity =
                clamp(
                    (
                        closeness -
                        0.72
                    ) /
                    0.28,
                    0,
                    1
                );


            const pulse =
                1 +
                Math.sin(
                    Game.time * 5
                ) *
                0.10;


            ctx.save();


            ctx.globalAlpha =
                opacity;


            ctx.fillStyle =
                "#ff8fb6";


            ctx.shadowBlur =
                25;


            ctx.shadowColor =
                "#ff8fb6";


            ctx.textAlign =
                "center";


            ctx.font =
                `${Math.round(
                    18 * pulse
                )}px Arial`;


            ctx.fillText(
                "♥",
                centerX,
                centerY - 100
            );


            ctx.restore();
        }
    }
}


/* =========================================================
   RECORTAR LUZ DA ESCURIDÃO
========================================================= */

function cutLight(
    context,
    x,
    y,
    radius,
    strength = 1
) {

    const gradient =
        context.createRadialGradient(
            x,
            y,
            0,

            x,
            y,
            radius
        );


    gradient.addColorStop(
        0,
        `rgba(
            255,
            255,
            255,
            ${strength}
        )`
    );


    gradient.addColorStop(
        0.35,
        `rgba(
            255,
            255,
            255,
            ${strength * 0.90}
        )`
    );


    gradient.addColorStop(
        0.70,
        `rgba(
            255,
            255,
            255,
            ${strength * 0.45}
        )`
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    context.fillStyle =
        gradient;


    context.beginPath();


    context.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );


    context.fill();
}


/* =========================================================
   GLOW DO PERSONAGEM
========================================================= */

function drawCharacterGlow(
    x,
    y,
    radius,
    color
) {

    ctx.save();


    ctx.globalCompositeOperation =
        "screen";


    const gradient =
        ctx.createRadialGradient(
            x,
            y,
            0,

            x,
            y,
            radius
        );


    gradient.addColorStop(
        0,
        color
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
        gradient;


    ctx.beginPath();


    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.restore();
}


/* =========================================================
   CHUVA
========================================================= */

function createRain() {

    Game.rain =
        [];


    for (
        let i = 0;
        i < 320;
        i++
    ) {

        Game.rain.push({

            x:
                Math.random() *
                SCREEN_WIDTH,

            y:
                Math.random() *
                SCREEN_HEIGHT,

            speed:
                random(
                    450,
                    900
                ),

            length:
                random(
                    10,
                    28
                )
        });
    }
}


function updateRain(delta) {

    Game.rain.forEach(
        drop => {

            drop.y +=
                drop.speed *
                delta;


            drop.x -=
                drop.speed *
                0.10 *
                delta;


            if (
                drop.y >
                SCREEN_HEIGHT + 40
            ) {

                drop.y =
                    -40;


                drop.x =
                    Math.random() *
                    SCREEN_WIDTH;
            }


            if (
                drop.x < -40
            ) {

                drop.x =
                    SCREEN_WIDTH + 20;
            }
        }
    );
}


function drawRain() {

    if (
        Game.rain.length === 0
    ) {

        return;
    }


    ctx.save();


    ctx.strokeStyle =
        "rgba(185,215,255,.30)";


    ctx.lineWidth =
        1;


    Game.rain.forEach(
        drop => {

            ctx.beginPath();


            ctx.moveTo(
                drop.x,
                drop.y
            );


            ctx.lineTo(
                drop.x - 6,
                drop.y +
                drop.length
            );


            ctx.stroke();
        }
    );


    ctx.restore();
}


/* =========================================================
   VAGALUMES
========================================================= */

function createFireflies() {

    Game.fireflies =
        [];


    for (
        let i = 0;
        i < 70;
        i++
    ) {

        Game.fireflies.push({

            x:
                random(
                    200,
                    WORLD_WIDTH - 200
                ),

            y:
                random(
                    350,
                    WORLD_HEIGHT - 250
                ),

            phase:
                Math.random() *
                Math.PI * 2,

            size:
                random(
                    1.5,
                    3
                )
        });
    }
}


function drawFireflies() {

    if (
        chapters[
            Game.chapter
        ].type !== "dark"
    ) {

        return;
    }


    Game.fireflies.forEach(
        firefly => {

            const x =
                firefly.x -
                camera.x +
                SCREEN_WIDTH / 2;


            const y =
                firefly.y -
                camera.y +
                SCREEN_HEIGHT / 2;


            if (
                x < -50 ||
                x > SCREEN_WIDTH + 50 ||
                y < -50 ||
                y > SCREEN_HEIGHT + 50
            ) {

                return;
            }


            const alpha =
                0.25 +
                (
                    Math.sin(
                        Game.time * 2 +
                        firefly.phase
                    ) +
                    1
                ) *
                0.25;


            ctx.save();


            ctx.globalAlpha =
                alpha;


            ctx.shadowBlur =
                12;


            ctx.shadowColor =
                "#ffe8a3";


            ctx.fillStyle =
                "#ffe8a3";


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                firefly.size,
                0,
                Math.PI * 2
            );


            ctx.fill();


            ctx.restore();
        }
    );
}


/* =========================================================
   PARTÍCULAS
========================================================= */

function createParticle(
    x,
    y,
    type
) {

    const angle =
        Math.random() *
        Math.PI * 2;


    const speed =
        random(
            25,
            120
        );


    Game.particles.push({

        x,
        y,

        vx:
            Math.cos(
                angle
            ) * speed,

        vy:
            Math.sin(
                angle
            ) * speed - 25,

        size:
            random(
                2,
                5
            ),

        life:
            1,

        type
    });
}


function createHeartExplosion(
    x,
    y
) {

    for (
        let i = 0;
        i < 70;
        i++
    ) {

        createParticle(
            x,
            y,
            "pink"
        );
    }
}


function updateParticles(delta) {

    Game.particles.forEach(
        particle => {

            particle.x +=
                particle.vx *
                delta;


            particle.y +=
                particle.vy *
                delta;


            particle.vy +=
                30 *
                delta;


            particle.life -=
                delta *
                1.2;
        }
    );


    Game.particles =
        Game.particles.filter(
            particle =>
                particle.life > 0
        );
}


function drawParticles() {

    Game.particles.forEach(
        particle => {

            const x =
                particle.x -
                camera.x +
                SCREEN_WIDTH / 2;


            const y =
                particle.y -
                camera.y +
                SCREEN_HEIGHT / 2;


            ctx.save();


            ctx.globalAlpha =
                particle.life;


            ctx.fillStyle =
                particle.type === "pink"
                    ? "#ff7fa9"
                    : "#f5d79f";


            ctx.shadowBlur =
                8;


            ctx.shadowColor =
                ctx.fillStyle;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                particle.size,
                0,
                Math.PI * 2
            );


            ctx.fill();


            ctx.restore();
        }
    );
}
/* =========================================================
   FINAL
========================================================= */

function showEnding() {

    if (fade) {

        fade.classList.add(
            "active"
        );
    }


    setTimeout(
        () => {

            Game.running =
                false;


            if (gameScreen) {

                gameScreen.classList.remove(
                    "active"
                );
            }


            if (ending) {

                ending.classList.add(
                    "active"
                );
            }


            startEnding();
        },
        1000
    );
}


/* =========================================================
   FINAL ANIMADO
========================================================= */

let endingStars = [];
let endingRunning = false;


function startEnding() {

    if (!endingCtx) {

        return;
    }


    endingStars =
        [];


    for (
        let i = 0;
        i < 180;
        i++
    ) {

        endingStars.push({

            x:
                Math.random() *
                SCREEN_WIDTH,

            y:
                Math.random() *
                SCREEN_HEIGHT,

            size:
                random(
                    0.5,
                    2
                ),

            phase:
                Math.random() *
                Math.PI * 2
        });
    }


    endingRunning =
        true;


    requestAnimationFrame(
        endingLoop
    );
}


function endingLoop() {

    if (
        !endingRunning ||
        !endingCtx
    ) {

        return;
    }


    endingCtx.clearRect(
        0,
        0,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );


    const background =
        endingCtx.createRadialGradient(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT * 0.55,
            20,

            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT * 0.55,
            SCREEN_HEIGHT
        );


    background.addColorStop(
        0,
        "#17132a"
    );


    background.addColorStop(
        1,
        "#03040a"
    );


    endingCtx.fillStyle =
        background;


    endingCtx.fillRect(
        0,
        0,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );


    endingStars.forEach(
        star => {

            const alpha =
                0.25 +
                (
                    Math.sin(
                        performance.now() *
                        0.002 +
                        star.phase
                    ) +
                    1
                ) *
                0.3;


            endingCtx.globalAlpha =
                alpha;


            endingCtx.fillStyle =
                "white";


            endingCtx.beginPath();


            endingCtx.arc(
                star.x,
                star.y,
                star.size,
                0,
                Math.PI * 2
            );


            endingCtx.fill();
        }
    );


    endingCtx.globalAlpha =
        1;


    drawParticleHeart();


    requestAnimationFrame(
        endingLoop
    );
}


/* =========================================================
   CORAÇÃO FINAL
========================================================= */

function drawParticleHeart() {

    if (!endingCtx) {

        return;
    }


    const centerX =
        SCREEN_WIDTH / 2;


    const centerY =
        SCREEN_HEIGHT * 0.74;


    for (
        let i = 0;
        i < 110;
        i++
    ) {

        const t =
            (
                i / 110
            ) *
            Math.PI * 2;


        const hx =
            16 *
            Math.pow(
                Math.sin(t),
                3
            );


        const hy =
            -(
                13 *
                Math.cos(t) -

                5 *
                Math.cos(
                    2 * t
                ) -

                2 *
                Math.cos(
                    3 * t
                ) -

                Math.cos(
                    4 * t
                )
            );


        endingCtx.fillStyle =
            "rgba(255,127,169,.58)";


        endingCtx.beginPath();


        endingCtx.arc(
            centerX +
            hx * 7,

            centerY +
            hy * 7,

            1.8,

            0,
            Math.PI * 2
        );


        endingCtx.fill();
    }
}


/* =========================================================
   RECOMEÇAR
========================================================= */

if (restartButton) {

    restartButton.addEventListener(
        "click",
        () => {

            endingRunning =
                false;


            if (ending) {

                ending.classList.remove(
                    "active"
                );
            }


            if (menu) {

                menu.classList.add(
                    "active"
                );
            }


            if (fade) {

                fade.classList.remove(
                    "active"
                );
            }


            startButton.disabled =
                false;
        }
    );
}


/* =========================================================
   HELPERS
========================================================= */

function distanceBetween(
    a,
    b
) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}


function distanceToRectangle(
    point,
    rectangle
) {

    const closestX =
        clamp(
            point.x,
            rectangle.x,
            rectangle.x +
            rectangle.width
        );


    const closestY =
        clamp(
            point.y,
            rectangle.y,
            rectangle.y +
            rectangle.height
        );


    return Math.hypot(
        point.x -
        closestX,

        point.y -
        closestY
    );
}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}


function random(
    min,
    max
) {

    return (
        min +
        Math.random() *
        (
            max -
            min
        )
    );
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

resizeCanvas();