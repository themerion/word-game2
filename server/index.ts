import wordSource from './wordSource.json' assert { type: 'json' };
import { PlayerId, Server } from "./server.ts";
import { shuffle, pickAtRandom, arrayOfSameElement } from './arrayHelpers.ts';
import { Color } from "./color.ts";
import { WebsocketServer } from "./websocket-server.ts";
import { pipe, replace, fallback } from "./functionalHelpers.ts";

const server : Server = new WebsocketServer();

type BoardWord = {
    word: string,
    revealed: boolean,
    color: Color
};

type Player = {
    id: PlayerId,
    name: string,
    teamLead: boolean,
    connected: boolean,
    team: number
};

let g_started : boolean = false;
let g_finished : boolean = false;
let g_players : Player[] = [];
let g_board : BoardWord[] = [];
let g_current_player : Player = {id: "", name: "", teamLead: false, team: 0, connected: false};
let g_words_to_guess_remaining : number = 0;

server.onPlayerConnected((id: PlayerId, name: string) => {
    if(g_finished) {
        return false;
    }

    if(g_started) {
        console.log(`Connection attempt: ${name}`, id);

        const trimmedName = name.trim();
        const player = g_players.find(p => p.name.toUpperCase() === trimmedName.toUpperCase() && !p.connected);
        if(!player) {
            console.log(`Re-connection refused`);
            return false;
        }
        player.connected = true;
        player.id = id;
        server.sendBroadcastMessage(`Spelare återansluten ${fplayer(player)}`);
        sendBoard();
        server.sendRole(player.id, player.teamLead);
        server.sendTurn(player.id, g_current_player.id === player.id);
        console.log(`Connection re-established`);
        return true;
    } else {
        console.log(`Connection attempt: ${name}`, id);

        const trimmedName = name.trim();
        const playerNameAlreadyTaken = g_players.some(p => p.name.toUpperCase() === trimmedName.toUpperCase());

        if(!trimmedName || playerNameAlreadyTaken) {
            console.log("Connection refused")
            return false;
        }

        const player = {id, name: trimmedName, teamLead: false, connected: true, team: 0};
        g_players.push(player);
        server.sendBroadcastMessage(`Spelare ansluten ${fplayer(player)}`);
        server.sendMessage(id, `Du är ansluten som ${fplayer(player)}`);
        console.log("Connection accepted");

        if(g_players.length === 4) {
            startGame();
        }
        return true;
    }
});

server.onPlayerDisconnected((id: PlayerId) => {
    if(g_finished) {
        return;
    }

    const i = g_players.findIndex(p => p.id === id);
    if(i === -1) {
        console.log("Unregistered player disconnected: ", id);
        return;
    }
    let p = g_players[i];
    if(g_started) { 
        p.connected = false;
    } else {
        g_players.splice(i, 1);
    }
    console.log("Player disconnected: ", id);
    server.sendBroadcastMessage("Spelare frånkopplad "+fplayer(p));
});

server.onMessage((id: PlayerId, msg: string) => {
    console.log(`From Player(`+id+`) Received message: ${msg}`);
    if(!g_started || g_finished) {
        return;
    }

    if(g_current_player.id !== id) {
        return;
    }

    if(g_current_player.teamLead)
    {
        // Team lead anger antal ord
        const wordsToGuess = parseInt(msg, 10);
        if(!Number.isNaN(wordsToGuess) && wordsToGuess > 0 && wordsToGuess < 10) {
            g_words_to_guess_remaining = wordsToGuess;
            setPlayerTurn(
                getTeammate(g_current_player),
                `${fname("{name}")} ska välja ut ${g_words_to_guess_remaining} ord.`
            );
        } else {
            server.sendMessage(id, "Du ska skicka ett nummer mellan 1 och 10. Prova igen.");
        }
    }
    else
    {
        // Spelare gissar på ord
        if(msg === "-") {
            server.sendBroadcastMessage(fplayer(g_current_player)+" passar.");
            setPlayerTurn(getOtherTeamLead(g_current_player));
            return;
        }

        const boardIndex = g_board.findIndex(b => b.word === msg);
        if(boardIndex === -1) {
            server.sendMessage(id, "Okänt ord. Prova igen.");
            return;
        }

        const boardWord = g_board[boardIndex];

        if(boardWord.revealed) {
            server.sendMessage(id, "Det ordet har redan gissats på. Prova igen.");
            return;
        }

        boardWord.revealed = true;
        g_words_to_guess_remaining--;
        server.sendBroadcastMessage(fname(g_current_player.name)+" gissade på '"+boardWord.word+"'");
        sendBoard();

        if(shouldGameBeOver()) {
            g_finished = true;
            console.log("Game ended");
            server.sendBroadcastMessage("Spelet är slut!");
            server.sendTurn(g_current_player.id, false);
            sendBoard(true);
        } else {
            if(getPlayerColor(g_current_player) !== boardWord.color || g_words_to_guess_remaining === 0) {
                setPlayerTurn(getOtherTeamLead(g_current_player));
            } else {
                server.sendBroadcastMessage(g_words_to_guess_remaining + " gissningar kvar.");
            }
        }
    }
});

function setPlayerTurn(player: Player, msg?: string) {
    const previousPlayer = g_current_player;
    g_current_player = player;

    let msgDone = pipe(
        fallback("Turen går över till "+fname("{name}")),
        replace("{name}", g_current_player.name),
    )(msg);
    server.sendBroadcastMessage(msgDone);

    server.sendTurn(previousPlayer.id, false);
    server.sendTurn(g_current_player.id, true);
}

function getPlayerColor(p : Player) : Color {
    return p.team === 0
        ? Color.BLUE
        : Color.RED;
}

function shouldGameBeOver() {
    return (
        g_board.filter(bw => bw.color === Color.RED).every(bw => bw.revealed) ||
        g_board.filter(bw => bw.color === Color.BLUE).every(bw => bw.revealed) ||
        g_board.filter(bw => bw.color === Color.BLACK).some(bw => bw.revealed)
    );
}

function getTeammate(player: Player) : Player {
    return g_players.findOrCrash(p => (p.teamLead != player.teamLead) && (p.team == player.team));
}

function getOtherTeamLead(player: Player) : Player {
    return g_players.findOrCrash(p => (p.teamLead) && (p.team !== player.team));
}

function startGame() {
    g_started = true;
    console.log("Starting game");
    server.sendBroadcastMessage("Spelet startar...");

    assignPlayerRoles();
    sendRolesToClients();
    g_current_player = g_players[0];
    server.sendBroadcastMessage(`Spelare ${fplayer(g_current_player)} börjar.`)
    server.sendTurn(g_current_player.id, true);

    generateBoard();
    sendBoard();
}

function assignPlayerRoles() {
    g_players[0].team = 0;
    g_players[0].teamLead = true;
    g_players[1].team = 0;
    g_players[1].teamLead = false;
    g_players[2].team = 1;
    g_players[2].teamLead = true;
    g_players[3].team = 1;
    g_players[3].teamLead = false;
}

function sendRolesToClients() {
    const teamLead = true;
    server.sendRole(g_players[0].id, teamLead);
    server.sendRole(g_players[1].id, !teamLead);
    server.sendRole(g_players[2].id, teamLead);
    server.sendRole(g_players[3].id, !teamLead);
    server.sendBroadcastMessage(`Lag blå: ${fplayer(g_players[0])} och ${fplayer(g_players[1])}`);
    server.sendBroadcastMessage(`Lag röd: ${fplayer(g_players[2])} och ${fplayer(g_players[3])}`);
}

function generateBoard() {
    const words = pickAtRandom(wordSource, 25);
    const colors = generateColors();
    g_board = [];
    words.forEach((w,i) => {
        g_board.push({
            word: w,
            revealed: false,
            color: colors[i]
        })
    });
}

function generateColors() : Color[] {
    const colors : Color[] = [
        ...arrayOfSameElement(Color.BLUE,9),
        ...arrayOfSameElement(Color.RED,8),
        ...arrayOfSameElement(Color.GREEN,7),
        Color.BLACK
    ];
    return shuffle(colors);
}

function sendBoard(showEverything : boolean = false) {
    const teamLeadBoard = g_board;
    const clientBoard = g_board.map(x => x.revealed ? x : {...x, color: null});

    if(showEverything) {
        g_players.forEach(p => server.sendBoard(p.id, teamLeadBoard));
    } else {
        g_players.filter(p => p.teamLead).forEach(p => server.sendBoard(p.id, teamLeadBoard));
        g_players.filter(p => !p.teamLead).forEach(p => server.sendBoard(p.id, clientBoard));
    }
};

function fname(playerName: string) : string {
    return `_.${playerName}_.`;
}
function fplayer(player: Player) : string {
    return fname(player.name);
}

console.log("starting server");
server.start();